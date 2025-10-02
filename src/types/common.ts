// Common types used across the application

// Generic type for form values from Ant Design
export type FormValues = Record<string, unknown>

// Generic error with code
export interface ErrorWithCode {
  code?: string
  message?: string
}

// Supabase error type
export interface SupabaseError {
  code?: string
  message: string
  details?: string
  hint?: string
}

// Generic ID type
export type ID = string | number

// Type guard for errors with code
export function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as ErrorWithCode).code === 'string'
  )
}
