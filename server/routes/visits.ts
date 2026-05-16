import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';
import { guardDraftReport } from '../lib/reportGuard.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const router = Router({ mergeParams: true });
router.use(authenticate);

// POST /reports/:reportId/visits
router.post('/', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const { customerId, visitTime, visitPurpose, visitContent, nextVisitDate } = req.body as Record<string, unknown>;

    if (!customerId) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '고객을 선택하세요');
    const customer = await prisma.customer.findUnique({ where: { id: Number(customerId) } });
    if (!customer) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '존재하지 않는 고객입니다');
    if (visitTime && !TIME_RE.test(String(visitTime))) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '방문시각 형식이 올바르지 않습니다 (HH:MM)');
    }
    if (visitPurpose && String(visitPurpose).length > 500) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '방문목적은 최대 500자입니다');
    }

    const created = await prisma.visitRecord.create({
      data: {
        reportId,
        customerId: Number(customerId),
        visitTime: visitTime ? String(visitTime) : null,
        visitPurpose: visitPurpose ? String(visitPurpose) : null,
        visitContent: visitContent ? String(visitContent) : null,
        nextVisitDate: nextVisitDate ? new Date(String(nextVisitDate)) : null,
      },
    });

    sendCreated(res, { visitId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /reports/:reportId/visits/:visitId
router.put('/:visitId', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    const visitId = parseInt(req.params.visitId, 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const visit = await prisma.visitRecord.findUnique({ where: { id: visitId } });
    if (!visit || visit.reportId !== reportId) throw new AppError(404, ErrorCode.NOT_FOUND, '방문기록을 찾을 수 없습니다');

    const { customerId, visitTime, visitPurpose, visitContent, nextVisitDate } = req.body as Record<string, unknown>;

    if (!customerId) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '고객을 선택하세요');
    const customer = await prisma.customer.findUnique({ where: { id: Number(customerId) } });
    if (!customer) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '존재하지 않는 고객입니다');
    if (visitTime && !TIME_RE.test(String(visitTime))) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '방문시각 형식이 올바르지 않습니다 (HH:MM)');
    }

    await prisma.visitRecord.update({
      where: { id: visitId },
      data: {
        customerId: Number(customerId),
        visitTime: visitTime ? String(visitTime) : null,
        visitPurpose: visitPurpose ? String(visitPurpose) : null,
        visitContent: visitContent ? String(visitContent) : null,
        nextVisitDate: nextVisitDate ? new Date(String(nextVisitDate)) : null,
      },
    });

    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

// DELETE /reports/:reportId/visits/:visitId
router.delete('/:visitId', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    const visitId = parseInt(req.params.visitId, 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const visit = await prisma.visitRecord.findUnique({ where: { id: visitId } });
    if (!visit || visit.reportId !== reportId) throw new AppError(404, ErrorCode.NOT_FOUND, '방문기록을 찾을 수 없습니다');

    await prisma.visitRecord.delete({ where: { id: visitId } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
