/**
 * 커버리지 향상을 위한 추가 테스트
 * - health 엔드포인트
 * - Plan 댓글 수정/삭제
 * - Auth /me 추가 경로
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const managerToken = signToken({ salespersonId: 2, email: 'manager@test.com', isManager: true });

const HASHED_PW = await bcrypt.hash('Test1234!', 10);
const managerRecord = { id: 2, name: '팀장', email: 'manager@test.com', passwordHash: HASHED_PW, department: '영업1팀', rank: '팀장', managerId: 1, hireDate: new Date(), isActive: true, createdAt: new Date(), updatedAt: new Date() };
const planComment = { id: 402, problemId: null, planId: 501, authorId: 2, content: '제안서 준비', createdAt: new Date(), updatedAt: new Date() };

describe('추가 커버리지 테스트', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/auth/me → 200 with full data', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ ...managerRecord, manager: { id: 1, name: '관리자' } });
    mockPrismaClient.salesperson.count.mockResolvedValue(2);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('isManager', true);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('Plan 댓글 수정 성공', async () => {
    mockPrismaClient.comment.findUnique.mockResolvedValue(planComment);
    mockPrismaClient.comment.update.mockResolvedValue({ ...planComment, content: '수정된 댓글' });

    const res = await request(app)
      .put('/api/plans/501/comments/402')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '수정된 댓글 내용' });

    expect(res.status).toBe(200);
  });

  it('Plan 댓글 삭제 성공', async () => {
    mockPrismaClient.comment.findUnique.mockResolvedValue(planComment);
    mockPrismaClient.comment.delete.mockResolvedValue(planComment);

    const res = await request(app)
      .delete('/api/plans/501/comments/402')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
  });

  it('Problem 댓글 수정 - 타인 댓글 → 403', async () => {
    mockPrismaClient.comment.findUnique.mockResolvedValue({ ...planComment, problemId: 301, planId: null, authorId: 99 });

    const res = await request(app)
      .put('/api/problems/301/comments/402')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ content: '무단 수정' });

    expect(res.status).toBe(403);
  });

  it('고객 목록 업종 필터 조회', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([]);
    mockPrismaClient.customer.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/customers?industry=제조')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    const where = mockPrismaClient.customer.findMany.mock.calls[0][0].where;
    expect(where.industry).toBe('제조');
  });

  it('일일보고 생성 - 날짜 미입력 → 400', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('방문기록 - 잘못된 JSON body → 400', async () => {
    const res = await request(app)
      .post('/api/reports/901/visits')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(res.status).toBe(400);
  });
});
