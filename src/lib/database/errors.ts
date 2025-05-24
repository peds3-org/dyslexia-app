export enum DatabaseErrorCode {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  RLS_VIOLATION = 'RLS_VIOLATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: DatabaseErrorCode = DatabaseErrorCode.UNKNOWN,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  static fromSupabaseError(error: any): DatabaseError {
    if (!error) {
      return new DatabaseError('Unknown error', DatabaseErrorCode.UNKNOWN);
    }

    const message = error.message || 'Database operation failed';
    
    // Map Supabase error codes to our error codes
    switch (error.code) {
      case '42501': // RLS violation
        return new DatabaseError('Permission denied', DatabaseErrorCode.RLS_VIOLATION, error);
      case '42P01': // Table not found
        return new DatabaseError('Resource not found', DatabaseErrorCode.NOT_FOUND, error);
      case '23505': // Unique violation
        return new DatabaseError('Resource already exists', DatabaseErrorCode.CONFLICT, error);
      case 'PGRST116': // No rows found
        return new DatabaseError('Resource not found', DatabaseErrorCode.NOT_FOUND, error);
      case 'PGRST301': // Timeout
        return new DatabaseError('Operation timeout', DatabaseErrorCode.TIMEOUT, error);
      default:
        if (error.message?.includes('Failed to fetch')) {
          return new DatabaseError('Network connection error', DatabaseErrorCode.CONNECTION_ERROR, error);
        }
        return new DatabaseError(message, DatabaseErrorCode.UNKNOWN, error);
    }
  }
}