import type { RequestHandler } from 'express';
import { ErrorCode } from '../lib/errors.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: '요청한 리소스를 찾을 수 없습니다' },
  });
};
