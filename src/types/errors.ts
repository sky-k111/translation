/**
 * Error types for POS recognition system
 * Requirement 7.3: Error handling and fallback mechanisms
 */

export enum POSErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',           // Network request failed
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',     // AI service error
  NLP_SERVICE_ERROR = 'NLP_SERVICE_ERROR',   // NLP service error
  CACHE_ERROR = 'CACHE_ERROR',               // Cache operation failed
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // Data validation failed
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',           // Request timeout
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'            // Unknown error
}

export interface POSError {
  type: POSErrorType;
  message: string;
  originalError?: Error;
  context?: {
    sentence?: string;
    approach?: string;
    timestamp: number;
  };
}
