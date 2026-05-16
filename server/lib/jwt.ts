import jwt from 'jsonwebtoken';
import { AppError, ErrorCode } from './errors.js';

export interface JwtPayload {
  salespersonId: number;
  email: string;
  isManager: boolean;
}

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN ?? '28800', 10);

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, ErrorCode.AUTH_TOKEN_EXPIRED, '액세스 토큰이 만료되었습니다');
    }
    throw new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, '유효하지 않은 토큰입니다');
  }
}
