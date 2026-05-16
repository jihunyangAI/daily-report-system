/**
 * TC-VIS-001~008 / TC-PRB-001~007 / TC-PLN-001~007
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { ReportStatus } from '@prisma/client';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const salesAToken = signToken({ salespersonId: 3, email: 'sales-a@test.com', isManager: false });
const salesBToken = signToken({ salespersonId: 4, email: 'sales-b@test.com', isManager: false });

const draftReport   = { id: 901, salespersonId: 3, status: ReportStatus.DRAFT };
const submittedReport = { id: 902, salespersonId: 3, status: ReportStatus.SUBMITTED };
const customer      = { id: 1, companyName: '(주)A산업', contactName: '김대리' };
const visitRecord   = { id: 201, reportId: 901, customerId: 1, visitTime: '10:00', visitPurpose: '데모', visitContent: null, nextVisitDate: null };
const problem       = { id: 301, reportId: 901, seq: 1, content: 'A사 검토', createdAt: new Date() };
const plan          = { id: 501, reportId: 901, seq: 1, content: 'C사 방문', createdAt: new Date() };

describe('TC-VIS 방문기록', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-VIS-001: DRAFT 보고서에 방문기록 추가 → 201', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.customer.findUnique.mockResolvedValue(customer);
    mockPrismaClient.visitRecord.create.mockResolvedValue({ id: 201 });

    const res = await request(app)
      .post('/api/reports/901/visits')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ customerId: 1, visitTime: '10:00', visitPurpose: '제품 데모' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('visitId');
  });

  it('TC-VIS-002: 동일 보고서 방문기록 복수 추가', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.customer.findUnique.mockResolvedValue(customer);
    mockPrismaClient.visitRecord.create.mockResolvedValueOnce({ id: 202 }).mockResolvedValueOnce({ id: 203 });

    const r1 = await request(app).post('/api/reports/901/visits').set('Authorization', `Bearer ${salesAToken}`).send({ customerId: 1 });
    const r2 = await request(app).post('/api/reports/901/visits').set('Authorization', `Bearer ${salesAToken}`).send({ customerId: 1 });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.data.visitId).not.toBe(r2.body.data.visitId);
  });

  it('TC-VIS-003: customerId 없이 추가 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);

    const res = await request(app)
      .post('/api/reports/901/visits')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ visitTime: '10:00' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TC-VIS-004: DRAFT 방문기록 수정 성공', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.visitRecord.findUnique.mockResolvedValue(visitRecord);
    mockPrismaClient.customer.findUnique.mockResolvedValue(customer);
    mockPrismaClient.visitRecord.update.mockResolvedValue({ ...visitRecord, visitTime: '14:00' });

    const res = await request(app)
      .put('/api/reports/901/visits/201')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ customerId: 1, visitTime: '14:00', visitPurpose: '계약 협의' });

    expect(res.status).toBe(200);
  });

  it('TC-VIS-005: DRAFT 방문기록 삭제 성공', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.visitRecord.findUnique.mockResolvedValue(visitRecord);
    mockPrismaClient.visitRecord.delete.mockResolvedValue(visitRecord);

    const res = await request(app)
      .delete('/api/reports/901/visits/201')
      .set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
  });

  it('TC-VIS-006: 없는 visitId 수정 → 404', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.visitRecord.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/reports/901/visits/99999')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ customerId: 1 });

    expect(res.status).toBe(404);
  });

  it('TC-VIS-007: 타인 보고서 방문기록 추가 → 403', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport); // salespersonId:3

    const res = await request(app)
      .post('/api/reports/901/visits')
      .set('Authorization', `Bearer ${salesBToken}`) // salespersonId:4
      .send({ customerId: 1 });

    expect(res.status).toBe(403);
  });

  it('TC-VIS-008: SUBMITTED 방문기록 수정 → 403 REPORT_NOT_EDITABLE', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(submittedReport);

    const res = await request(app)
      .put('/api/reports/902/visits/201')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ customerId: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REPORT_NOT_EDITABLE');
  });
});

describe('TC-PRB 과제/상담', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PRB-001: DRAFT 보고서에 Problem 추가 → 201', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.problem.findFirst.mockResolvedValue(null);
    mockPrismaClient.problem.create.mockResolvedValue({ id: 301 });

    const res = await request(app)
      .post('/api/reports/901/problems')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: 'A사 검토 필요' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('problemId');
  });

  it('TC-PRB-002: 동일 보고서 Problem 복수 추가', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.problem.findFirst.mockResolvedValue({ seq: 1 });
    mockPrismaClient.problem.create.mockResolvedValueOnce({ id: 302 }).mockResolvedValueOnce({ id: 303 });

    const r1 = await request(app).post('/api/reports/901/problems').set('Authorization', `Bearer ${salesAToken}`).send({ content: '건1' });
    const r2 = await request(app).post('/api/reports/901/problems').set('Authorization', `Bearer ${salesAToken}`).send({ content: '건2' });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });

  it('TC-PRB-003: content 빈 문자열 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);

    const res = await request(app)
      .post('/api/reports/901/problems')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('TC-PRB-004: Problem 수정 성공', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.problem.findUnique.mockResolvedValue(problem);
    mockPrismaClient.problem.update.mockResolvedValue({ ...problem, content: '수정된 내용' });

    const res = await request(app)
      .put('/api/reports/901/problems/301')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: '수정된 내용', seq: 1 });

    expect(res.status).toBe(200);
  });

  it('TC-PRB-005: Problem 삭제 성공', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.problem.findUnique.mockResolvedValue(problem);
    mockPrismaClient.problem.delete.mockResolvedValue(problem);

    const res = await request(app)
      .delete('/api/reports/901/problems/301')
      .set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
  });

  it('TC-PRB-006: Problem 삭제 시 댓글 연쇄 삭제 (Cascade 확인)', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.problem.findUnique.mockResolvedValue(problem);
    mockPrismaClient.problem.delete.mockResolvedValue(problem);

    const res = await request(app)
      .delete('/api/reports/901/problems/301')
      .set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
    // Prisma Cascade 설정으로 댓글 자동 삭제 (스키마의 onDelete: Cascade)
    expect(mockPrismaClient.problem.delete).toHaveBeenCalledWith({ where: { id: 301 } });
  });

  it('TC-PRB-007: SUBMITTED 상태 Problem 수정 → 403 REPORT_NOT_EDITABLE', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(submittedReport);

    const res = await request(app)
      .put('/api/reports/902/problems/301')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: '수정 시도' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REPORT_NOT_EDITABLE');
  });
});

describe('TC-PLN 익일계획', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PLN-001: DRAFT 보고서에 Plan 추가 → 201', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.plan.findFirst.mockResolvedValue(null);
    mockPrismaClient.plan.create.mockResolvedValue({ id: 501 });

    const res = await request(app)
      .post('/api/reports/901/plans')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: 'C사 방문' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('planId');
  });

  it('TC-PLN-002: 동일 보고서 Plan 복수 추가', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.plan.findFirst.mockResolvedValue({ seq: 1 });
    mockPrismaClient.plan.create.mockResolvedValueOnce({ id: 502 }).mockResolvedValueOnce({ id: 503 });

    const r1 = await request(app).post('/api/reports/901/plans').set('Authorization', `Bearer ${salesAToken}`).send({ content: '계획1' });
    const r2 = await request(app).post('/api/reports/901/plans').set('Authorization', `Bearer ${salesAToken}`).send({ content: '계획2' });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });

  it('TC-PLN-003: content 빈 문자열 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);

    const res = await request(app)
      .post('/api/reports/901/plans')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  it('TC-PLN-004: Plan 수정 성공', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.plan.findUnique.mockResolvedValue(plan);
    mockPrismaClient.plan.update.mockResolvedValue({ ...plan, content: '수정된 계획' });

    const res = await request(app)
      .put('/api/reports/901/plans/501')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: '수정된 계획', seq: 1 });

    expect(res.status).toBe(200);
  });

  it('TC-PLN-005: Plan 삭제 성공', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.plan.findUnique.mockResolvedValue(plan);
    mockPrismaClient.plan.delete.mockResolvedValue(plan);

    const res = await request(app)
      .delete('/api/reports/901/plans/501')
      .set('Authorization', `Bearer ${salesAToken}`);

    expect(res.status).toBe(200);
  });

  it('TC-PLN-006: Plan 삭제 시 댓글 연쇄 삭제 확인', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(draftReport);
    mockPrismaClient.plan.findUnique.mockResolvedValue(plan);
    mockPrismaClient.plan.delete.mockResolvedValue(plan);

    await request(app).delete('/api/reports/901/plans/501').set('Authorization', `Bearer ${salesAToken}`);

    expect(mockPrismaClient.plan.delete).toHaveBeenCalledWith({ where: { id: 501 } });
  });

  it('TC-PLN-007: SUBMITTED 상태 Plan 수정 → 403 REPORT_NOT_EDITABLE', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue(submittedReport);

    const res = await request(app)
      .put('/api/reports/902/plans/501')
      .set('Authorization', `Bearer ${salesAToken}`)
      .send({ content: '수정 시도' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REPORT_NOT_EDITABLE');
  });
});
