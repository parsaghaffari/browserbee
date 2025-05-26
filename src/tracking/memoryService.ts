import { logWithTimestamp } from '../background/utils';
import defaultMemoriesData from './defaultMemories.json';
import { normalizeDomain } from './domainUtils';

export interface AgentMemory {
  id?: number;
  domain: string;  // Website domain as the key (e.g., "linkedin.com")
  taskDescription: string;  // Short description of what was accomplished
  toolSequence: string[];  // Array of tool calls with their inputs
  createdAt: number;  // Timestamp
}

export class MemoryService {
  private static instance: MemoryService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'browserbee-memories';
  private readonly STORE_NAME = 'memories';
  private DB_VERSION = 1; // Not readonly so we can increment it if needed
  private isInitialized = false;
  private hasImportedDefaultMemories = false;

  // Singleton pattern
  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Check if the object store exists and create it if it doesn't
   */
  private async ensureObjectStoreExists(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check if the object store exists
    if (!Array.from(this.db.objectStoreNames).includes(this.STORE_NAME)) {
      logWithTimestamp(`Object store ${this.STORE_NAME} does not exist, recreating database`, 'warn');

      // Close the current database
      this.db.close();
      this.db = null;
      this.isInitialized = false;

      // Delete and recreate the database with a higher version
      return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);

        deleteRequest.onsuccess = () => {
          logWithTimestamp(`Database ${this.DB_NAME} deleted successfully, recreating`);

          // Reinitialize with the same version
          this.init().then(resolve).catch(reject);
        };

        deleteRequest.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error deleting database: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      });
    }

    return Promise.resolve();
  }

  // Initialize the database
  public async init(): Promise<void> {
    if (this.isInitialized) {
      logWithTimestamp(`MemoryService already initialized, skipping initialization`);
      return;
    }

    logWithTimestamp(`Initializing MemoryService with database ${this.DB_NAME}`);

    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      logWithTimestamp(`IndexedDB is not available in this environment`, 'error');
      throw new Error('IndexedDB is not available in this environment');
    }

    return new Promise((resolve, reject) => {
      try {
        logWithTimestamp(`Opening IndexedDB database ${this.DB_NAME} (version ${this.DB_VERSION})`);
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = (event) => {
          logWithTimestamp(`Database upgrade needed for ${this.DB_NAME}`);
          const db = (event.target as IDBOpenDBRequest).result;

          // Create the object store if it doesn't exist
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            logWithTimestamp(`Creating object store ${this.STORE_NAME}`);
            const store = db.createObjectStore(this.STORE_NAME, {
              keyPath: 'id',
              autoIncrement: true
            });

            // Create an index on the domain field for quick lookups
            store.createIndex('domain', 'domain', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });

            logWithTimestamp(`Created ${this.STORE_NAME} object store in ${this.DB_NAME} database`);
          } else {
            logWithTimestamp(`Object store ${this.STORE_NAME} already exists`);
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isInitialized = true;
          logWithTimestamp(`Successfully opened ${this.DB_NAME} database`);

          // Log the object stores in the database
          const storeNames = Array.from(this.db.objectStoreNames);
          logWithTimestamp(`Database contains object stores: ${storeNames.join(', ') || 'none'}`);

          // Check if the object store exists, and if not, recreate the database
          if (!storeNames.includes(this.STORE_NAME)) {
            logWithTimestamp(`Object store ${this.STORE_NAME} not found, will recreate database`, 'warn');

            // Close the database
            this.db.close();
            this.db = null;
            this.isInitialized = false;

            // Delete and recreate the database with a higher version
            const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);

            deleteRequest.onsuccess = () => {
              logWithTimestamp(`Database ${this.DB_NAME} deleted successfully, recreating`);

              // No need to increment version if we're deleting and recreating the database
              // The database will be created with the current version

              // Reinitialize with the same version
              this.init().then(resolve).catch(reject);
            };

            deleteRequest.onerror = (event) => {
              const error = (event.target as IDBRequest).error;
              logWithTimestamp(`Error deleting database: ${error?.message || 'Unknown error'}`, 'error');
              reject(error);
            };

            return; // Don't resolve yet, wait for the recursive call to complete
          }

          resolve();
        };

        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).error;
          logWithTimestamp(`Error opening ${this.DB_NAME} database: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };

        request.onblocked = () => {
          logWithTimestamp(`Database request blocked for ${this.DB_NAME}`, 'warn');
        };
      } catch (error) {
        logWithTimestamp(`Exception opening ${this.DB_NAME} database: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  // Ensure the database is initialized before any operation
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    // Make sure the object store exists
    await this.ensureObjectStoreExists();
  }

  /**
   * Check if a similar memory already exists
   * @param memory The memory to check for duplicates
   * @returns The ID of the existing memory if found, null otherwise
   */
  public async findSimilarMemory(memory: AgentMemory): Promise<number | null> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Normalize the domain
    const normalizedDomain = normalizeDomain(memory.domain);

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('domain');

        // Get all memories for this domain
        const request = index.getAll(normalizedDomain);

        request.onsuccess = (event) => {
          const memories = (event.target as IDBRequest<AgentMemory[]>).result;

          // Check if any existing memory has the same task description
          const similarMemory = memories.find(m =>
            m.taskDescription.toLowerCase() === memory.taskDescription.toLowerCase()
          );

          if (similarMemory && similarMemory.id) {
            logWithTimestamp(`Found similar memory with ID ${similarMemory.id} for task "${memory.taskDescription}"`);
            resolve(similarMemory.id);
          } else {
            resolve(null);
          }
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error checking for similar memories: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception checking for similar memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  /**
   * Update an existing memory
   * @param id The ID of the memory to update
   * @param memory The updated memory data
   * @returns Promise resolving to the ID of the updated memory
   */
  public async updateMemory(id: number, memory: Partial<AgentMemory>): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        // First get the existing memory
        const getRequest = store.get(id);

        getRequest.onsuccess = (event) => {
          const existingMemory = (event.target as IDBRequest<AgentMemory>).result;

          if (!existingMemory) {
            reject(new Error(`Memory with ID ${id} not found`));
            return;
          }

          // Update the memory with new data
          const updatedMemory = {
            ...existingMemory,
            ...memory,
            // Always update the timestamp
            createdAt: Date.now()
          };

          // Put the updated memory back
          const putRequest = store.put(updatedMemory);

          putRequest.onsuccess = () => {
            logWithTimestamp(`Successfully updated memory with ID ${id}`);
            resolve(id);
          };

          putRequest.onerror = (event) => {
            const error = (event.target as IDBRequest).error;
            logWithTimestamp(`Error updating memory: ${error?.message || 'Unknown error'}`, 'error');
            reject(error);
          };
        };

        getRequest.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error getting memory for update: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception updating memory: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  // Store a new memory
  public async storeMemory(memory: AgentMemory): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      logWithTimestamp(`Cannot store memory: Database not initialized`, 'error');
      throw new Error('Database not initialized');
    }

    // Normalize the domain before storing
    memory.domain = normalizeDomain(memory.domain);

    // Check if a similar memory already exists
    const existingId = await this.findSimilarMemory(memory);

    // If a similar memory exists, update it instead of creating a new one
    if (existingId !== null) {
      logWithTimestamp(`Similar memory found with ID ${existingId}, updating instead of creating duplicate`);
      return this.updateMemory(existingId, memory);
    }

    logWithTimestamp(`No similar memory found, storing new memory for domain ${memory.domain}`);

    return new Promise((resolve, reject) => {
      try {
        logWithTimestamp(`Creating transaction for ${this.STORE_NAME}`);
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');

        transaction.onerror = (event) => {
          const error = (event.target as IDBTransaction).error;
          logWithTimestamp(`Transaction error: ${error?.message || 'Unknown error'}`, 'error');
        };

        transaction.onabort = () => {
          logWithTimestamp(`Transaction aborted`, 'warn');
        };

        const store = transaction.objectStore(this.STORE_NAME);

        // Add timestamp if not provided
        if (!memory.createdAt) {
          memory.createdAt = Date.now();
        }

        logWithTimestamp(`Adding memory to store: ${JSON.stringify(memory).substring(0, 100)}...`);
        const request = store.add(memory);

        request.onsuccess = (event) => {
          const id = (event.target as IDBRequest<number>).result;
          logWithTimestamp(`Successfully stored memory with ID ${id} for domain ${memory.domain}`);
          resolve(id);
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error storing memory: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception storing memory: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  // Retrieve memories by domain
  public async getMemoriesByDomain(domain: string): Promise<AgentMemory[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Normalize the domain for consistent lookup
    const normalizedDomain = normalizeDomain(domain);

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('domain');

        const request = index.getAll(normalizedDomain);

        request.onsuccess = (event) => {
          const memories = (event.target as IDBRequest<AgentMemory[]>).result;
          logWithTimestamp(`Retrieved ${memories.length} memories for domain ${domain}`);
          resolve(memories);
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error retrieving memories: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception retrieving memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  // Get all memories
  public async getAllMemories(): Promise<AgentMemory[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);

        const request = store.getAll();

        request.onsuccess = (event) => {
          const memories = (event.target as IDBRequest<AgentMemory[]>).result;
          logWithTimestamp(`Retrieved ${memories.length} total memories`);
          resolve(memories);
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error retrieving all memories: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception retrieving all memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  // Delete a memory by ID
  public async deleteMemory(id: number): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        const request = store.delete(id);

        request.onsuccess = () => {
          logWithTimestamp(`Successfully deleted memory with ID ${id}`);
          resolve();
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error deleting memory: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception deleting memory: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  // Clear all memories
  public async clearMemories(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        const request = store.clear();

        request.onsuccess = () => {
          logWithTimestamp(`Successfully cleared all memories`);
          resolve();
        };

        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          logWithTimestamp(`Error clearing memories: ${error?.message || 'Unknown error'}`, 'error');
          reject(error);
        };
      } catch (error) {
        logWithTimestamp(`Exception clearing memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
        reject(error);
      }
    });
  }

  /**
   * Import default memories from the bundled JSON file
   * This should only be called once during initial database setup
   * @returns Promise resolving to the number of imported memories
   */
  public async importDefaultMemories(): Promise<number> {
    // Skip if we've already imported default memories
    if (this.hasImportedDefaultMemories) {
      logWithTimestamp('Default memories already imported, skipping');
      return 0;
    }

    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if the database is empty before importing
      const existingMemories = await this.getAllMemories();

      if (existingMemories.length > 0) {
        logWithTimestamp('Database already contains memories, skipping default import');
        this.hasImportedDefaultMemories = true;
        return 0;
      }

      // Import the default memories
      logWithTimestamp('Importing default memories...');

      // Use the statically imported default memories
      const defaultMemories: AgentMemory[] = defaultMemoriesData as AgentMemory[];

      if (!Array.isArray(defaultMemories) || defaultMemories.length === 0) {
        logWithTimestamp('No default memories found or invalid format', 'warn');
        this.hasImportedDefaultMemories = true;
        return 0;
      }

      logWithTimestamp(`Found ${defaultMemories.length} default memories to import`);

      // Store each memory, skipping duplicates
      let importedCount = 0;
      for (const memory of defaultMemories) {
        try {
          // Remove any existing ID to ensure we don't overwrite user memories
          delete memory.id;

          // Store the memory (this will check for duplicates)
          await this.storeMemory(memory);
          importedCount++;
        } catch (error) {
          logWithTimestamp(`Error importing memory: ${error instanceof Error ? error.message : String(error)}`, 'warn');
        }
      }

      logWithTimestamp(`Successfully imported ${importedCount} default memories`);
      this.hasImportedDefaultMemories = true;
      return importedCount;
    } catch (error) {
      logWithTimestamp(`Error importing default memories: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return 0;
    }
  }
}
