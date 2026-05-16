import type { Response } from 'express';

// API 명세서 1.2 공통 응답 형식

export interface Pagination {
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  data?: unknown;
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

export function sendError(res: Response, status: number, error: ApiError): void {
  res.status(status).json({ success: false, error });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: Pagination,
): void {
  res.status(200).json({ success: true, data: { items, pagination } });
}

export function buildPagination(page: number, size: number, totalCount: number): Pagination {
  return {
    page,
    size,
    totalCount,
    totalPages: Math.ceil(totalCount / size),
  };
}

// 페이지네이션 파라미터 파싱 (API 명세서 1.3)
export function parsePagination(query: Record<string, unknown>): { page: number; size: number; skip: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const rawSize = parseInt(String(query.size ?? '20'), 10) || 20;
  const size = Math.min(100, Math.max(1, rawSize)); // 최대 100 (TC-SEC-010)
  return { page, size, skip: (page - 1) * size };
}
