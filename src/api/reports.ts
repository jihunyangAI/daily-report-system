import { apiClient } from './client.js';
import type { ApiResponse, PaginatedResponse, ReportListItem, TeamReportListItem, ReportDetail } from '../types/index.js';

export const reportsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<PaginatedResponse<ReportListItem>>>('/reports', { params }),

  team: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<PaginatedResponse<TeamReportListItem>>>('/reports/team', { params }),

  detail: (id: number) =>
    apiClient.get<ApiResponse<ReportDetail>>(`/reports/${id}`),

  create: (reportDate: string) =>
    apiClient.post<ApiResponse<{ reportId: number }>>('/reports', { reportDate }),

  submit: (id: number) =>
    apiClient.post<ApiResponse<{ reportId: number; status: string; submittedAt: string }>>(`/reports/${id}/submit`),

  confirm: (id: number) =>
    apiClient.post<ApiResponse<{ reportId: number; status: string; confirmedAt: string }>>(`/reports/${id}/confirm`),

  addVisit: (reportId: number, data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<{ visitId: number }>>(`/reports/${reportId}/visits`, data),

  updateVisit: (reportId: number, visitId: number, data: Record<string, unknown>) =>
    apiClient.put(`/reports/${reportId}/visits/${visitId}`, data),

  deleteVisit: (reportId: number, visitId: number) =>
    apiClient.delete(`/reports/${reportId}/visits/${visitId}`),

  addProblem: (reportId: number, data: { content: string; seq?: number }) =>
    apiClient.post<ApiResponse<{ problemId: number }>>(`/reports/${reportId}/problems`, data),

  updateProblem: (reportId: number, problemId: number, data: { content: string; seq?: number }) =>
    apiClient.put(`/reports/${reportId}/problems/${problemId}`, data),

  deleteProblem: (reportId: number, problemId: number) =>
    apiClient.delete(`/reports/${reportId}/problems/${problemId}`),

  addPlan: (reportId: number, data: { content: string; seq?: number }) =>
    apiClient.post<ApiResponse<{ planId: number }>>(`/reports/${reportId}/plans`, data),

  updatePlan: (reportId: number, planId: number, data: { content: string; seq?: number }) =>
    apiClient.put(`/reports/${reportId}/plans/${planId}`, data),

  deletePlan: (reportId: number, planId: number) =>
    apiClient.delete(`/reports/${reportId}/plans/${planId}`),

  addProblemComment: (problemId: number, content: string) =>
    apiClient.post<ApiResponse<{ commentId: number }>>(`/problems/${problemId}/comments`, { content }),

  addPlanComment: (planId: number, content: string) =>
    apiClient.post<ApiResponse<{ commentId: number }>>(`/plans/${planId}/comments`, { content }),
};
