// Centralized error handling for PayHub application
import { message } from 'antd'

export const ErrorCode = {
  // Authentication errors
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Database errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_CONSTRAINT_ERROR: 'DB_CONSTRAINT_ERROR',

  // Business logic errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',

  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',

  // Approval errors
  APPROVAL_STAGE_ERROR: 'APPROVAL_STAGE_ERROR',
  APPROVAL_PERMISSION_ERROR: 'APPROVAL_PERMISSION_ERROR',

  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode]

export class AppError extends Error {
  code: ErrorCode
  statusCode: number
  details?: unknown

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

// User-friendly error messages (Russian)
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_FAILED]: 'Ошибка аутентификации. Проверьте логин и пароль.',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Необходимо войти в систему.',
  [ErrorCode.AUTH_FORBIDDEN]: 'У вас нет прав для выполнения этого действия.',

  [ErrorCode.DB_CONNECTION_ERROR]: 'Ошибка подключения к базе данных.',
  [ErrorCode.DB_QUERY_ERROR]: 'Ошибка выполнения запроса к базе данных.',
  [ErrorCode.DB_CONSTRAINT_ERROR]: 'Ошибка: нарушено ограничение целостности данных.',

  [ErrorCode.VALIDATION_ERROR]: 'Ошибка валидации данных.',
  [ErrorCode.NOT_FOUND]: 'Запрашиваемый ресурс не найден.',
  [ErrorCode.DUPLICATE_ERROR]: 'Запись с такими данными уже существует.',

  [ErrorCode.FILE_TOO_LARGE]: 'Файл слишком большой. Максимальный размер: 50 МБ.',
  [ErrorCode.FILE_INVALID_TYPE]: 'Недопустимый тип файла.',
  [ErrorCode.FILE_UPLOAD_ERROR]: 'Ошибка загрузки файла.',

  [ErrorCode.APPROVAL_STAGE_ERROR]: 'Ошибка этапа согласования.',
  [ErrorCode.APPROVAL_PERMISSION_ERROR]: 'У вас нет прав для согласования на данном этапе.',

  [ErrorCode.UNKNOWN_ERROR]: 'Произошла неизвестная ошибка.'
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message || ERROR_MESSAGES[error.code]
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR]
}

/**
 * Handle error and show user notification
 */
export function handleError(error: unknown, context?: string): void {
  const errorMessage = getErrorMessage(error)

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, error)
  }

  // Show user notification
  message.error(errorMessage)

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (import.meta.env.PROD) {
  //   sendToErrorTracking(error, context)
  // }
}

/**
 * Parse Supabase error to AppError
 */
export function parseSupabaseError(error: any): AppError {
  const message = error?.message || 'Database error'
  const code = error?.code

  // Check for specific Supabase error codes
  if (code === 'PGRST116') {
    return new AppError('Запись не найдена', ErrorCode.NOT_FOUND, 404)
  }

  if (code === '23505') {
    return new AppError('Запись с такими данными уже существует', ErrorCode.DUPLICATE_ERROR, 409)
  }

  if (code === '23503' || code === '23502' || code === '23514') {
    return new AppError('Нарушено ограничение целостности данных', ErrorCode.DB_CONSTRAINT_ERROR, 400, error)
  }

  if (message.includes('JWT')) {
    return new AppError('Сессия истекла. Войдите снова.', ErrorCode.AUTH_UNAUTHORIZED, 401)
  }

  return new AppError(message, ErrorCode.DB_QUERY_ERROR, 500, error)
}

/**
 * Async wrapper with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    handleError(error, context)
    return null
  }
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
