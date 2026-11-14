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

export async function deactivateDoctor(
  userId: number,
  doctorId: number
): Promise<Doctor> {
  const response = await apiClient<ApiResponse<Doctor>>(`/doctors/${doctorId}/deactivate`, {
    method: 'PATCH',
    userId,
  });

  return response.data;
}

export async function activateDoctor(
  userId: number,
  doctorId: number
): Promise<Doctor> {
  const response = await apiClient<ApiResponse<Doctor>>(`/doctors/${doctorId}/activate`, {
    method: 'PATCH',
    userId,
  });

  return response.data;
}

