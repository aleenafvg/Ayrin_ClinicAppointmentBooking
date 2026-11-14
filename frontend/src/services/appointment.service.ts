import { apiClient } from './api';
import type { ApiResponse, Appointment, BookAppointmentDTO } from '../types';

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

