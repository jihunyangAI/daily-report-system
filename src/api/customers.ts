import { apiClient } from './client.js';
import type { ApiResponse, PaginatedResponse, Customer } from '../types/index.js';

export const customersApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Customer>>>('/customers', { params }),

  detail: (id: number) =>
    apiClient.get<ApiResponse<Customer>>(`/customers/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<ApiResponse<{ customerId: number }>>('/customers', data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/customers/${id}`, data),
};
