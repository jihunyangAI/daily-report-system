import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { ErrorCode } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    if (err.data !== undefined) {
      (body.error as Record<string, unknown>).data = err.data;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // SyntaxError: 잘못된 JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: { code: ErrorCode.VALIDATION_ERROR, message: '잘못된 JSON 형식입니다' },
    });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: '서버 내부 오류가 발생했습니다' },
  });
};
