import { pool } from './index';

interface UserSeed {
  name: string;
  email: string;
  role: 'PATIENT' | 'RECEPTION';
}

interface DoctorSeed {
  name: string;
  specialization: string;
  isActive: boolean;
}

interface AppointmentSeed {
  doctorName: string;
  patientEmail: string;
  startTime: string; // ISO 8601 with explicit timezone
  durationMinutes: 15 | 30 | 45 | 60;
  status: 'BOOKED' | 'CANCELLED';
  notes?: string;
}

// ---------------------------------------------------------------------------
// Seed Data Definitions
// ---------------------------------------------------------------------------

// At least 4 patients and 2 reception staff members with .test domain emails
const SEED_USERS: UserSeed[] = [
  // Patients
  { name: 'Aarav Sharma', email: 'aarav.sharma@clinic.test', role: 'PATIENT' },
  { name: 'Priya Patel', email: 'priya.patel@clinic.test', role: 'PATIENT' },
  { name: 'Rohan Gupta', email: 'rohan.gupta@clinic.test', role: 'PATIENT' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@clinic.test', role: 'PATIENT' },
  // Reception staff
  { name: 'Deepak Verma', email: 'deepak.verma@clinic.test', role: 'RECEPTION' },
  { name: 'Sunita Rao', email: 'sunita.rao@clinic.test', role: 'RECEPTION' },
];

// At least 4 doctors covering multiple specialties, with at least one inactive
const SEED_DOCTORS: DoctorSeed[] = [
  { name: 'Dr. Rajesh Kothari', specialization: 'General Medicine', isActive: true },
  { name: 'Dr. Meera Nambiar', specialization: 'Pediatrics', isActive: true },
  { name: 'Dr. Vikram Sethi', specialization: 'Cardiology', isActive: true },
  { name: 'Dr. Sneha Desai', specialization: 'Dermatology', isActive: false }, // Inactive doctor
];

// At least 4 appointments covering:
// - Multiple doctors and patients
// - Allowed durations: 15, 30, 45, 60 minutes
// - Both BOOKED and CANCELLED statuses
// - Past and future sample dates with explicit timezone offset (+05:30)
// - No overlapping BOOKED appointments for the same doctor
// - Back-to-back non-overlapping appointments demonstrated
const SEED_APPOINTMENTS: AppointmentSeed[] = [
  {
    // Past, BOOKED, 30 min, General Medicine
    doctorName: 'Dr. Rajesh Kothari',
    patientEmail: 'aarav.sharma@clinic.test',
    startTime: '2026-10-15T09:00:00+05:30',
    durationMinutes: 30,
    status: 'BOOKED',
    notes: 'Past routine checkup',
  },
  {
    // Past, CANCELLED, 15 min, General Medicine (10:00 does not conflict with 09:00-09:30)
    doctorName: 'Dr. Rajesh Kothari',
    patientEmail: 'priya.patel@clinic.test',
    startTime: '2026-10-15T10:00:00+05:30',
    durationMinutes: 15,
    status: 'CANCELLED',
    notes: 'Past consultation cancelled by patient',
  },
  {
    // Future, BOOKED, 45 min, Pediatrics
    doctorName: 'Dr. Meera Nambiar',
    patientEmail: 'rohan.gupta@clinic.test',
    startTime: '2026-12-01T11:00:00+05:30',
    durationMinutes: 45,
    status: 'BOOKED',
    notes: 'Future pediatric appointment',
  },
  {
    // Future, BOOKED, 60 min, Cardiology
    doctorName: 'Dr. Vikram Sethi',
    patientEmail: 'ananya.iyer@clinic.test',
    startTime: '2026-12-05T14:00:00+05:30',
    durationMinutes: 60,
    status: 'BOOKED',
    notes: 'Future cardiac evaluation (ends at 15:00)',
  },
  {
    // Future, BOOKED, 30 min, Cardiology (15:00:00 is exact back-to-back with the 14:00-15:00 booking)
    doctorName: 'Dr. Vikram Sethi',
    patientEmail: 'aarav.sharma@clinic.test',
    startTime: '2026-12-05T15:00:00+05:30',
    durationMinutes: 30,
    status: 'BOOKED',
    notes: 'Back-to-back follow-up (starts exactly when previous appointment ends)',
  },
];

// ---------------------------------------------------------------------------
// Seeding Execution
// ---------------------------------------------------------------------------

interface SeedSummary {
  users: { inserted: number; existing: number; total: number };
  doctors: { inserted: number; existing: number; total: number };
  appointments: { inserted: number; existing: number; total: number };
}

interface LoadedUser {
  id: number;
  name: string;
  email: string;
  role: 'PATIENT' | 'RECEPTION';
  isNew: boolean;
}

interface LoadedDoctor {
  id: number;
  name: string;
  specialization: string | null;
  isActive: boolean;
  isNew: boolean;
}

export async function seed(): Promise<void> {
  console.log('Starting database seeding...');

  const summary: SeedSummary = {
    users: { inserted: 0, existing: 0, total: 0 },
    doctors: { inserted: 0, existing: 0, total: 0 },
    appointments: { inserted: 0, existing: 0, total: 0 },
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed Users (idempotent lookup by unique email)
    const userMap = new Map<string, LoadedUser>();

    for (const u of SEED_USERS) {
      const existing = await client.query<{
        id: number;
        name: string;
        email: string;
        role: 'PATIENT' | 'RECEPTION';
      }>('SELECT id, name, email, role FROM users WHERE email = $1', [u.email]);

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (row.role !== u.role) {
          throw new Error(
            `User role mismatch for existing user ${u.email}: expected '${u.role}', found '${row.role}' in database.`
          );
        }
        userMap.set(u.email, { ...row, isNew: false });
        summary.users.existing++;
      } else {
        const insertRes = await client.query<{
          id: number;
          name: string;
          email: string;
          role: 'PATIENT' | 'RECEPTION';
        }>(
          'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id, name, email, role',
          [u.name, u.email, u.role]
        );
        const row = insertRes.rows[0];
        userMap.set(u.email, { ...row, isNew: true });
        summary.users.inserted++;
      }
    }
    summary.users.total = SEED_USERS.length;

    // 2. Seed Doctors (idempotent lookup by doctor name)
    const doctorMap = new Map<string, LoadedDoctor>();

    for (const d of SEED_DOCTORS) {
      const existing = await client.query<{
        id: number;
        name: string;
        specialization: string | null;
        is_active: boolean;
      }>('SELECT id, name, specialization, is_active FROM doctors WHERE name = $1', [d.name]);

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        doctorMap.set(d.name, {
          id: row.id,
          name: row.name,
          specialization: row.specialization,
          isActive: row.is_active,
          isNew: false,
        });
        summary.doctors.existing++;
      } else {
        const insertRes = await client.query<{
          id: number;
          name: string;
          specialization: string | null;
          is_active: boolean;
        }>(
          'INSERT INTO doctors (name, specialization, is_active) VALUES ($1, $2, $3) RETURNING id, name, specialization, is_active',
          [d.name, d.specialization, d.isActive]
        );
        const row = insertRes.rows[0];
        doctorMap.set(d.name, {
          id: row.id,
          name: row.name,
          specialization: row.specialization,
          isActive: row.is_active,
          isNew: true,
        });
        summary.doctors.inserted++;
      }
    }
    summary.doctors.total = SEED_DOCTORS.length;

    // 3. Seed Appointments (idempotent lookup by doctor_id + start_time)
    for (const a of SEED_APPOINTMENTS) {
      const doctor = doctorMap.get(a.doctorName);
      if (!doctor) {
        throw new Error(`Referenced doctor not found in seed map: ${a.doctorName}`);
      }

      const patient = userMap.get(a.patientEmail);
      if (!patient) {
        throw new Error(`Referenced patient email not found in seed map: ${a.patientEmail}`);
      }

      // Safety check: ensure appointment patient has role PATIENT (never RECEPTION)
      if (patient.role !== 'PATIENT') {
        throw new Error(
          `Invalid appointment seed: User ${patient.name} (${patient.email}) has role '${patient.role}', but appointments must reference a user with role 'PATIENT'.`
        );
      }

      // Query using the full natural composite key (doctor_id, patient_id, start_time)
      // to uniquely recognize this exact seed appointment on repeated runs.
      const exactExisting = await client.query<{ id: number }>(
        'SELECT id FROM appointments WHERE doctor_id = $1 AND patient_id = $2 AND start_time = $3',
        [doctor.id, patient.id, a.startTime]
      );

      if (exactExisting.rows.length > 0) {
        summary.appointments.existing++;
      } else {
        // Complete half-open interval overlap collision guard:
        // [new_start, new_end) overlaps with [existing_start, existing_end) if and only if:
        //   existing.start_time < new_end
        //   AND existing.start_time + existing.duration_minutes * INTERVAL '1 minute' > new_start
        // Only existing appointments with status = 'BOOKED' block a new BOOKED seed appointment.
        // CANCELLED appointments do not block bookings.
        // Back-to-back appointments (where one ends exactly when the other starts) do not overlap.
        if (a.status === 'BOOKED') {
          const slotConflict = await client.query<{ id: number; patient_id: number }>(
            `SELECT id, patient_id
             FROM appointments
             WHERE doctor_id = $1
               AND status = 'BOOKED'
               AND start_time < ($2::timestamptz + ($3 * INTERVAL '1 minute'))
               AND (start_time + (duration_minutes * INTERVAL '1 minute')) > $2::timestamptz`,
            [doctor.id, a.startTime, a.durationMinutes]
          );

          if (slotConflict.rows.length > 0) {
            throw new Error(
              `Cannot seed appointment for ${doctor.name} at ${a.startTime}: overlaps with existing booked appointment (ID ${slotConflict.rows[0].id}) for patient ID ${slotConflict.rows[0].patient_id}.`
            );
          }
        }

        await client.query(
          `INSERT INTO appointments (doctor_id, patient_id, start_time, duration_minutes, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [doctor.id, patient.id, a.startTime, a.durationMinutes, a.status]
        );
        summary.appointments.inserted++;
      }
    }
    summary.appointments.total = SEED_APPOINTMENTS.length;

    await client.query('COMMIT');
    console.log('Seeding transaction committed successfully.');

    // -----------------------------------------------------------------------
    // Summary & Output
    // -----------------------------------------------------------------------
    console.log('\n--- Seeding Summary ---');
    console.log(
      `Users:        ${summary.users.inserted} inserted, ${summary.users.existing} already existed (Total: ${summary.users.total})`
    );
    console.log(
      `Doctors:      ${summary.doctors.inserted} inserted, ${summary.doctors.existing} already existed (Total: ${summary.doctors.total})`
    );
    console.log(
      `Appointments: ${summary.appointments.inserted} inserted, ${summary.appointments.existing} already existed (Total: ${summary.appointments.total})`
    );

    console.log('\n--- Seeded Users for API Testing (X-User-Id) ---');
    console.log('Use these IDs in subsequent API calls via the X-User-Id header:');
    console.table(
      Array.from(userMap.values()).map((u) => ({
        ID: u.id,
        Role: u.role,
        Name: u.name,
        Email: u.email,
        Status: u.isNew ? 'New' : 'Existing',
      }))
    );

    console.log('\n--- Seeded Doctors ---');
    console.table(
      Array.from(doctorMap.values()).map((d) => ({
        ID: d.id,
        Name: d.name,
        Specialization: d.specialization,
        Active: d.isActive ? 'Yes' : 'No (Inactive)',
        Status: d.isNew ? 'New' : 'Existing',
      }))
    );
  } catch (err) {
    try {
      await client.query('ROLLBACK');
      console.log('Seeding transaction rolled back.');
    } catch (rollbackErr) {
      console.error(
        'Error during ROLLBACK:',
        rollbackErr instanceof Error ? rollbackErr.message : rollbackErr
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Seeding failed: ${message}`);
    throw err;
  } finally {
    client.release();
  }
}

// Standalone execution wrapper
if (require.main === module) {
  seed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(
        'Seed execution error:',
        err instanceof Error ? err.message : err
      );
      await pool.end().catch(() => {});
      process.exit(1);
    });
}
