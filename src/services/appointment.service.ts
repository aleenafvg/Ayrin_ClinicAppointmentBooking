import { pool } from '../db';
import {
  AppointmentResponse,
  CreateAppointmentDTO,
  ListAppointmentsFilter,
  PaginatedResult,
  PaginationParams,
  User,
} from '../types';
import { AppError } from '../middleware/error-handler';

// Evaluates whether an appointment slot in Asia/Kolkata starts at or after 9:00 AM
// and concludes at or before 9:00 PM on the same IST calendar date.
export function isWithinClinicHours(startTime: string | Date, durationMinutes: number): boolean {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  if (isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const getSecondsAndDate = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(d);

    const find = (type: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    const dateStr = `${find('year')}-${find('month')}-${find('day')}`;
    const seconds = find('hour') * 3600 + find('minute') * 60 + find('second');
    return { dateStr, seconds };
  };

  const startInfo = getSecondsAndDate(start);
  const endInfo = getSecondsAndDate(end);

  // Must not cross midnight into another date in IST
  if (startInfo.dateStr !== endInfo.dateStr) return false;

  // 9:00 AM = 9 * 3600 = 32400 seconds
  // 9:00 PM = 21 * 3600 = 75600 seconds
  if (startInfo.seconds < 32400 || endInfo.seconds > 75600) {
    return false;
  }

  return true;
}

export async function createAppointment(
  caller: User,
  dto: CreateAppointmentDTO
): Promise<AppointmentResponse> {
  // Only users with role PATIENT can book appointments
  if (caller.role !== 'PATIENT') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Only patients are permitted to book appointments.'
    );
  }

  const { doctorId, startTime, durationMinutes } = dto;

  // Use a dedicated client for transaction and concurrency locking
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock doctor row with SELECT ... FOR UPDATE for concurrency protection.
    // This serializes concurrent booking attempts for the same doctor,
    // ensuring two patients cannot book overlapping slots simultaneously.
    const doctorRes = await client.query<{
      id: number;
      name: string;
      specialization: string | null;
      is_active: boolean;
    }>(
      'SELECT id, name, specialization, is_active FROM doctors WHERE id = $1 FOR UPDATE',
      [doctorId]
    );

    if (doctorRes.rows.length === 0) {
      throw new AppError(404, 'DOCTOR_NOT_FOUND', `Doctor with ID ${doctorId} does not exist.`);
    }

    const doctor = doctorRes.rows[0];

    if (!doctor.is_active) {
      throw new AppError(
        409,
        'DOCTOR_INACTIVE',
        `Cannot book an appointment with ${doctor.name} because the doctor is currently inactive.`
      );
    }

    // 2. Clinic booking hours validation (Asia/Kolkata timezone: 9:00 AM to 9:00 PM IST)
    // - Appointments can only be scheduled between 9:00 AM and 9:00 PM IST.
    // - The appointment must start at or after 9:00 AM and finish at or before 9:00 PM.
    if (!isWithinClinicHours(startTime, durationMinutes)) {
      throw new AppError(
        422,
        'OUTSIDE_CLINIC_HOURS',
        'This appointment cannot be booked because it falls outside clinic hours. Please select an earlier time between 9:00 AM and 9:00 PM.'
      );
    }

    // 3. Authoritative check: Start time must not be in the past, evaluated using DB wall clock.
    // Using clock_timestamp() rather than CURRENT_TIMESTAMP because CURRENT_TIMESTAMP freezes
    // at transaction start. If the transaction waited for a doctor row lock, clock_timestamp()
    // reflects the real wall clock time after acquiring the lock.
    const clockCheck = await client.query<{ is_past: boolean }>(
      'SELECT ($1::timestamptz <= clock_timestamp()) AS is_past',
      [startTime]
    );

    if (clockCheck.rows[0].is_past) {
      throw new AppError(
        422,
        'PAST_APPOINTMENT',
        'Appointment start time must be in the future based on clinic clock.'
      );
    }

    // 3. Half-open interval overlap check against existing BOOKED appointments:
    // [existing_start, existing_end) overlaps [requested_start, requested_end) if:
    //   existing.start_time < requested_end
    //   AND (existing.start_time + existing.duration_minutes * interval '1 min') > requested_start
    // Cancelled appointments do NOT block slots. Exact back-to-back appointments are allowed.
    const overlapRes = await client.query<{ id: number }>(
      `SELECT id
       FROM appointments
       WHERE doctor_id = $1
         AND status = 'BOOKED'
         AND start_time < ($2::timestamptz + ($3 * INTERVAL '1 minute'))
         AND (start_time + (duration_minutes * INTERVAL '1 minute')) > $2::timestamptz
       FOR UPDATE`,
      [doctorId, startTime, durationMinutes]
    );

    if (overlapRes.rows.length > 0) {
      throw new AppError(
        409,
        'SLOT_CONFLICT',
        `Doctor ${doctor.name} already has a booked appointment during this time window.`
      );
    }

    // 4. Insert the new appointment atomically conditioned on the instant being strictly in the future.
    // Enforcing $3::timestamptz > clock_timestamp() directly in the INSERT query prevents the slot
    // from becoming past between earlier checks and the actual database insertion.
    const insertRes = await client.query<{
      id: number;
      doctor_id: number;
      patient_id: number;
      start_time: Date;
      duration_minutes: number;
      status: 'BOOKED';
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO appointments (doctor_id, patient_id, start_time, duration_minutes, status)
       SELECT $1, $2, $3::timestamptz, $4, 'BOOKED'
       WHERE $3::timestamptz > clock_timestamp()
       RETURNING id, doctor_id, patient_id, start_time, duration_minutes, status, created_at, updated_at`,
      [doctorId, caller.id, startTime, durationMinutes]
    );

    if (insertRes.rows.length === 0) {
      throw new AppError(
        422,
        'PAST_APPOINTMENT',
        'Appointment start time must be in the future based on clinic clock.'
      );
    }

    await client.query('COMMIT');

    const appt = insertRes.rows[0];

    return {
      id: appt.id,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
      },
      patient: {
        id: caller.id,
        name: caller.name,
        email: caller.email,
      },
      startTime: appt.start_time.toISOString(),
      durationMinutes: appt.duration_minutes,
      status: appt.status,
      createdAt: appt.created_at.toISOString(),
      updatedAt: appt.updated_at.toISOString(),
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error(
        'Error during booking rollback:',
        rollbackErr instanceof Error ? rollbackErr.message : rollbackErr
      );
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function listAppointments(
  caller: User,
  pagination: PaginationParams,
  filter?: ListAppointmentsFilter
): Promise<PaginatedResult<AppointmentResponse>> {
  const { limit, offset } = pagination;

  // Role-based visibility:
  // - Patients receive only their own appointments
  // - Reception staff receive appointments for all patients
  const isPatient = caller.role === 'PATIENT';

  const conditions: string[] = [];
  const params: any[] = [];

  if (isPatient) {
    params.push(caller.id);
    conditions.push(`a.patient_id = $${params.length}`);
  }

  if (filter?.doctorId) {
    params.push(filter.doctorId);
    conditions.push(`a.doctor_id = $${params.length}`);
  }

  if (filter?.startDate) {
    params.push(new Date(filter.startDate));
    conditions.push(`a.start_time >= $${params.length}`);
  }

  if (filter?.endDate) {
    params.push(new Date(filter.endDate));
    conditions.push(`a.start_time < $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const countQuery = `SELECT COUNT(*) AS total FROM appointments a ${whereClause}`;

  const appointmentsQuery = `
    SELECT
      a.id,
      a.doctor_id,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization,
      a.patient_id,
      u.name AS patient_name,
      u.email AS patient_email,
      a.start_time,
      a.duration_minutes,
      a.status,
      a.created_at,
      a.updated_at
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    JOIN users u ON u.id = a.patient_id
    ${whereClause}
    ORDER BY a.start_time ASC, a.id ASC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const [countResult, listResult] = await Promise.all([
    pool.query<{ total: string }>(countQuery, countParams),
    pool.query<{
      id: number;
      doctor_id: number;
      doctor_name: string;
      doctor_specialization: string | null;
      patient_id: number;
      patient_name: string;
      patient_email: string;
      start_time: Date;
      duration_minutes: number;
      status: 'BOOKED' | 'CANCELLED';
      created_at: Date;
      updated_at: Date;
    }>(appointmentsQuery, params),
  ]);

  const total = parseInt(countResult.rows[0].total, 10);

  const data: AppointmentResponse[] = listResult.rows.map((row) => ({
    id: row.id,
    doctor: {
      id: row.doctor_id,
      name: row.doctor_name,
      specialization: row.doctor_specialization,
    },
    // Only include patient details if caller is reception, or caller is the patient themselves
    patient: {
      id: row.patient_id,
      name: row.patient_name,
      email: row.patient_email,
    },
    startTime: row.start_time.toISOString(),
    durationMinutes: row.duration_minutes,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
    },
  };
}

export async function cancelAppointment(
  caller: User,
  appointmentId: number
): Promise<AppointmentResponse> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the appointment row with FOR UPDATE OF a to guarantee atomic cancellation
    // and prevent race conditions if concurrent cancellation requests arrive.
    const result = await client.query<{
      id: number;
      doctor_id: number;
      doctor_name: string;
      doctor_specialization: string | null;
      patient_id: number;
      patient_name: string;
      patient_email: string;
      start_time: Date;
      duration_minutes: number;
      status: 'BOOKED' | 'CANCELLED';
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
         a.id,
         a.doctor_id,
         d.name AS doctor_name,
         d.specialization AS doctor_specialization,
         a.patient_id,
         u.name AS patient_name,
         u.email AS patient_email,
         a.start_time,
         a.duration_minutes,
         a.status,
         a.created_at,
         a.updated_at
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = a.patient_id
       WHERE a.id = $1
       FOR UPDATE OF a`,
      [appointmentId]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        404,
        'APPOINTMENT_NOT_FOUND',
        `Appointment with ID ${appointmentId} was not found.`
      );
    }

    const appt = result.rows[0];

    // Ownership check: patients can only cancel their own appointments
    if (caller.role === 'PATIENT' && appt.patient_id !== caller.id) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You are not authorized to cancel another patient’s appointment.'
      );
    }

    // Status check: only BOOKED appointments can be cancelled.
    // If a concurrent cancellation request just committed, the locked row
    // will now have status 'CANCELLED', ensuring the second request receives 409.
    if (appt.status === 'CANCELLED') {
      throw new AppError(
        409,
        'ALREADY_CANCELLED',
        'This appointment has already been cancelled.'
      );
    }

    const updateResult = await client.query<{
      id: number;
      doctor_id: number;
      patient_id: number;
      start_time: Date;
      duration_minutes: number;
      status: 'CANCELLED';
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE appointments
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1
       RETURNING id, doctor_id, patient_id, start_time, duration_minutes, status, created_at, updated_at`,
      [appointmentId]
    );

    await client.query('COMMIT');

    const updated = updateResult.rows[0];

    return {
      id: updated.id,
      doctor: {
        id: appt.doctor_id,
        name: appt.doctor_name,
        specialization: appt.doctor_specialization,
      },
      patient: {
        id: appt.patient_id,
        name: appt.patient_name,
        email: appt.patient_email,
      },
      startTime: updated.start_time.toISOString(),
      durationMinutes: updated.duration_minutes,
      status: updated.status,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error(
        'Error during cancellation rollback:',
        rollbackErr instanceof Error ? rollbackErr.message : rollbackErr
      );
    }
    throw err;
  } finally {
    client.release();
  }
}

