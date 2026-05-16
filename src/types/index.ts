// API 명세서 기반 공통 타입 정의

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'NONE';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
  data?: unknown;
}

export interface Pagination {
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface AuthUser {
  salespersonId: number;
  name: string;
  department: string;
  rank: string;
  isManager: boolean;
}

export interface Salesperson {
  salespersonId: number;
  name: string;
  department: string;
  rank: string;
  manager: { salespersonId: number; name: string } | null;
  email: string;
  hireDate: string;
  isActive: boolean;
}

export interface Customer {
  customerId: number;
  companyName: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  address?: string | null;
  industry: string | null;
  memo?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportListItem {
  reportId: number;
  reportDate: string;
  status: ReportStatus;
  visitCount: number;
  submittedAt: string | null;
  confirmedAt: string | null;
  updatedAt: string;
}

export interface TeamReportListItem {
  reportId: number | null;
  reportDate: string;
  salesperson: { salespersonId: number; name: string; department: string };
  status: ReportStatus;
  visitCount: number;
  commentCount: number;
  submittedAt: string | null;
}

export interface Comment {
  commentId: number;
  author: { salespersonId: number; name: string };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitRecord {
  visitId: number;
  customer: { customerId: number; companyName: string; contactName: string };
  visitTime: string | null;
  visitPurpose: string | null;
  visitContent: string | null;
  nextVisitDate: string | null;
}

export interface Problem {
  problemId: number;
  seq: number;
  content: string;
  createdAt: string;
  comments: Comment[];
}

export interface Plan {
  planId: number;
  seq: number;
  content: string;
  createdAt: string;
  comments: Comment[];
}

export interface ReportDetail {
  reportId: number;
  reportDate: string;
  status: ReportStatus;
  salesperson: { salespersonId: number; name: string; department: string; rank: string };
  submittedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  visits: VisitRecord[];
  problems: Problem[];
  plans: Plan[];
}
