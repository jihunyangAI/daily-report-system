/**
 * TC-RPT-001 ~ TC-RPT-014 일일보고 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { ReportStatus } from '@prisma/client';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const managerToken = signToken({ salespersonId: 2, email: 'manager@test.com', isManager: true });
const salesAToken = signToken({ salespersonId: 3, email: 'sales-a@test.com', isManager: false });
const salesBToken = signToken({ salespersonId: 4, email: 'sales-b@test.com', isManager: false });

const today = new Date(); today.setHours(0, 0, 0, 0);

const draftReport = { id: 901, salespersonId: 3, reportDate: today, status: ReportStatus.DRAFT, submittedAt: null, confirmedAt: null, createdAt: new Date(), updatedAt: new Date() };
const submittedReport = { ...draftReport, id: 902, status: ReportStatus.SUBMITTED, submittedAt: new Date() };
const confirmedReport = { ...draftReport, id: 903, status: ReportStatus.CONFIRMED, submittedAt: new Date(), confirmedAt: new Date() };

const fullReportDetail = {
  ...draftReport,
  salesperson: { id: 3, name: '영업사원A', department: '영업1팀', rank: '대리', managerId: 2 },
  visitRecords: [{ id: 201, reportId: 901, customerId: 1, visitTime: '10:00', visitPurpose: '제품 데모', visitContent: '소개', nextVisitDate: null, customer: { id: 1, companyName: '(주)A산업', contactName: '김대리' } }],
  problems: [{ id: 301, reportId: 901, seq: 1, content: 'A사 검토', createdAt: new Date(), comments: [] }],
  plans: [{ id: 501, reportId: 901, seq: 1, content: 'C사 방문', createdAt: new Date(), comments: [] }],
};

describe('TC-RPT 일일보고', () => {
  beforeEach(() => vi.clearAllMocks());

  // TC-RPT-001: 내 보고서 목록
  it('TC-RPT-001: 내 보고서 목록 조회 (본인만)', async () => {
    mockPrismaClient.dailyReport.findMany.mockResolvedValue([{ ...draftReport, _count: { visitRecords: 1 } }]);
    mockPrismaClient.dailyReport.count.mockResolvedValue(1);

    const res = await request(app).get('/api/reports').set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].reportId).toBe(901);
  });

  // TC-RPT-002: 날짜 필터
  it('TC-RPT-002: 날짜 범위 필터 조회', async () => {
    mockPrismaClient.dailyReport.findMany.mockResolvedValue([]);
    mockPrismaClient.dailyReport.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/reports?startDate=2026-05-01&endDate=2026-05-14')
      .set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
    const where = mockPrismaClient.dailyReport.findMany.mock.calls[0][0].where;
    expect(where.reportDate).toHaveProperty('gte');
    expect(where.reportDate).toHaveProperty('lte');
  });

  // TC-RPT-003: 팀 보고서 (상급자)
  it('TC-RPT-003: 팀 보고서 목록 (미작성 사원 NONE 포함)', async () => {
    mockPrismaClient.salesperson.findMany.mockResolvedValue([
      { id: 3, name: '영업사원A', department: '영업1팀', managerId: 2 },
      { id: 4, name: '영업사원B', department: '영업1팀', managerId: 2 },
    ]);
    mockPrismaClient.dailyReport.findMany.mockResolvedValue([
      { ...submittedReport, _count: { visitRecords: 1 }, problems: [], plans: [] },
    ]);

    const res = await request(app).get('/api/reports/team').set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    const statuses = res.body.data.items.map((i: { status: string }) => i.status);
    expect(statuses).toContain('NONE');
    expect(statuses).toContain(ReportStatus.SUBMITTED);
  });

  // TC-RPT-004: 일반 사용자 팀 목록 → 403
  it('TC-RPT-004: 일반 사용자 팀 목록 접근 → 403', async () => {
    const res = await request(app).get('/api/reports/team').set('Authorization', `Bearer ${salesAToken}`);
    expect(res.status).toBe(403);
  });

  // TC-RPT-005: 보고서 생성
  it('TC-RPT-005: 보고서 생성 성공 → 201 DRAFT', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(null);
    mockPrismaClient.dailyReport.create.mockResolvedValue({ id: 901 });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ reportDate: '2026-05-14' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('reportId');
  });

  // TC-RPT-006: 중복 생성 → 409
  it('TC-RPT-006: 동일 날짜 중복 생성 → 409 REPORT_ALREADY_EXISTS', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ reportDate: '2026-05-14' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REPORT_ALREADY_EXISTS');
    expect(res.body.error.data.reportId).toBe(901);
  });

  // TC-RPT-007: 상세 조회
  it('TC-RPT-007: 보고서 상세 조회 (visits/problems/plans/comments 포함)', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(fullReportDetail);

    const res = await request(app).get('/api/reports/901').set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('visits');
    expect(res.body.data).toHaveProperty('problems');
    expect(res.body.data).toHaveProperty('plans');
    expect(res.body.data.visits[0].visitId).toBe(201);
  });

  // TC-RPT-008: 타인 보고서 조회 → 403
  it('TC-RPT-008: 직속 관계 없는 타인 보고서 조회 → 403', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(fullReportDetail);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ id: 3, managerId: 99 }); // 다른 상급자

    const res = await request(app).get('/api/reports/901').set('Authorization', `Bearer ${salesBToken}`);

    expect(res.status).toBe(403);
  });

  // TC-RPT-009: 제출 성공
  it('TC-RPT-009: 방문기록 있을 때 제출 성공 → SUBMITTED', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue({ ...draftReport, _count: { visitRecords: 1 } });
    mockPrismaClient.dailyReport.update.mockResolvedValue({ ...submittedReport });

    const res = await request(app).post('/api/reports/901/submit').set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ReportStatus.SUBMITTED);
  });

  // TC-RPT-010: 방문기록 0건 제출 → 422
  it('TC-RPT-010: 방문기록 0건 제출 → 422 REPORT_VISIT_REQUIRED', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue({ ...draftReport, _count: { visitRecords: 0 } });

    const res = await request(app).post('/api/reports/901/submit').set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REPORT_VISIT_REQUIRED');
  });

  // TC-RPT-011: SUBMITTED 상태 방문기록 추가 시도 → 403 (visit 라우터에서 처리, 여기선 상태 확인)
  it('TC-RPT-011: 이미 제출된 보고서 재제출 → 422 REPORT_STATUS_INVALID', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue({ ...submittedReport, _count: { visitRecords: 1 } });

    const res = await request(app).post('/api/reports/902/submit').set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REPORT_STATUS_INVALID');
  });

  // TC-RPT-012: 확인처리 성공
  it('TC-RPT-012: 상급자 확인처리 성공 → CONFIRMED', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(submittedReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ id: 3, managerId: 2 }); // 영업사원A의 상급자 = 팀장(id:2)
    mockPrismaClient.dailyReport.update.mockResolvedValue({ ...confirmedReport });

    const res = await request(app).post('/api/reports/902/confirm').set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ReportStatus.CONFIRMED);
  });

  // TC-RPT-013: DRAFT 확인처리 → 422
  it('TC-RPT-013: DRAFT 상태 확인처리 → 422 REPORT_STATUS_INVALID', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ id: 3, managerId: 2 });

    const res = await request(app).post('/api/reports/901/confirm').set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REPORT_STATUS_INVALID');
  });

  // TC-RPT-014: 영업사원 확인처리 → 403
  it('TC-RPT-014: 영업사원이 본인 보고서 확인처리 시도 → 403', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(submittedReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ id: 3, managerId: 2 }); // 본인(id:3)의 managerId는 2이므로 manager(id:3)!=2

    const res = await request(app).post('/api/reports/902/confirm').set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(403);
  });
});
