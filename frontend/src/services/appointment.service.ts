import { apiClient } from './api';
import type { ApiResponse, Appointment, BookAppointmentDTO, PaginatedResult } from '../types';

export async function bookAppointment(
  userId: number,
  dto: BookAppointmentDTO
): Promise<Appointment> {
  const response = await apiClient<ApiResponse<Appointment>>('/appointments', {
    method: 'POST',
    userId,
    body: dto,
  });

  return response.data;
}

export async function listAppointments(
  userId: number,
  params: { limit: number; offset: number }
): Promise<PaginatedResult<Appointment>> {
  return apiClient<PaginatedResult<Appointment>>('/appointments', {
    method: 'GET',
    userId,
    params,
  });
}

export async function cancelAppointment(
  userId: number,
  appointmentId: number
): Promise<Appointment> {
  const response = await apiClient<ApiResponse<Appointment>>(
    `/appointments/${appointmentId}/cancel`,
    {
      method: 'PATCH',
      userId,
    }
  );

  return response.data;
}
