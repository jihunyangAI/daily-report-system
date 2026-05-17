/**
 * TC-SP-001 ~ TC-SP-010 영업사원 마스터 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import './helpers/mockPrisma.js';
import { mockPrismaClient } from './helpers/mockPrisma.js';
import { signToken } from '../lib/jwt.js';
import app from '../app.js';

const HASHED_PW = await bcrypt.hash('Test1234!', 10);

// 관리자 토큰 (managerId IS NULL)
const adminToken = signToken({ salespersonId: 1, email: 'admin@test.com', isManager: true });
// 일반 사원 토큰
const salesToken = signToken({ salespersonId: 3, email: 'sales-a@test.com', isManager: false });

const adminRecord = { id: 1, name: '관리자', email: 'admin@test.com', passwordHash: HASHED_PW, department: '경영지원팀', rank: '이사', managerId: null, hireDate: new Date('2015-01-01'), isActive: true, createdAt: new Date(), updatedAt: new Date() };
const salesRecord = { id: 3, name: '영업사원A', email: 'sales-a@test.com', passwordHash: HASHED_PW, department: '영업1팀', rank: '대리', managerId: 2, hireDate: new Date('2023-03-02'), isActive: true, createdAt: new Date(), updatedAt: new Date() };

const spListItems = [
  { ...adminRecord, manager: null },
  { ...salesRecord, manager: { id: 2, name: '팀장' } },
];

describe('TC-SP 영업사원 마스터', () => {
  beforeEach(() => vi.clearAllMocks());

  // TC-SP-001: 목록 조회
  it('TC-SP-001: 영업사원 목록 정상 조회', async () => {
    mockPrismaClient.salesperson.findMany.mockResolvedValue(spListItems);
    mockPrismaClient.salesperson.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/salespersons')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.pagination).toHaveProperty('totalCount', 2);
  });

  // TC-SP-002: 키워드 검색
  it('TC-SP-002: 사원명 키워드 검색', async () => {
    mockPrismaClient.salesperson.findMany.mockResolvedValue([{ ...salesRecord, manager: { id: 2, name: '팀장' } }]);
    mockPrismaClient.salesperson.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/salespersons?keyword=영업사원A')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].name).toBe('영업사원A');
  });

  // TC-SP-003: 등록 성공
  it('TC-SP-003: 신규 영업사원 등록 성공 → 201', async () => {
    const managerRecord = { id: 2, name: '팀장' };
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)    // requireAdmin
      .mockResolvedValueOnce(null)           // 이메일 중복 체크
      .mockResolvedValueOnce(managerRecord); // managerId 존재 확인
    mockPrismaClient.salesperson.create.mockResolvedValue({ id: 6 });

    const res = await request(app)
      .post('/api/salespersons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '신입사원', email: 'new@test.com', password: 'Test1234!', department: '영업1팀', rank: '사원', managerId: 2, hireDate: '2026-05-14' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('salespersonId');
  });

  // TC-SP-004: 이메일 중복 → 409
  it('TC-SP-004: 이메일 중복 등록 → 409 SALESPERSON_EMAIL_DUPLICATE', async () => {
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)    // requireAdmin
      .mockResolvedValueOnce(salesRecord);   // 이메일 중복

    const res = await request(app)
      .post('/api/salespersons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '중복', email: 'sales-a@test.com', password: 'Test1234!', department: '영업1팀', rank: '사원', hireDate: '2026-05-14' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SALESPERSON_EMAIL_DUPLICATE');
  });

  // TC-SP-005: 수정 성공
  it('TC-SP-005: 영업사원 수정 성공', async () => {
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)  // requireAdmin
      .mockResolvedValueOnce(salesRecord); // 대상 존재 확인
    mockPrismaClient.salesperson.update.mockResolvedValue({ ...salesRecord, department: '영업2팀', rank: '주임' });

    const res = await request(app)
      .put('/api/salespersons/3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '영업사원A', department: '영업2팀', rank: '주임', hireDate: '2023-03-02', isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // TC-SP-006: 비밀번호 미입력 시 기존 유지 (update 호출 데이터에 passwordHash 없음)
  it('TC-SP-006: password 미입력 시 기존 비밀번호 유지', async () => {
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)
      .mockResolvedValueOnce(salesRecord);
    mockPrismaClient.salesperson.update.mockResolvedValue(salesRecord);

    const res = await request(app)
      .put('/api/salespersons/3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '영업사원A', department: '영업1팀', rank: '대리', hireDate: '2023-03-02', isActive: true });

    expect(res.status).toBe(200);
    const updateCall = mockPrismaClient.salesperson.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('passwordHash');
  });

  // TC-SP-007: isActive:false 수정 후 → DB에 반영 확인
  it('TC-SP-007: isActive:false 수정 → DB update 호출 확인', async () => {
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)
      .mockResolvedValueOnce(salesRecord);
    mockPrismaClient.salesperson.update.mockResolvedValue({ ...salesRecord, isActive: false });

    const res = await request(app)
      .put('/api/salespersons/3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '영업사원A', department: '영업1팀', rank: '대리', hireDate: '2023-03-02', isActive: false });

    expect(res.status).toBe(200);
    const updateCall = mockPrismaClient.salesperson.update.mock.calls[0][0];
    expect(updateCall.data.isActive).toBe(false);
  });

  // TC-SP-008: managerId 본인 지정 → 400
  it('TC-SP-008: managerId에 본인 ID 입력 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.salesperson.findUnique
      .mockResolvedValueOnce(adminRecord)
      .mockResolvedValueOnce(salesRecord);

    const res = await request(app)
      .put('/api/salespersons/3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '영업사원A', department: '영업1팀', rank: '대리', hireDate: '2023-03-02', managerId: 3 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-SP-009: 사원명 미입력 → 400
  it('TC-SP-009: 사원명 미입력 등록 → 400 VALIDATION_ERROR', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValueOnce(adminRecord);

    const res = await request(app)
      .post('/api/salespersons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', email: 'new2@test.com', password: 'Test1234!', department: '영업1팀', rank: '사원', hireDate: '2026-05-14' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-SP-010: 일반 사용자 등록 시도 → 403
  it('TC-SP-010: 일반 사용자 등록 시도 → 403 FORBIDDEN', async () => {
    mockPrismaClient.salesperson.findUnique.mockResolvedValue(salesRecord); // managerId IS NOT NULL

    const res = await request(app)
      .post('/api/salespersons')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ name: '신규', email: 'new3@test.com', password: 'Test1234!', department: '영업1팀', rank: '사원', hireDate: '2026-05-14' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
