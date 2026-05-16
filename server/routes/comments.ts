import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

// 직속 상급자 여부 확인
async function requireDirectManager(managerId: number, targetSalespersonId: number) {
  const target = await prisma.salesperson.findUnique({ where: { id: targetSalespersonId } });
  if (!target || target.managerId !== managerId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, '직속 상급자만 댓글을 작성할 수 있습니다');
  }
}

// Problem 댓글 라우터 (/problems/:refId/comments)
export const problemCommentsRouter = Router({ mergeParams: true });
problemCommentsRouter.use(authenticate);

// POST /problems/:problemId/comments
problemCommentsRouter.post('/', async (req, res, next) => {
  try {
    const problemId = parseInt((req.params as Record<string, string>).problemId, 10);
    if (!problemId || problemId < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '과제/상담 항목을 찾을 수 없습니다');

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { report: { select: { salespersonId: true } } },
    });
    if (!problem) throw new AppError(404, ErrorCode.NOT_FOUND, '과제/상담 항목을 찾을 수 없습니다');

    await requireDirectManager(req.user.salespersonId, problem.report.salespersonId);

    const { content } = req.body as { content?: string };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글 내용을 입력하세요');
    if (content.length > 1000) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글은 최대 1000자입니다');

    const created = await prisma.comment.create({
      data: { problemId, authorId: req.user.salespersonId, content: content.trim() },
    });

    sendCreated(res, { commentId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /problems/:problemId/comments/:commentId
problemCommentsRouter.put('/:commentId', async (req, res, next) => {
  try {
    const problemId = parseInt((req.params as Record<string, string>).problemId, 10);
    const commentId = parseInt(req.params.commentId, 10);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.problemId !== problemId) throw new AppError(404, ErrorCode.NOT_FOUND, '댓글을 찾을 수 없습니다');
    if (comment.authorId !== req.user.salespersonId) throw new AppError(403, ErrorCode.FORBIDDEN, '본인 댓글만 수정할 수 있습니다');

    const { content } = req.body as { content?: string };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글 내용을 입력하세요');
    if (content.length > 1000) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글은 최대 1000자입니다');

    await prisma.comment.update({ where: { id: commentId }, data: { content: content.trim() } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

// DELETE /problems/:problemId/comments/:commentId
problemCommentsRouter.delete('/:commentId', async (req, res, next) => {
  try {
    const problemId = parseInt((req.params as Record<string, string>).problemId, 10);
    const commentId = parseInt(req.params.commentId, 10);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.problemId !== problemId) throw new AppError(404, ErrorCode.NOT_FOUND, '댓글을 찾을 수 없습니다');
    if (comment.authorId !== req.user.salespersonId) throw new AppError(403, ErrorCode.FORBIDDEN, '본인 댓글만 삭제할 수 있습니다');

    await prisma.comment.delete({ where: { id: commentId } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

// Plan 댓글 라우터 (/plans/:planId/comments)
export const planCommentsRouter = Router({ mergeParams: true });
planCommentsRouter.use(authenticate);

// POST /plans/:planId/comments
planCommentsRouter.post('/', async (req, res, next) => {
  try {
    const planId = parseInt((req.params as Record<string, string>).planId, 10);
    if (!planId || planId < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '익일계획 항목을 찾을 수 없습니다');

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { report: { select: { salespersonId: true } } },
    });
    if (!plan) throw new AppError(404, ErrorCode.NOT_FOUND, '익일계획 항목을 찾을 수 없습니다');

    await requireDirectManager(req.user.salespersonId, plan.report.salespersonId);

    const { content } = req.body as { content?: string };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글 내용을 입력하세요');
    if (content.length > 1000) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글은 최대 1000자입니다');

    const created = await prisma.comment.create({
      data: { planId, authorId: req.user.salespersonId, content: content.trim() },
    });

    sendCreated(res, { commentId: created.id });
  } catch (err) {
    next(err);
  }
});

// PUT /plans/:planId/comments/:commentId
planCommentsRouter.put('/:commentId', async (req, res, next) => {
  try {
    const planId = parseInt((req.params as Record<string, string>).planId, 10);
    const commentId = parseInt(req.params.commentId, 10);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.planId !== planId) throw new AppError(404, ErrorCode.NOT_FOUND, '댓글을 찾을 수 없습니다');
    if (comment.authorId !== req.user.salespersonId) throw new AppError(403, ErrorCode.FORBIDDEN, '본인 댓글만 수정할 수 있습니다');

    const { content } = req.body as { content?: string };
    if (!content?.trim()) throw new AppError(400, ErrorCode.VALIDATION_ERROR, '댓글 내용을 입력하세요');

    await prisma.comment.update({ where: { id: commentId }, data: { content: content.trim() } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

// DELETE /plans/:planId/comments/:commentId
planCommentsRouter.delete('/:commentId', async (req, res, next) => {
  try {
    const planId = parseInt((req.params as Record<string, string>).planId, 10);
    const commentId = parseInt(req.params.commentId, 10);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.planId !== planId) throw new AppError(404, ErrorCode.NOT_FOUND, '댓글을 찾을 수 없습니다');
    if (comment.authorId !== req.user.salespersonId) throw new AppError(403, ErrorCode.FORBIDDEN, '본인 댓글만 삭제할 수 있습니다');

    await prisma.comment.delete({ where: { id: commentId } });
    sendSuccess(res, null);
  } catch (err) {
    next(err);
  }
});

export default router;
