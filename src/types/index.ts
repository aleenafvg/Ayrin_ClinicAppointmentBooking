export type UserRole = 'PATIENT' | 'RECEPTION';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string | null;
  isActive: boolean;
  createdAt: Date;
}

export type AppointmentDuration = 15 | 30 | 45 | 60;
export type AppointmentStatus = 'BOOKED' | 'CANCELLED';

export interface Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  startTime: Date;
  durationMinutes: AppointmentDuration;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentDoctorInfo {
  id: number;
  name: string;
  specialization: string | null;
}

export interface AppointmentPatientInfo {
  id: number;
  name: string;
  email: string;
}

export interface AppointmentResponse {
  id: number;
  doctor: AppointmentDoctorInfo;
  patient?: AppointmentPatientInfo;
  startTime: string; // ISO 8601 UTC
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface CreateAppointmentDTO {
  doctorId: number;
  startTime: string;
  durationMinutes: AppointmentDuration;
}

// Extend Express Request type to include the resolved user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

