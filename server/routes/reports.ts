import { Router } from 'express';
import { ReportStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../lib/errors.js';
import { sendSuccess, sendCreated, sendPaginated, parsePagination, buildPagination } from '../lib/response.js';
import { authenticate } from '../middleware/authenticate.js';
import { formatReportDetail } from '../lib/reportHelpers.js';

const router = Router();
router.use(authenticate);

// ISO 문자열 대신 로컬 날짜(YYYY-MM-DD)를 반환 — UTC 변환으로 인한 날짜 하루 밀림 방지
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const REPORT_INCLUDE = {
  salesperson: true,
  visitRecords: { include: { customer: true } },
  problems: { include: { comments: { include: { author: { select: { id: true, name: true } } } } }, orderBy: { seq: 'asc' as const } },
  plans: { include: { comments: { include: { author: { select: { id: true, name: true } } } } }, orderBy: { seq: 'asc' as const } },
} as const;

// 직속 상급자 여부 확인
async function isDirectManager(managerId: number, salespersonId: number) {
  const sp = await prisma.salesperson.findUnique({ where: { id: salespersonId } });
  return sp?.managerId === managerId;
}

// GET /reports — 내 보고서 목록
router.get('/', async (req, res, next) => {
  try {
    const { page, size, skip } = parsePagination(req.query as Record<string, unknown>);
    const { startDate, endDate, status } = req.query as Record<string, string | undefined>;

    const validStatuses = ['DRAFT', 'SUBMITTED', 'CONFIRMED'];
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where = {
      salespersonId: req.user.salespersonId,
      ...(Object.keys(dateFilter).length > 0 ? { reportDate: dateFilter } : {}),
      ...(status && validStatuses.includes(status) ? { status: status as ReportStatus } : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.dailyReport.findMany({
        where,
        skip,
        take: size,
        include: { _count: { select: { visitRecords: true } } },
        orderBy: { reportDate: 'desc' },
      }),
      prisma.dailyReport.count({ where }),
    ]);

    sendPaginated(res, items.map(r => ({
      reportId: r.id,
      reportDate: localDateStr(r.reportDate),
      status: r.status,
      visitCount: r._count.visitRecords,
      submittedAt: r.submittedAt?.toISOString().slice(0, 19) ?? null,
      confirmedAt: r.confirmedAt?.toISOString().slice(0, 19) ?? null,
      updatedAt: r.updatedAt.toISOString().slice(0, 19),
    })), buildPagination(page, size, totalCount));
  } catch (err) {
    next(err);
  }
});

// GET /reports/team — 팀 보고서 목록 (상급자 전용)
router.get('/team', async (req, res, next) => {
  try {
    if (!req.user.isManager) {
      throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
    }

    const { page, size, skip } = parsePagination(req.query as Record<string, unknown>);
    const { reportDate, salespersonId, status } = req.query as Record<string, string | undefined>;

    const targetDate = reportDate ? new Date(reportDate) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 직속 부하 목록
    const subordinates = await prisma.salesperson.findMany({
      where: {
        managerId: req.user.salespersonId,
        ...(salespersonId ? { id: parseInt(salespersonId, 10) } : {}),
        isActive: true,
      },
    });

    const totalCount = subordinates.length;
    const paged = subordinates.slice(skip, skip + size);

    // 해당 날짜의 보고서 조회
    const reports = await prisma.dailyReport.findMany({
      where: {
        salespersonId: { in: paged.map(s => s.id) },
        reportDate: targetDate,
      },
      include: {
        _count: { select: { visitRecords: true } },
        problems: { include: { _count: { select: { comments: true } } } },
        plans: { include: { _count: { select: { comments: true } } } },
      },
    });

    const reportMap = new Map(reports.map(r => [r.salespersonId, r]));

    const items = paged
      .filter(s => {
        if (!status || status === 'NONE') return !reportMap.has(s.id);
        const r = reportMap.get(s.id);
        if (!status || status === 'ALL') return true;
        if (!r) return status === 'NONE';
        return r.status === status;
      })
      .map(s => {
        const r = reportMap.get(s.id);
        const commentCount = r
          ? r.problems.reduce((a, p) => a + p._count.comments, 0) +
            r.plans.reduce((a, p) => a + p._count.comments, 0)
          : 0;
        return {
          reportId: r?.id ?? null,
          reportDate: localDateStr(targetDate),
          salesperson: { salespersonId: s.id, name: s.name, department: s.department },
          status: r?.status ?? 'NONE',
          visitCount: r?._count.visitRecords ?? 0,
          commentCount,
          submittedAt: r?.submittedAt?.toISOString().slice(0, 19) ?? null,
        };
      });

    // status 필터 미적용 시 전체 포함
    const filteredItems = status && status !== 'ALL'
      ? paged.map(s => {
          const r = reportMap.get(s.id);
          const curStatus = r?.status ?? 'NONE';
          if (curStatus !== status) return null;
          const commentCount = r
            ? r.problems.reduce((a, p) => a + p._count.comments, 0) +
              r.plans.reduce((a, p) => a + p._count.comments, 0)
            : 0;
          return {
            reportId: r?.id ?? null,
            reportDate: localDateStr(targetDate),
            salesperson: { salespersonId: s.id, name: s.name, department: s.department },
            status: curStatus,
            visitCount: r?._count.visitRecords ?? 0,
            commentCount,
            submittedAt: r?.submittedAt?.toISOString().slice(0, 19) ?? null,
          };
        }).filter(Boolean)
      : paged.map(s => {
          const r = reportMap.get(s.id);
          const commentCount = r
            ? r.problems.reduce((a, p) => a + p._count.comments, 0) +
              r.plans.reduce((a, p) => a + p._count.comments, 0)
            : 0;
          return {
            reportId: r?.id ?? null,
            reportDate: localDateStr(targetDate),
            salesperson: { salespersonId: s.id, name: s.name, department: s.department },
            status: r?.status ?? 'NONE',
            visitCount: r?._count.visitRecords ?? 0,
            commentCount,
            submittedAt: r?.submittedAt?.toISOString().slice(0, 19) ?? null,
          };
        });

    sendPaginated(res, filteredItems, buildPagination(page, size, totalCount));
  } catch (err) {
    next(err);
  }
});

// GET /reports/:id — 상세 조회
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) throw new AppError(404, ErrorCode.NOT_FOUND, '보고서를 찾을 수 없습니다');

    const report = await prisma.dailyReport.findUnique({ where: { id }, include: REPORT_INCLUDE });
    if (!report) throw new AppError(404, ErrorCode.NOT_FOUND, '보고서를 찾을 수 없습니다');

    // 본인 또는 직속 상급자만 조회 가능
    if (report.salespersonId !== req.user.salespersonId) {
      const isManager = await isDirectManager(req.user.salespersonId, report.salespersonId);
      if (!isManager) throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
    }

    sendSuccess(res, formatReportDetail(report));
  } catch (err) {
    next(err);
  }
});

