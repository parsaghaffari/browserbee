// === JSON-RPC Base Structures
// copied from https://github.com/google/A2A/blob/main/samples/js/src/schema.ts

/**
 * Base interface for identifying JSON-RPC messages.
 */
export interface JSONRPCMessageIdentifier {
  /**
   * Request identifier. Can be a string, number, or null.
   * Responses must have the same ID as the request they relate to.
   * Notifications (requests without an expected response) should omit the ID or use null.
   */
  id?: number | string | null;
}

/**
 * Base interface for all JSON-RPC messages (Requests and Responses).
 */
export interface JSONRPCMessage extends JSONRPCMessageIdentifier {
  /**
   * Specifies the JSON-RPC version. Must be "2.0".
   * @default "2.0"
   * @const "2.0"
   */
  jsonrpc?: "2.0";
}

/**
 * Represents a JSON-RPC request object base structure.
 * Specific request types should extend this.
 */
export interface JSONRPCRequest extends JSONRPCMessage {
  /**
   * The name of the method to be invoked.
   */
  method: string;

  /**
   * Parameters for the method. Can be a structured object, an array, or null/omitted.
   * Specific request interfaces will define the exact type.
   * @default null
   */
  params?: unknown; // Base type; specific requests will override
}

/**
 * Represents a JSON-RPC error object.
 */
export interface JSONRPCError<Data = unknown | null, Code = number> {
  /**
   * A number indicating the error type that occurred.
   */
  code: Code;

  /**
   * A string providing a short description of the error.
   */
  message: string;

  /**
   * Optional additional data about the error.
   * @default null
   */
  data?: Data;
}

/**
 * Represents a JSON-RPC response object.
 */
export interface JSONRPCResponse<R = unknown | null, E = unknown | null>
  extends JSONRPCMessage {
  /**
   * The result of the method invocation. Required on success.
   * Should be null or omitted if an error occurred.
   * @default null
   */
  result?: R;

  /**
   * An error object if an error occurred during the request. Required on failure.
   * Should be null or omitted if the request was successful.
   * @default null
   */
  error?: JSONRPCError<E> | null;
}
