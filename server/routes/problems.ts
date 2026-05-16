import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';
import { guardDraftReport } from '../lib/reportGuard.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function nextSeq(reportId: number) {
  const last = await prisma.problem.findFirst({ where: { reportId }, orderBy: { seq: 'desc' } });
  return (last?.seq ?? 0) + 1;
}

// POST /reports/:reportId/problems
router.post('/', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const { content, seq } = req.body as { content?: string; seq?: number };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '내용을 입력하세요');

    const created = await prisma.problem.create({
      data: { reportId, content: content.trim(), seq: seq ?? (await nextSeq(reportId)) },
    });

    sendCreated(res, { problemId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /reports/:reportId/problems/:problemId
router.put('/:problemId', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    const problemId = parseInt(req.params.problemId, 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem || problem.reportId !== reportId) throw new AppError(404, ErrorCode.NOT_FOUND, '과제/상담 항목을 찾을 수 없습니다');

    const { content, seq } = req.body as { content?: string; seq?: number };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '내용을 입력하세요');

    await prisma.problem.update({ where: { id: problemId }, data: { content: content.trim(), seq: seq ?? problem.seq } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

// DELETE /reports/:reportId/problems/:problemId
router.delete('/:problemId', async (req, res, next) => {
  try {
    const reportId = parseInt(((req.params as Record<string,string>).reportId), 10);
    const problemId = parseInt(req.params.problemId, 10);
    await guardDraftReport(reportId, req.user.salespersonId);

    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem || problem.reportId !== reportId) throw new AppError(404, ErrorCode.NOT_FOUND, '과제/상담 항목을 찾을 수 없습니다');

    // 연관 댓글 연쇄 삭제 (Prisma Cascade 설정으로 자동 처리)
    await prisma.problem.delete({ where: { id: problemId } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
