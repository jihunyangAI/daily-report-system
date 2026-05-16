// 보고서 상세 응답 포맷터 (GET /reports/:id 에서 사용)
import type { DailyReport, Salesperson, VisitRecord, Customer, Problem, Plan, Comment } from '@prisma/client';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type ReportDetail = DailyReport & {
  salesperson: Salesperson;
  visitRecords: (VisitRecord & { customer: Customer })[];
  problems: (Problem & { comments: (Comment & { author: Pick<Salesperson, 'id' | 'name'> })[] })[];
  plans: (Plan & { comments: (Comment & { author: Pick<Salesperson, 'id' | 'name'> })[] })[];
};

export function formatReportDetail(r: ReportDetail) {
  return {
    reportId: r.id,
    reportDate: localDateStr(r.reportDate),
    status: r.status,
    salesperson: {
      salespersonId: r.salesperson.id,
      name: r.salesperson.name,
      department: r.salesperson.department,
      rank: r.salesperson.rank,
    },
    submittedAt: r.submittedAt?.toISOString().slice(0, 19) ?? null,
    confirmedAt: r.confirmedAt?.toISOString().slice(0, 19) ?? null,
    createdAt: r.createdAt.toISOString().slice(0, 19),
    updatedAt: r.updatedAt.toISOString().slice(0, 19),
    visits: r.visitRecords.map(v => ({
      visitId: v.id,
      customer: {
        customerId: v.customer.id,
        companyName: v.customer.companyName,
        contactName: v.customer.contactName,
      },
      visitTime: v.visitTime,
      visitPurpose: v.visitPurpose,
      visitContent: v.visitContent,
      nextVisitDate: v.nextVisitDate ? localDateStr(v.nextVisitDate) : null,
    })),
    problems: r.problems.map(p => ({
      problemId: p.id,
      seq: p.seq,
      content: p.content,
      createdAt: p.createdAt.toISOString().slice(0, 19),
      comments: p.comments.map(c => ({
        commentId: c.id,
        author: { salespersonId: c.author.id, name: c.author.name },
        content: c.content,
        createdAt: c.createdAt.toISOString().slice(0, 19),
        updatedAt: c.updatedAt.toISOString().slice(0, 19),
      })),
    })),
    plans: r.plans.map(p => ({
      planId: p.id,
      seq: p.seq,
      content: p.content,
      createdAt: p.createdAt.toISOString().slice(0, 19),
      comments: p.comments.map(c => ({
        commentId: c.id,
        author: { salespersonId: c.author.id, name: c.author.name },
        content: c.content,
        createdAt: c.createdAt.toISOString().slice(0, 19),
        updatedAt: c.updatedAt.toISOString().slice(0, 19),
      })),
    })),
  };
}
