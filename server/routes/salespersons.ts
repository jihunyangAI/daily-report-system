import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated, sendPaginated, parsePagination, buildPagination } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

// 관리자 권한 체크 (최상위 사원 또는 manager_id IS NULL 기준)
async function requireAdmin(salespersonId: number) {
  const me = await prisma.salesperson.findUnique({ where: { id: salespersonId } });
  if (!me?.managerId === false && me?.managerId !== null) {
    // managerId가 있으면 관리자가 아님 — 단순화: isManager 플래그 없으므로 manager_id IS NULL 기준
  }
  // 실제 관리자 판별: manager_id IS NULL 인 사원 (최상위)
  if (me && me.managerId !== null) {
    throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
  }
}

function formatSalesperson(sp: {
  id: number; name: string; department: string; rank: string;
  email: string; hireDate: Date; isActive: boolean;
  manager?: { id: number; name: string } | null;
}) {
  return {
    salespersonId: sp.id,
    name: sp.name,
    department: sp.department,
    rank: sp.rank,
    manager: sp.manager ? { salespersonId: sp.manager.id, name: sp.manager.name } : null,
    email: sp.email,
    hireDate: sp.hireDate.toISOString().slice(0, 10),
    isActive: sp.isActive,
  };
}

// GET /salespersons
router.get('/', async (req, res, next) => {
  try {
    const { page, size, skip } = parsePagination(req.query as Record<string, unknown>);
    const { keyword, department, isActive } = req.query as Record<string, string | undefined>;

    const where = {
      ...(keyword ? { name: { contains: keyword } } : {}),
      ...(department ? { department: { contains: department } } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.salesperson.findMany({
        where,
        skip,
        take: size,
        include: { manager: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' },
      }),
      prisma.salesperson.count({ where }),
    ]);

    sendPaginated(res, items.map(formatSalesperson), buildPagination(page, size, totalCount));
  } catch (err) {
    next(err);
  }
});

// GET /salespersons/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '영업사원을 찾을 수 없습니다');

    const sp = await prisma.salesperson.findUnique({
      where: { id },
      include: { manager: { select: { id: true, name: true } } },
    });
    if (!sp) throw new AppError(404, ErrorCode.NOT_FOUND, '영업사원을 찾을 수 없습니다');

    sendSuccess(res, formatSalesperson(sp));
  } catch (err) {
    next(err);
  }
});

// POST /salespersons
router.post('/', async (req, res, next) => {
  try {
    await requireAdmin(req.user.salespersonId);

    const { name, email, password, department, rank, managerId, hireDate } = req.body as {
      name?: string; email?: string; password?: string;
      department?: string; rank?: string;
      managerId?: number | null; hireDate?: string;
    };

    if (!name?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명을 입력하세요');
    if (name.length > 50) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명은 최대 50자입니다');
    if (!email?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '이메일을 입력하세요');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '이메일 형식이 올바르지 않습니다');
    if (!password || password.length < 8) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다');
    if (!department?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '부서를 입력하세요');
    if (!rank?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '직급을 입력하세요');
    if (!hireDate) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '입사일을 입력하세요');

    const existing = await prisma.salesperson.findUnique({ where: { email } });
    if (existing) throw new AppError(409, ErrorCode.SALESPERSON_EMAIL_DUPLICATE, '이미 사용 중인 이메일입니다');

    const newId = (await prisma.salesperson.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
    if (managerId && managerId === newId + 1) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '본인을 상급자로 지정할 수 없습니다');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.salesperson.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        department: department.trim(),
        rank: rank.trim(),
        managerId: managerId ?? null,
        hireDate: new Date(hireDate),
        isActive: true,
      },
    });

    sendCreated(res, { salespersonId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /salespersons/:id
router.put('/:id', async (req, res, next) => {
  try {
    await requireAdmin(req.user.salespersonId);

    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '영업사원을 찾을 수 없습니다');

    const existing = await prisma.salesperson.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, ErrorCode.NOT_FOUND, '영업사원을 찾을 수 없습니다');

    const { name, department, rank, managerId, hireDate, isActive, password } = req.body as {
      name?: string; department?: string; rank?: string;
      managerId?: number | null; hireDate?: string;
      isActive?: boolean; password?: string;
    };

    if (!name?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명을 입력하세요');
    if (name.length > 50) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명은 최대 50자입니다');
    if (!department?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '부서를 입력하세요');
    if (!rank?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '직급을 입력하세요');
    if (!hireDate) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '입사일을 입력하세요');
    if (managerId !== undefined && managerId !== null && managerId === id) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '본인을 상급자로 지정할 수 없습니다');
    }
    if (password !== undefined && password.length < 8) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다');
    }

    const updateData: Record<string, unknown> = {
      name: name.trim(),
      department: department.trim(),
      rank: rank.trim(),
      managerId: managerId ?? null,
      hireDate: new Date(hireDate),
      isActive: isActive ?? existing.isActive,
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.salesperson.update({ where: { id }, data: updateData });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