// POST /reports — 보고서 생성
router.post('/', async (req, res, next) => {
  try {
    const { reportDate } = req.body as { reportDate?: string };
    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, '보고일자 형식이 올바르지 않습니다 (YYYY-MM-DD)');
    }

    const date = new Date(reportDate);

    // 중복 확인
    const existing = await prisma.dailyReport.findUnique({
      where: { salespersonId_reportDate: { salespersonId: req.user.salespersonId, reportDate: date } },
    });
    if (existing) {
      throw new AppError(409, ErrorCode.REPORT_ALREADY_EXISTS, '해당 날짜의 보고서가 이미 존재합니다', { reportId: existing.id });
    }

    const created = await prisma.dailyReport.create({
      data: { salespersonId: req.user.salespersonId, reportDate: date, status: ReportStatus.DRAFT },
    });

    sendCreated(res, { reportId: created.id });
  } catch (err) {
    next(err);
  }
});

// POST /reports/:id/submit — 제출
router.post('/:id/submit', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: { _count: { select: { visitRecords: true } } },
    });

    if (!report) throw new AppError(404, ErrorCode.NOT_FOUND, '보고서를 찾을 수 없습니다');
    if (report.salespersonId !== req.user.salespersonId) throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
    if (report.status !== ReportStatus.DRAFT) throw new AppError(422, ErrorCode.REPORT_STATUS_INVALID, '현재 상태에서는 제출할 수 없습니다');
    if (report._count.visitRecords === 0) throw new AppError(422, ErrorCode.REPORT_VISIT_REQUIRED, '방문기록을 1건 이상 입력해야 제출할 수 있습니다');

    const updated = await prisma.dailyReport.update({
      where: { id },
      data: { status: ReportStatus.SUBMITTED, submittedAt: new Date() },
    });

    sendSuccess(res, {
      reportId: updated.id,
      status: updated.status,
      submittedAt: updated.submittedAt!.toISOString().slice(0, 19),
    });
  } catch (err) {
    next(err);
  }
});

// POST /reports/:id/confirm — 확인처리
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const report = await prisma.dailyReport.findUnique({ where: { id } });

    if (!report) throw new AppError(404, ErrorCode.NOT_FOUND, '보고서를 찾을 수 없습니다');

    // 직속 상급자만 확인처리 가능
    const isManager = await isDirectManager(req.user.salespersonId, report.salespersonId);
    if (!isManager) throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');

    if (report.status !== ReportStatus.SUBMITTED) {
      throw new AppError(422, ErrorCode.REPORT_STATUS_INVALID, '현재 상태에서는 확인처리할 수 없습니다');
    }

    const updated = await prisma.dailyReport.update({
      where: { id },
      data: { status: ReportStatus.CONFIRMED, confirmedAt: new Date() },
    });

    sendSuccess(res, {
      reportId: updated.id,
      status: updated.status,
      confirmedAt: updated.confirmedAt!.toISOString().slice(0, 19),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
