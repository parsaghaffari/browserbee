import React, { useRef, useState, useEffect } from 'react';
import { MemoryService } from '../../tracking/memoryService';

export function MemoryManagement() {
  // Memory management state
  const [memoryCount, setMemoryCount] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load memory count
  const loadMemoryCount = async () => {
    try {
      const memoryService = MemoryService.getInstance();
      await memoryService.init();
      const memories = await memoryService.getAllMemories();
      setMemoryCount(memories.length);
    } catch (error) {
      console.error('Error loading memory count:', error);
    }
  };

  // Export memories function
  const handleExportMemories = async () => {
    try {
      setExportStatus('Exporting...');
      const memoryService = MemoryService.getInstance();
      await memoryService.init();
      const memories = await memoryService.getAllMemories();
      
      const jsonData = JSON.stringify(memories, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `browserbee-memories-${date}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus(`Successfully exported ${memories.length} memories!`);
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus(`Error exporting memories: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Import memories function
  const handleImportMemories = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setImportStatus('Importing...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const memories = JSON.parse(content);
          
          if (!Array.isArray(memories)) {
            throw new Error('Invalid format: Expected an array of memories');
          }
          
          const memoryService = MemoryService.getInstance();
          await memoryService.init();
          
          let importedCount = 0;
          for (const memory of memories) {
            // Validate memory structure
            if (!memory.domain || !memory.taskDescription || !memory.toolSequence) {
              console.warn('Skipping invalid memory:', memory);
              continue;
            }
            
            // Ensure createdAt exists
            if (!memory.createdAt) {
              memory.createdAt = Date.now();
            }
            
            await memoryService.storeMemory(memory);
            importedCount++;
          }
          
          // Refresh memory count
          await loadMemoryCount();
          
          setImportStatus(`Successfully imported ${importedCount} memories!`);
          setTimeout(() => setImportStatus(''), 3000);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          setImportStatus(`Error parsing import file: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      setImportStatus(`Error importing memories: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Load memory count when component mounts
  useEffect(() => {
    loadMemoryCount();
  }, []);

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-xl">Memory Management</h2>
        <p className="mb-4">
          BrowserBee stores memories of successful interactions with websites to help improve future interactions.
          You can export these memories for backup or transfer to another device, and import them back later.
        </p>
        
        <div className="flex items-center mb-4">
          <span className="font-medium mr-2">Current memories:</span>
          <span className="badge badge-primary">{memoryCount}</span>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleExportMemories} 
            className="btn btn-primary"
            disabled={memoryCount === 0}
          >
            Export Memories
          </button>
          
          <button 
            onClick={triggerFileInput} 
            className="btn btn-secondary"
          >
            Import Memories
          </button>
          
          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportMemories}
            accept=".json"
            className="hidden"
          />
        </div>
        
        {exportStatus && (
          <div className={`alert ${exportStatus.includes('Error') ? 'alert-error' : 'alert-success'} mt-4`}>
            {exportStatus}
          </div>
        )}
        
        {importStatus && (
          <div className={`alert ${importStatus.includes('Error') ? 'alert-error' : 'alert-success'} mt-4`}>
            {importStatus}
          </div>
        )}
      </div>
    </div>
  );
}
