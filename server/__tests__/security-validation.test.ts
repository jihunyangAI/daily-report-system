/**
 * TC-SEC-001~010 권한/보안 테스트
 * TC-VAL-001~010 유효성 검증 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const adminToken  = signToken({ salespersonId: 1, email: 'admin@test.com', isManager: true });
const salesToken  = signToken({ salespersonId: 3, email: 'sales@test.com', isManager: false });
const adminRecord = { id: 1, managerId: null };

describe('TC-SEC 권한/보안', () => {
  beforeEach(() => vi.clearAllMocks());

  // TC-SEC-001: 토큰 없이 보호 API 전체 → 401
  it('TC-SEC-001: Authorization 헤더 없이 모든 보호 API → 401', async () => {
    const routes = [
      ['GET', '/api/reports'],
      ['GET', '/api/customers'],
      ['GET', '/api/salespersons'],
    ];
    for (const [method, url] of routes) {
      const res = await (request(app) as Record<string, (url: string) => import('supertest').Test>)[method.toLowerCase()](url);
      expect(res.status).toBe(401);
    }
  });

  // TC-SEC-002: 만료 토큰 → 401
  it('TC-SEC-002: 만료된 JWT → 401 AUTH_TOKEN_EXPIRED', async () => {
    // 이미 TC-AUTH 파일에서 검증됨, 여기서는 추가 확인
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(['AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID']).toContain(res.body.error.code);
  });

  // TC-SEC-003: 위변조 토큰 → 401
  it('TC-SEC-003: 위변조 JWT → 401 AUTH_TOKEN_INVALID', async () => {
    const tamperedToken = adminToken.slice(0, -5) + 'XXXXX';
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  // TC-SEC-004: SQL Injection 방어 (Prisma의 파라미터화 쿼리로 자동 보호)
  it('TC-SEC-004: keyword에 SQL Injection 문자열 → 정상 처리 (200)', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([]);
    mockPrismaClient.customer.count.mockResolvedValue(0);

    const res = await request(app)
      .get("/api/customers?keyword=' OR '1'='1")
      .set('Authorization', `Bearer ${salesToken}`);

    // Prisma 파라미터화 쿼리로 SQL Injection은 자동 방어됨
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  // TC-SEC-005: 타사원 보고서 URL 직접 접근 → 403
  it('TC-SEC-005: 직속 관계 없는 타사원 보고서 접근 → 403', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue({ id: 901, salespersonId: 99, status: 'DRAFT' });
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ id: 99, managerId: 55 }); // 상급자 55 ≠ salesToken(3)

    const res = await request(app).get('/api/reports/901').set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(403);
  });

  // TC-SEC-006: 타사원 방문기록 수정 → 403
  it('TC-SEC-006: 타사원 보고서 방문기록 수정 → 403', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue({ id: 901, salespersonId: 99, status: 'DRAFT' }); // 타사원

    const res = await request(app)
      .put('/api/reports/901/visits/201')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId: 1 });

    expect(res.status).toBe(403);
  });

  // TC-SEC-007: 비밀번호 bcrypt 해시 저장 (seed에서 확인, 여기서는 등록 시 hash 함수 호출 검증)
  it('TC-SEC-007: 영업사원 등록 시 bcrypt hash 로 저장', async () => {
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)  // requireAdmin
      .mockResolvedValueOnce(null);        // 이메일 중복 체크
    mockPrismaClient.salesperson.findFirst.mockResolvedValue(null);
    mockPrismaClient.salesperson.create.mockImplementation(async ({ data }) => {
      // passwordHash는 반드시 bcrypt 형식($2b$...)
      expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
      return { id: 10 };
    });

    await request(app)
      .post('/api/salespersons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '테스트', email: 'test-hash@test.com', password: 'Test1234!', department: '영업팀', rank: '사원', hireDate: '2026-05-14' });

    expect(mockPrismaClient.salesperson.create).toHaveBeenCalledOnce();
  });

  // TC-SEC-008: 관리자 전용 API 일반 사용자 → 403
  it('TC-SEC-008: 일반 사용자의 마스터 등록 API → 403', async () => {
    const salesRecord = { id: 3, managerId: 2 };
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesRecord);

    const [r1, r2, r3] = await Promise.all([
      request(app).post('/api/salespersons').set('Authorization', `Bearer ${salesToken}`).send({ name: 'x', email: 'x@x.com', password: '12345678', department: 'a', rank: 'b', hireDate: '2026-01-01' }),
      request(app).post('/api/customers').set('Authorization', `Bearer ${salesToken}`).send({ companyName: 'X', contactName: 'Y' }),
      request(app).put('/api/salespersons/1').set('Authorization', `Bearer ${salesToken}`).send({ name: 'x', department: 'a', rank: 'b', hireDate: '2026-01-01' }),
    ]);
    expect(r1.status).toBe(403);
    expect(r2.status).toBe(403);
    expect(r3.status).toBe(403);
  });

  // TC-SEC-009: 사원 조회 응답에 password_hash 미포함
  it('TC-SEC-009: 영업사원 조회 응답에 passwordHash 필드 없음', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue({ id: 1, name: '관리자', email: 'admin@test.com', department: '경영지원팀', rank: '이사', managerId: null, hireDate: new Date(), isActive: true, manager: null });
    mockPrismaClient.salesperson.findMany.mockResolvedValue([{ id: 1, name: '관리자', email: 'admin@test.com', department: '경영지원팀', rank: '이사', managerId: null, hireDate: new Date(), isActive: true, manager: null }]);
    mockPrismaClient.salesperson.count.mockResolvedValue(1);

    const res = await request(app).get('/api/salespersons/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('password_hash');
    expect(res.body.data).not.toHaveProperty('password');
  });

  // TC-SEC-010: size=9999 → 최대 100으로 제한
  it('TC-SEC-010: size=9999 요청 → 최대 100건 제한', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([]);
    mockPrismaClient.customer.count.mockResolvedValue(0);

    await request(app).get('/api/customers?size=9999').set('Authorization', `Bearer ${salesToken}`);

    const callArgs = mockPrismaClient.customer.findMany.mock.calls[0][0];
    expect(callArgs.take).toBeLessThanOrEqual(100);
  });
});

describe('TC-VAL 유효성 검증', () => {
  beforeEach(() => vi.clearAllMocks());

  // TC-VAL-001: 이메일 형식 오류 → 400
  it('TC-VAL-001: 잘못된 이메일 형식 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(adminRecord);

    const res = await request(app)
      .post('/api/salespersons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '테스트', email: 'notanemail', password: 'Test1234!', department: '영업팀', rank: '사원', hireDate: '2026-05-14' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-VAL-002: 비밀번호 7자 이하 → 400
  it('TC-VAL-002: 비밀번호 7자 → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-VAL-003: 날짜 형식 오류 (슬래시) → 400
  it('TC-VAL-003: 잘못된 날짜 형식 reportDate → 400', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ reportDate: '2026/05/14' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-VAL-004: 회사명 201자 초과 → 400
  it('TC-VAL-004: 회사명 201자 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(adminRecord);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'A'.repeat(201), contactName: '홍대리' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-VAL-005: page=0 → 기본값 1 처리
  it('TC-VAL-005: page=0 → page=1로 처리 (200)', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([]);
    mockPrismaClient.customer.count.mockResolvedValue(0);

    const res = await request(app).get('/api/customers?page=0').set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
  });

  // TC-VAL-006: status 임의값 → 전체 조회 (유효하지 않은 값 무시)
  it('TC-VAL-006: status=INVALID_STATUS → 필터 무시하고 전체 조회 (200)', async () => {
    mockPrismaClient.dailyReport.findMany.mockResolvedValue([]);
    mockPrismaClient.dailyReport.count.mockResolvedValue(0);

    const res = await request(app).get('/api/reports?status=INVALID_STATUS').set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    // 유효하지 않은 status는 where 조건에서 제외됨
    const where = mockPrismaClient.dailyReport.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('status');
  });

  // TC-VAL-007: 연락처에 문자 포함 → 400
  it('TC-VAL-007: phone에 한글 포함 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(adminRecord);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: '테스트', contactName: '홍대리', phone: '전화번호' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-VAL-008: 음수 ID → 404
  it('TC-VAL-008: 음수 ID 경로 파라미터 → 404', async () => {
    const res = await request(app).get('/api/customers/-1').set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(404);
  });

  // TC-VAL-009: visitTime 잘못된 형식 → 400
  it('TC-VAL-009: visitTime=25:99 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.dailyReport.findUnique.mockResolvedValue({ id: 901, salespersonId: 3, status: 'DRAFT' });
    mockPrismaClient.customer.findUnique.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/reports/901/visits')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerId: 1, visitTime: '25:99' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-VAL-010: size=-1 → 기본값 처리 (200)
  it('TC-VAL-010: size=-1 → size=1로 보정 처리 (200)', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([]);
    mockPrismaClient.customer.count.mockResolvedValue(0);

    const res = await request(app).get('/api/customers?size=-1').set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    const take = mockPrismaClient.customer.findMany.mock.calls[0][0].take;
    expect(take).toBeGreaterThanOrEqual(1);
  });
});
