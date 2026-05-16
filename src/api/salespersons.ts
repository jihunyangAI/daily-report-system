import { apiClient } from './client.js';
import type { ApiResponse, PaginatedResponse, Salesperson } from '../types/index.js';

export const salespersonsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Salesperson>>>('/salespersons', { params }),

  detail: (id: number) =>
    apiClient.get<ApiResponse<Salesperson>>(`/salespersons/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<{ salespersonId: number }>>('/salespersons', data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/salespersons/${id}`, data),
};
