import { apiClient } from './api';
import type { ApiResponse, Doctor } from '../types';

export async function fetchDoctors(
  userId: number,
  includeInactive: boolean = false
): Promise<Doctor[]> {
  const params: Record<string, string> = {};
  if (includeInactive) {
    params.includeInactive = 'true';
  }

  const response = await apiClient<ApiResponse<Doctor[]>>('/doctors', {
    method: 'GET',
    userId,
    params,
  });

  return response.data;
}

