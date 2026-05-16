import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim()) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '이메일을 입력하세요');
    }
    if (!password) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '비밀번호를 입력하세요');
    }
    if (password.length < 8) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다');
    }

    const salesperson = await prisma.salesperson.findUnique({ where: { email } });

    if (!salesperson || !(await bcrypt.compare(password, salesperson.passwordHash))) {
      throw new AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, '이메일 또는 비밀번호가 올바르지 않습니다');
    }

    if (!salesperson.isActive) {
      throw new AppError(401, ErrorCode.AUTH_INACTIVE_ACCOUNT, '사용이 중지된 계정입니다');
    }

    // 상급자 여부: 다른 사원의 manager_id 로 참조되는 사원
    const subordinateCount = await prisma.salesperson.count({
      where: { managerId: salesperson.id },
    });
    const isManager = subordinateCount > 0;

    const accessToken = signToken({
      salespersonId: salesperson.id,
      email: salesperson.email,
      isManager,
    });

    sendSuccess(res, {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN ?? '28800', 10),
      salesperson: {
        salespersonId: salesperson.id,
        name: salesperson.name,
        department: salesperson.department,
        rank: salesperson.rank,
        isManager,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', authenticate, (_req, res) => {
  // 클라이언트 토큰 삭제 방식: 서버에서는 200만 반환
  sendSuccess(res, null);
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const salesperson = await prisma.salesperson.findUnique({
      where: { id: req.user.salespersonId },
      include: { manager: { select: { id: true, name: true } } },
    });

    if (!salesperson) {
      throw new AppError(404, ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    const subordinateCount = await prisma.salesperson.count({
      where: { managerId: salesperson.id },
    });

    sendSuccess(res, {
      salespersonId: salesperson.id,
      name: salesperson.name,
      email: salesperson.email,
      department: salesperson.department,
      rank: salesperson.rank,
      manager: salesperson.manager
        ? { salespersonId: salesperson.manager.id, name: salesperson.manager.name }
        : null,
      isManager: subordinateCount > 0,
      hireDate: salesperson.hireDate.toISOString().slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
