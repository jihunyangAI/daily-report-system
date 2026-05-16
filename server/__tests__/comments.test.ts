/**
 * TC-CMT-001 ~ TC-CMT-010 댓글 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const managerToken = signToken({ salespersonId: 2, email: 'manager@test.com', isManager: true });
const salesAToken  = signToken({ salespersonId: 3, email: 'sales-a@test.com', isManager: false });
const otherMgrToken = signToken({ salespersonId: 5, email: 'other@test.com', isManager: true });

// 영업사원A(id:3)의 직속 상급자는 팀장(id:2)
const salesARecord = { id: 3, managerId: 2 };
// 영업사원B(id:4)의 직속 상급자도 팀장(id:2)
const salesBRecord = { id: 4, managerId: 2 };

const problemWithReport = { id: 301, reportId: 901, seq: 1, content: '검토', createdAt: new Date(), report: { salespersonId: 3 } };
const planWithReport    = { id: 501, reportId: 901, seq: 1, content: '방문', createdAt: new Date(), report: { salespersonId: 3 } };
const comment = { id: 401, problemId: 301, planId: null, authorId: 2, content: '확인 바랍니다', createdAt: new Date(), updatedAt: new Date() };

describe('TC-CMT 댓글', () => {
  beforeEach(() => vi.clearAllMocks());

  // TC-CMT-001: 직속 상급자 Problem 댓글 추가
  it('TC-CMT-001: 직속 상급자 Problem 댓글 추가 → 201', async () => {
    mockPrismaClient.problem.findUnique.mockResolvedValue(problemWithReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesARecord); // managerId:2 = 팀장
    mockPrismaClient.comment.create.mockResolvedValue({ id: 401 });

    const res = await request(app)
      .post('/api/problems/301/comments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '법무팀 확인 바랍니다' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('commentId');
  });

  // TC-CMT-002: Plan 댓글 추가
  it('TC-CMT-002: 직속 상급자 Plan 댓글 추가 → 201', async () => {
    mockPrismaClient.plan.findUnique.mockResolvedValue(planWithReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesARecord);
    mockPrismaClient.comment.create.mockResolvedValue({ id: 402 });

    const res = await request(app)
      .post('/api/plans/501/comments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '제안서 지참하세요' });

    expect(res.status).toBe(201);
  });

  // TC-CMT-003: 영업사원 댓글 추가 → 403
  it('TC-CMT-003: 영업사원 댓글 추가 시도 → 403', async () => {
    mockPrismaClient.problem.findUnique.mockResolvedValue(problemWithReport);
    // salesA(id:3)는 salesA(id:3)의 직속 상급자가 아님
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesARecord); // managerId:2 ≠ salesAToken(id:3)

    const res = await request(app)
      .post('/api/problems/301/comments')
      .set('Authorization', `Bearer ${salesAToken}`) // 영업사원
      .send({ content: '내가 댓글 작성' });

    expect(res.status).toBe(403);
  });

  // TC-CMT-004: 타팀 상급자 → 403
  it('TC-CMT-004: 타팀 상급자 댓글 추가 → 403', async () => {
    mockPrismaClient.problem.findUnique.mockResolvedValue(problemWithReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesARecord); // managerId:2 ≠ otherMgrToken(id:5)

    const res = await request(app)
      .post('/api/problems/301/comments')
      .set('Authorization', `Bearer ${otherMgrToken}`)
      .send({ content: '타팀 댓글' });

    expect(res.status).toBe(403);
  });

  // TC-CMT-005: 복수 댓글 추가
  it('TC-CMT-005: 동일 Problem 댓글 복수 추가', async () => {
    mockPrismaClient.problem.findUnique.mockResolvedValue(problemWithReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesARecord);
    mockPrismaClient.comment.create.mockResolvedValueOnce({ id: 401 }).mockResolvedValueOnce({ id: 402 }).mockResolvedValueOnce({ id: 403 });

    const responses = await Promise.all([
      request(app).post('/api/problems/301/comments').set('Authorization', `Bearer ${managerToken}`).send({ content: '댓글1' }),
      request(app).post('/api/problems/301/comments').set('Authorization', `Bearer ${managerToken}`).send({ content: '댓글2' }),
      request(app).post('/api/problems/301/comments').set('Authorization', `Bearer ${managerToken}`).send({ content: '댓글3' }),
    ]);

    responses.forEach(r => expect(r.status).toBe(201));
  });

  // TC-CMT-006: 댓글 수정 성공
  it('TC-CMT-006: 댓글 작성자 수정 성공, updatedAt 갱신', async () => {
    mockPrismaClient.comment.findUnique.mockResolvedValue(comment); // authorId:2 = 팀장
    mockPrismaClient.comment.update.mockResolvedValue({ ...comment, content: '수정된 내용', updatedAt: new Date() });

    const res = await request(app)
      .put('/api/problems/301/comments/401')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '수정된 내용 (긴급)' });

    expect(res.status).toBe(200);
    expect(mockPrismaClient.comment.update).toHaveBeenCalledOnce();
  });

  // TC-CMT-007: 타인 댓글 수정 → 403
  it('TC-CMT-007: 타인 댓글 수정 → 403 FORBIDDEN', async () => {
    mockPrismaClient.comment.findUnique.mockResolvedValue(comment); // authorId:2

    const res = await request(app)
      .put('/api/problems/301/comments/401')
      .set('Authorization', `Bearer ${salesAToken}`) // id:3 ≠ authorId:2
      .send({ content: '무단 수정' });

    expect(res.status).toBe(403);
  });

  // TC-CMT-008: 댓글 삭제 성공
  it('TC-CMT-008: 댓글 작성자 삭제 성공', async () => {
    mockPrismaClient.comment.findUnique.mockResolvedValue(comment);
    mockPrismaClient.comment.delete.mockResolvedValue(comment);

    const res = await request(app)
      .delete('/api/problems/301/comments/401')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
  });

  // TC-CMT-009: 내용 빈 문자열 → 400
  it('TC-CMT-009: content 빈 문자열 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.problem.findUnique.mockResolvedValue(problemWithReport);
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesARecord);

    const res = await request(app)
      .post('/api/problems/301/comments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-CMT-010: 없는 problemId → 404
  it('TC-CMT-010: 없는 problemId에 댓글 추가 → 404 NOT_FOUND', async () => {
    mockPrismaClient.problem.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/problems/99999/comments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '내용' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
