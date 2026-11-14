import { pool } from '../db';
import { Doctor, UserRole } from '../types';
import { AppError } from '../middleware/error-handler';

export async function listDoctors(
  callerRole: UserRole,
  includeInactiveRequested: boolean
): Promise<Doctor[]> {
  // Only reception staff may request inactive doctors
  if (includeInactiveRequested && callerRole !== 'RECEPTION') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Only reception staff are permitted to view inactive doctors.'
    );
  }

  const shouldIncludeInactive = callerRole === 'RECEPTION' && includeInactiveRequested;

  const query = shouldIncludeInactive
    ? 'SELECT id, name, specialization, is_active, created_at FROM doctors ORDER BY id ASC'
    : 'SELECT id, name, specialization, is_active, created_at FROM doctors WHERE is_active = true ORDER BY id ASC';

  const result = await pool.query<{
    id: number;
    name: string;
    specialization: string | null;
    is_active: boolean;
    created_at: Date;
  }>(query);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    specialization: row.specialization,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function deactivateDoctor(doctorId: number): Promise<Doctor> {
  const result = await pool.query<{
    id: number;
    name: string;
    specialization: string | null;
    is_active: boolean;
    created_at: Date;
  }>(
    `UPDATE doctors
     SET is_active = false
     WHERE id = $1
     RETURNING id, name, specialization, is_active, created_at`,
    [doctorId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'DOCTOR_NOT_FOUND', `Doctor with ID ${doctorId} does not exist.`);
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    specialization: row.specialization,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function activateDoctor(doctorId: number): Promise<Doctor> {
  const result = await pool.query<{
    id: number;
    name: string;
    specialization: string | null;
    is_active: boolean;
    created_at: Date;
  }>(
    `UPDATE doctors
     SET is_active = true
     WHERE id = $1
     RETURNING id, name, specialization, is_active, created_at`,
    [doctorId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'DOCTOR_NOT_FOUND', `Doctor with ID ${doctorId} does not exist.`);
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    specialization: row.specialization,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

