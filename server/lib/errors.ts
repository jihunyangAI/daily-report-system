// API 명세서 섹션 10 에러 코드

export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_INACTIVE_ACCOUNT: 'AUTH_INACTIVE_ACCOUNT',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REPORT_ALREADY_EXISTS: 'REPORT_ALREADY_EXISTS',
  REPORT_VISIT_REQUIRED: 'REPORT_VISIT_REQUIRED',
  REPORT_STATUS_INVALID: 'REPORT_STATUS_INVALID',
  REPORT_NOT_EDITABLE: 'REPORT_NOT_EDITABLE',
  SALESPERSON_EMAIL_DUPLICATE: 'SALESPERSON_EMAIL_DUPLICATE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
