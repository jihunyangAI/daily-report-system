import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  parsePagination,
  buildPagination,
} from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 관리자 권한 체크: manager_id IS NULL 인 사원만 관리자
async function requireAdmin(salespersonId: number): Promise<void> {
  const me = await prisma.salesperson.findUnique({ where: { id: salespersonId } });
  if (!me || me.managerId !== null) {
    throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
  }
}

function formatSalesperson(sp: {
  id: number;
  name: string;
  department: string;
  rank: string;
  email: string;
  hireDate: Date;
  isActive: boolean;
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

// POST /salespersons — 관리자 전용
router.post('/', async (req, res, next) => {
  try {
    await requireAdmin(req.user.salespersonId);

    const { name, email, password, department, rank, managerId, hireDate } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      department?: string;
      rank?: string;
      managerId?: number | null;
      hireDate?: string;
    };

    // 필수 필드 및 형식 검증
    if (!name?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명을 입력하세요');
    if (name.trim().length > 50)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명은 최대 50자입니다');
    if (!email?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '이메일을 입력하세요');
    if (!EMAIL_RE.test(email))
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '이메일 형식이 올바르지 않습니다');
    if (!password || password.length < 8)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다');
    if (!department?.trim())
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '부서를 입력하세요');
    if (department.trim().length > 100)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '부서명은 최대 100자입니다');
    if (!rank?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '직급을 입력하세요');
    if (rank.trim().length > 50)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '직급은 최대 50자입니다');
    if (!hireDate) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '입사일을 입력하세요');
    if (!DATE_RE.test(hireDate) || isNaN(Date.parse(hireDate)))
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '입사일 형식이 올바르지 않습니다 (YYYY-MM-DD)');

    // 이메일 중복 확인
    const existing = await prisma.salesperson.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing)
      throw new AppError(409, ErrorCode.SALESPERSON_EMAIL_DUPLICATE, '이미 사용 중인 이메일입니다');

    // managerId 유효성: DB에 존재하는지 확인 후 생성
    // 신규 사원은 아직 DB에 없으므로 등록 전에는 자기참조 불가능 — managerId가 제공된 경우만 체크
    if (managerId !== undefined && managerId !== null) {
      const managerExists = await prisma.salesperson.findUnique({ where: { id: managerId } });
      if (!managerExists)
        throw new AppError(400, ErrorCode.VALIDATION_ERROR, '존재하지 않는 상급자 ID입니다');
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

// PUT /salespersons/:id — 관리자 전용
router.put('/:id', async (req, res, next) => {
  try {
    await requireAdmin(req.user.salespersonId);

    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '영업사원을 찾을 수 없습니다');

    const existing = await prisma.salesperson.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, ErrorCode.NOT_FOUND, '영업사원을 찾을 수 없습니다');

    const { name, department, rank, managerId, hireDate, isActive, password } = req.body as {
      name?: string;
      department?: string;
      rank?: string;
      managerId?: number | null;
      hireDate?: string;
      isActive?: boolean;
      password?: string;
    };

    // 필수 필드 및 형식 검증
    if (!name?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명을 입력하세요');
    if (name.trim().length > 50)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '사원명은 최대 50자입니다');
    if (!department?.trim())
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '부서를 입력하세요');
    if (department.trim().length > 100)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '부서명은 최대 100자입니다');
    if (!rank?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '직급을 입력하세요');
    if (rank.trim().length > 50)
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '직급은 최대 50자입니다');
    if (!hireDate) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '입사일을 입력하세요');
    if (!DATE_RE.test(hireDate) || isNaN(Date.parse(hireDate)))
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '입사일 형식이 올바르지 않습니다 (YYYY-MM-DD)');

    // managerId 자기참조 불가 (TC-SP-008)
    if (managerId !== undefined && managerId !== null && managerId === id) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '본인을 상급자로 지정할 수 없습니다');
    }

    // 비밀번호: 입력된 경우만 검증 (TC-SP-006)
    if (password !== undefined && password !== '' && password.length < 8) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '비밀번호는 8자 이상이어야 합니다');
    }

    const updateData: {
      name: string;
      department: string;
      rank: string;
      managerId: number | null;
      hireDate: Date;
      isActive: boolean;
      passwordHash?: string;
    } = {
      name: name.trim(),
      department: department.trim(),
      rank: rank.trim(),
      // managerId가 undefined면 기존 값 유지, null이면 상급자 해제, 숫자면 변경
      managerId: managerId !== undefined ? (managerId ?? null) : existing.managerId,
      hireDate: new Date(hireDate),
      isActive: isActive !== undefined ? isActive : existing.isActive,
    };

    // 비밀번호 입력 시에만 해시하여 업데이트 (TC-SP-006)
    if (password && password.length >= 8) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.salesperson.update({ where: { id }, data: updateData });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
