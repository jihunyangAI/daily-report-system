/**
 * prisma/seed.ts
 *
 * 테스트 명세서 섹션 2.2 "테스트 계정 및 데이터"를 기반으로 한 시드 스크립트.
 * 실행: npx prisma db seed
 */

import { PrismaClient, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test1234!';

async function hash(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding database...');

  // ──────────────────────────────────────────
  // 영업사원 (계층 구조 때문에 2단계로 생성)
  // ──────────────────────────────────────────

  // 1단계: manager_id 없이 최상위 사원 생성
  const admin = await prisma.salesperson.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      name: '관리자',
      email: 'admin@test.com',
      passwordHash: await hash(DEFAULT_PASSWORD),
      department: '경영지원팀',
      rank: '이사',
      hireDate: new Date('2015-01-01'),
      isActive: true,
    },
  });

  const manager = await prisma.salesperson.upsert({
    where: { email: 'manager@test.com' },
    update: {},
    create: {
      name: '팀장',
      email: 'manager@test.com',
      passwordHash: await hash(DEFAULT_PASSWORD),
      department: '영업1팀',
      rank: '팀장',
      managerId: admin.id,
      hireDate: new Date('2018-03-01'),
      isActive: true,
    },
  });

  const otherManager = await prisma.salesperson.upsert({
    where: { email: 'other-manager@test.com' },
    update: {},
    create: {
      name: '타팀팀장',
      email: 'other-manager@test.com',
      passwordHash: await hash(DEFAULT_PASSWORD),
      department: '영업2팀',
      rank: '팀장',
      managerId: admin.id,
      hireDate: new Date('2017-06-01'),
      isActive: true,
    },
  });

  // 2단계: 부하 직원 생성
  const salesA = await prisma.salesperson.upsert({
    where: { email: 'sales-a@test.com' },
    update: {},
    create: {
      name: '영업사원A',
      email: 'sales-a@test.com',
      passwordHash: await hash(DEFAULT_PASSWORD),
      department: '영업1팀',
      rank: '대리',
      managerId: manager.id,
      hireDate: new Date('2023-03-02'),
      isActive: true,
    },
  });

  const salesB = await prisma.salesperson.upsert({
    where: { email: 'sales-b@test.com' },
    update: {},
    create: {
      name: '영업사원B',
      email: 'sales-b@test.com',
      passwordHash: await hash(DEFAULT_PASSWORD),
      department: '영업1팀',
      rank: '사원',
      managerId: manager.id,
      hireDate: new Date('2024-01-15'),
      isActive: true,
    },
  });

  await prisma.salesperson.upsert({
    where: { email: 'inactive@test.com' },
    update: {},
    create: {
      name: '비활성사원',
      email: 'inactive@test.com',
      passwordHash: await hash(DEFAULT_PASSWORD),
      department: '영업1팀',
      rank: '사원',
      managerId: manager.id,
      hireDate: new Date('2022-05-01'),
      isActive: false,
    },
  });

  console.log(`  ✓ 영업사원 6명 생성 (admin, manager, otherManager, salesA, salesB, inactive)`);

  // ──────────────────────────────────────────
  // 고객 마스터
  // ──────────────────────────────────────────

  const customerA = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyName: '(주)테스트산업',
      contactName: '김대리',
      phone: '010-1234-5678',
      email: 'kim@test-industry.com',
      industry: '제조',
      isActive: true,
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      companyName: '비활성고객(주)',
      contactName: '이과장',
      phone: '02-9876-5432',
      industry: 'IT',
      isActive: false,
    },
  });

  console.log(`  ✓ 고객 2건 생성 (활성 1건, 비활성 1건)`);

  // ──────────────────────────────────────────
  // 일일보고 (영업사원A 기준)
  // ──────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

  // report_id=901 → DRAFT (오늘)
  const reportDraft = await prisma.dailyReport.upsert({
    where: { salespersonId_reportDate: { salespersonId: salesA.id, reportDate: today } },
    update: {},
    create: {
      salespersonId: salesA.id,
      reportDate: today,
      status: ReportStatus.DRAFT,
    },
  });

  // report_id=902 → SUBMITTED (어제), 방문기록 1건 포함
  const reportSubmitted = await prisma.dailyReport.upsert({
    where: { salespersonId_reportDate: { salespersonId: salesA.id, reportDate: yesterday } },
    update: {},
    create: {
      salespersonId: salesA.id,
      reportDate: yesterday,
      status: ReportStatus.SUBMITTED,
      submittedAt: new Date(yesterday.getTime() + 17 * 60 * 60 * 1000),
      visitRecords: {
        create: {
          customerId: customerA.id,
          visitTime: '10:00',
          visitPurpose: '제품 데모',
          visitContent: '신제품 소개 및 시연 진행',
        },
      },
      problems: {
        create: { seq: 1, content: 'A사 계약 조건 내부 검토 필요' },
      },
      plans: {
        create: { seq: 1, content: 'C사 신규 방문 (오전 10시)' },
      },
    },
  });

  // report_id=903 → CONFIRMED (그제)
  await prisma.dailyReport.upsert({
    where: { salespersonId_reportDate: { salespersonId: salesA.id, reportDate: dayBeforeYesterday } },
    update: {},
    create: {
      salespersonId: salesA.id,
      reportDate: dayBeforeYesterday,
      status: ReportStatus.CONFIRMED,
      submittedAt: new Date(dayBeforeYesterday.getTime() + 17 * 60 * 60 * 1000),
      confirmedAt: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000),
      visitRecords: {
        create: {
          customerId: customerA.id,
          visitTime: '14:00',
          visitPurpose: '계약 협의',
          visitContent: '계약서 검토 완료',
        },
      },
    },
  });

  console.log(`  ✓ 일일보고 3건 생성 (DRAFT/SUBMITTED/CONFIRMED)`);

  // ──────────────────────────────────────────
  // 팀장 댓글 (SUBMITTED 보고서의 Problem/Plan)
  // ──────────────────────────────────────────

  const submittedReport = await prisma.dailyReport.findUnique({
    where: { id: reportSubmitted.id },
    include: { problems: true, plans: true },
  });

  if (submittedReport?.problems[0]) {
    await prisma.comment.create({
      data: {
        problemId: submittedReport.problems[0].id,
        authorId: manager.id,
        content: '법무팀과 확인해서 내일까지 답변 주세요',
      },
    });
  }

  if (submittedReport?.plans[0]) {
    await prisma.comment.create({
      data: {
        planId: submittedReport.plans[0].id,
        authorId: manager.id,
        content: '제안서 꼭 지참하세요',
      },
    });
  }

  console.log(`  ✓ 댓글 2건 생성`);
  console.log('\n✅ Seeding complete!');
  console.log('\n📋 테스트 계정:');
  console.log(`   관리자:       admin@test.com / ${DEFAULT_PASSWORD}`);
  console.log(`   팀장(상급자): manager@test.com / ${DEFAULT_PASSWORD}`);
  console.log(`   영업사원A:    sales-a@test.com / ${DEFAULT_PASSWORD}`);
  console.log(`   영업사원B:    sales-b@test.com / ${DEFAULT_PASSWORD}`);
  console.log(`   타팀 팀장:    other-manager@test.com / ${DEFAULT_PASSWORD}`);
  console.log(`   비활성:       inactive@test.com / ${DEFAULT_PASSWORD}`);
  console.log(`\n   영업사원A 보고서: DRAFT(오늘), SUBMITTED(어제), CONFIRMED(그제)`);
}

main()
  .catch((e) => {
    console.error('Seed 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
