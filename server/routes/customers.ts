import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated, sendPaginated, parsePagination, buildPagination } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

// 관리자 권한 체크 (managerId IS NULL)
async function requireAdmin(salespersonId: number) {
  const me = await prisma.salesperson.findUnique({ where: { id: salespersonId } });
  if (!me || me.managerId !== null) {
    throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
  }
}

const PHONE_RE = /^[0-9\-\+\(\)\s]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCustomerBody(body: Record<string, unknown>, requireFields = true) {
  const { companyName, contactName, phone, email, address } = body as Record<string, string | undefined>;

  if (requireFields) {
    if (!companyName?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '회사명을 입력하세요');
    if (!contactName?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '담당자명을 입력하세요');
  }
  if (companyName && companyName.length > 200) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '회사명은 최대 200자입니다');
  if (contactName && contactName.length > 100) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '담당자명은 최대 100자입니다');
  if (phone && !PHONE_RE.test(phone)) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '연락처 형식이 올바르지 않습니다');
  if (email && !EMAIL_RE.test(email)) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '이메일 형식이 올바르지 않습니다');
  if (address && address.length > 500) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '주소는 최대 500자입니다');
}

// GET /customers
router.get('/', async (req, res, next) => {
  try {
    const { page, size, skip } = parsePagination(req.query as Record<string, unknown>);
    const { keyword, industry, isActive } = req.query as Record<string, string | undefined>;

    const where = {
      ...(keyword ? {
        OR: [
          { companyName: { contains: keyword } },
          { contactName: { contains: keyword } },
        ],
      } : {}),
      ...(industry ? { industry } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: size, orderBy: { id: 'asc' } }),
      prisma.customer.count({ where }),
    ]);

    sendPaginated(res, items.map(c => ({
      customerId: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      phone: c.phone,
      email: c.email,
      industry: c.industry,
      isActive: c.isActive,
    })), buildPagination(page, size, totalCount));
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '고객을 찾을 수 없습니다');

    const c = await prisma.customer.findUnique({ where: { id } });
    if (!c) throw new AppError(404, ErrorCode.NOT_FOUND, '고객을 찾을 수 없습니다');

    sendSuccess(res, {
      customerId: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      industry: c.industry,
      memo: c.memo,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString().slice(0, 19),
      updatedAt: c.updatedAt.toISOString().slice(0, 19),
    });
  } catch (err) {
    next(err);
  }
});

// POST /customers
router.post('/', async (req, res, next) => {
  try {
    await requireAdmin(req.user.salespersonId);
    validateCustomerBody(req.body as Record<string, unknown>);

    const { companyName, contactName, phone, email, address, industry, memo } = req.body as Record<string, string | undefined>;

    const created = await prisma.customer.create({
      data: {
        companyName: companyName!.trim(),
        contactName: contactName!.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        industry: industry?.trim() || null,
        memo: memo?.trim() || null,
        isActive: true,
      },
    });

    sendCreated(res, { customerId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    await requireAdmin(req.user.salespersonId);

    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '고객을 찾을 수 없습니다');

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, ErrorCode.NOT_FOUND, '고객을 찾을 수 없습니다');

    validateCustomerBody(req.body as Record<string, unknown>);
    const { companyName, contactName, phone, email, address, industry, memo, isActive } = req.body as Record<string, unknown>;

    await prisma.customer.update({
      where: { id },
      data: {
        companyName: (companyName as string).trim(),
        contactName: (contactName as string).trim(),
        phone: (phone as string | undefined)?.trim() || null,
        email: (email as string | undefined)?.trim() || null,
        address: (address as string | undefined)?.trim() || null,
        industry: (industry as string | undefined)?.trim() || null,
        memo: (memo as string | undefined)?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
