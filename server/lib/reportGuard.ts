// 보고서 DRAFT 상태 + 본인 소유 체크 공통 헬퍼
import { ReportStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { AppError, ErrorCode } from './errors.js';

export async function guardDraftReport(reportId: number, salespersonId: number) {
  const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError(404, ErrorCode.NOT_FOUND, '보고서를 찾을 수 없습니다');
  if (report.salespersonId !== salespersonId) throw new AppError(403, ErrorCode.FORBIDDEN, '접근 권한이 없습니다');
  if (report.status !== ReportStatus.DRAFT) throw new AppError(403, ErrorCode.REPORT_NOT_EDITABLE, 'DRAFT 상태일 때만 수정할 수 있습니다');
  return report;
}
