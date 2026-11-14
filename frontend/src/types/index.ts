export type UserRole = 'PATIENT' | 'RECEPTION';

export type AppointmentDuration = 15 | 30 | 45 | 60;

export type AppointmentStatus = 'BOOKED' | 'CANCELLED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  id: number;
  doctor: {
    id: number;
    name: string;
    specialization: string | null;
  };
  patient: {
    id: number;
    name: string;
    email: string;
  };
  startTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
}

export interface BookAppointmentDTO {
  doctorId: number;
  startTime: string; // ISO 8601 with explicit timezone, e.g. YYYY-MM-DDTHH:mm:00+05:30
  durationMinutes: AppointmentDuration;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

