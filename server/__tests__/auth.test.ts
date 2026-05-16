/**
 * TC-AUTH-001 ~ TC-AUTH-008 인증 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import app from '../app.js';

const HASHED_PW = await bcrypt.hash('Test1234!', 10);

const activeSalesperson = {
  id: 1,
  name: '영업사원A',
  email: 'sales-a@test.com',
  passwordHash: HASHED_PW,
  department: '영업1팀',
  rank: '대리',
  isActive: true,
  managerId: 2,
  hireDate: new Date('2023-03-02'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const inactiveSalesperson = { ...activeSalesperson, id: 6, email: 'inactive@test.com', isActive: false };

describe('TC-AUTH 인증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-AUTH-001: 정상 로그인
  it('TC-AUTH-001: 유효한 계정으로 로그인 성공', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(activeSalesperson);
    mockPrismaClient.salesperson.count.mockResolvedValue(0);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales-a@test.com', password: 'Test1234!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.tokenType).toBe('Bearer');
    expect(res.body.data.salesperson.name).toBe('영업사원A');
  });

  // TC-AUTH-002: 비밀번호 불일치
  it('TC-AUTH-002: 잘못된 비밀번호로 로그인 실패 → 401', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(activeSalesperson);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales-a@test.com', password: 'WrongPass!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  // TC-AUTH-003: 미등록 이메일
  it('TC-AUTH-003: 미등록 이메일 로그인 실패 → 401', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notexist@test.com', password: 'Test1234!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  // TC-AUTH-004: 비활성 계정
  it('TC-AUTH-004: 비활성 계정 로그인 → 401 AUTH_INACTIVE_ACCOUNT', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(inactiveSalesperson);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@test.com', password: 'Test1234!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INACTIVE_ACCOUNT');
  });

  // TC-AUTH-005: 이메일 미입력
  it('TC-AUTH-005: 이메일 미입력 → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: 'Test1234!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-AUTH-006: 비밀번호 미입력
  it('TC-AUTH-006: 비밀번호 미입력 → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales-a@test.com', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-AUTH-007: 토큰 없이 보호 API 접근
  it('TC-AUTH-007: Authorization 헤더 없이 보호 API 접근 → 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  // TC-AUTH-008: 로그아웃 후 토큰 무효화 (클라이언트 삭제 방식)
  it('TC-AUTH-008: 로그아웃 → 200, 이후 인증은 클라이언트 처리', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(activeSalesperson);
    mockPrismaClient.salesperson.count.mockResolvedValue(0);

    // 로그인
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales-a@test.com', password: 'Test1234!' });
    const { accessToken } = loginRes.body.data;

    // 로그아웃
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
  });

  // TC-SEC-002 / TC-SEC-003: 토큰 변조 / 위변조
  it('TC-SEC-002/003: 만료되거나 위변조된 토큰 → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
    expect(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID']).toContain(res.body.error.code);
  });
});
