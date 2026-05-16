import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';
import { guardDraftReport } from '../lib/reportGuard.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function nextSeq(reportId: number) {
  const last = await prisma.plan.findFirst({ where: { reportId }, orderBy: { seq: 'desc' } });
  return (last?.seq ?? 0) + 1;
}

// POST /reports/:reportId/plans
router.post('/', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const { content, seq } = req.body as { content?: string; seq?: number };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '내용을 입력하세요');

    const created = await prisma.plan.create({
      data: { reportId, content: content.trim(), seq: seq ?? (await nextSeq(reportId)) },
    });

    sendCreated(res, { planId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /reports/:reportId/plans/:planId
router.put('/:planId', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    const planId = parseInt(req.params.planId, 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.reportId !== reportId) throw new AppError(404, ErrorCode.NOT_FOUND, '익일계획 항목을 찾을 수 없습니다');

    const { content, seq } = req.body as { content?: string; seq?: number };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '내용을 입력하세요');

    await prisma.plan.update({ where: { id: planId }, data: { content: content.trim(), seq: seq ?? plan.seq } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

// DELETE /reports/:reportId/plans/:planId
router.delete('/:planId', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    const planId = parseInt(req.params.planId, 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.reportId !== reportId) throw new AppError(404, ErrorCode.NOT_FOUND, '익일계획 항목을 찾을 수 없습니다');

    await prisma.plan.delete({ where: { id: planId } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
