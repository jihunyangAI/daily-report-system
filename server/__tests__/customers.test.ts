/**
 * TC-CUS-001 ~ TC-CUS-009 고객 마스터 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const adminToken = signToken({ salespersonId: 1, email: 'admin@test.com', isManager: true });
const salesToken = signToken({ salespersonId: 3, email: 'sales-a@test.com', isManager: false });

const adminRecord = { id: 1, managerId: null };
const salesRecord = { id: 3, managerId: 2 };

const customerA = { id: 1, companyName: '(주)테스트산업', contactName: '김대리', phone: '010-1234-5678', email: 'kim@test.com', address: '서울시', industry: '제조', memo: null, isActive: true, createdAt: new Date(), updatedAt: new Date() };
const customerB = { id: 2, companyName: '비활성고객(주)', contactName: '이과장', phone: '02-9876-5432', email: null, address: null, industry: 'IT', memo: null, isActive: false, createdAt: new Date(), updatedAt: new Date() };

describe('TC-CUS 고객 마스터', () => {
  beforeEach(() => vi.clearAllMocks());

  // TC-CUS-001: 전체 목록 조회
  it('TC-CUS-001: 고객 목록 정상 조회', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([customerA, customerB]);
    mockPrismaClient.customer.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
  });

  // TC-CUS-002: 키워드 검색
  it('TC-CUS-002: 회사명·담당자명 키워드 검색', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([customerA]);
    mockPrismaClient.customer.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/customers?keyword=테스트산업')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].companyName).toBe('(주)테스트산업');
  });

  // TC-CUS-003: isActive=true 필터
  it('TC-CUS-003: isActive=true 파라미터로 활성 고객만 조회', async () => {
    mockPrismaClient.customer.findMany.mockResolvedValue([customerA]);
    mockPrismaClient.customer.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/customers?isActive=true')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    const callWhere = mockPrismaClient.customer.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ isActive: true });
  });

  // TC-CUS-004: 단건 조회
  it('TC-CUS-004: 고객 단건 조회 전체 필드 반환', async () => {
    mockPrismaClient.customer.findUnique.mockResolvedValue(customerA);

    const res = await request(app)
      .get('/api/customers/1')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('customerId', 1);
    expect(res.body.data).toHaveProperty('address');
    expect(res.body.data).toHaveProperty('memo');
  });

  // TC-CUS-005: 없는 고객 → 404
  it('TC-CUS-005: 없는 고객 ID 조회 → 404 NOT_FOUND', async () => {
    mockPrismaClient.customer.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/customers/99999')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // TC-CUS-006: 등록 성공
  it('TC-CUS-006: 고객 등록 성공 → 201', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(adminRecord);
    mockPrismaClient.customer.create.mockResolvedValue({ id: 3 });

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: '(주)신규고객', contactName: '홍대리', phone: '02-0000-0000', industry: '제조' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('customerId');
  });

  // TC-CUS-007: 회사명 미입력 → 400
  it('TC-CUS-007: 회사명 미입력 등록 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(adminRecord);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: '', contactName: '홍대리' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-CUS-008: 수정 성공
  it('TC-CUS-008: 고객 수정 성공', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(adminRecord);
    mockPrismaClient.customer.findUnique.mockResolvedValue(customerA);
    mockPrismaClient.customer.update.mockResolvedValue({ ...customerA, contactName: '김과장' });

    const res = await request(app)
      .put('/api/customers/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: '(주)테스트산업', contactName: '김과장', phone: '010-9999-8888', isActive: true });

    expect(res.status).toBe(200);
  });

  // TC-CUS-009: 일반 사용자 등록 → 403
  it('TC-CUS-009: 일반 사용자 고객 등록 시도 → 403 FORBIDDEN', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesRecord);

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ companyName: '테스트', contactName: '홍대리' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
