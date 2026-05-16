import type { RequestHandler } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { AppError, ErrorCode } from '../lib/errors.js';

// Express Request 타입에 user 프로퍼티 추가
declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, '인증 토큰이 필요합니다'));
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
};
