import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  setupDbMocks,
  TEST_PATIENT_1,
  TEST_PATIENT_2,
  TEST_RECEPTION_USER,
  TEST_ACTIVE_DOCTOR,
  TEST_INACTIVE_DOCTOR,
} from './helpers/mock-db';

describe('Appointment Endpoints', () => {
  let dbMocks: ReturnType<typeof setupDbMocks>;

  beforeEach(() => {
    dbMocks = setupDbMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /appointments', () => {
    it('creates an appointment successfully with status 201 for a valid patient request', async () => {
      const clientQueries: string[] = [];

      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        clientQueries.push(text);

        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('FROM doctors WHERE id = $1 FOR UPDATE')) {
          return { rows: [TEST_ACTIVE_DOCTOR] } as any;
        }
        if (text.includes('is_past')) {
          return { rows: [{ is_past: false }] } as any;
        }
        if (text.includes('FROM appointments') && text.includes('status = \'BOOKED\'')) {
          return { rows: [] } as any; // No overlap
        }
        if (text.includes('INSERT INTO appointments')) {
          return {
            rows: [
              {
                id: 10,
                doctor_id: 1,
                patient_id: 1,
                start_time: new Date('2026-12-01T05:30:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-11-14T00:00:00.000Z'),
                updated_at: new Date('2026-11-14T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('COMMIT')) return {} as any;

        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        id: 10,
        doctor: {
          id: 1,
          name: 'Dr. Rajesh Kothari',
          specialization: 'General Medicine',
        },
        patient: {
          id: 1,
          name: 'Aarav Sharma',
          email: 'aarav.sharma@clinic.test',
        },
        durationMinutes: 30,
        status: 'BOOKED',
      });
      // Verifies client checked out and lifecycle order
      expect(clientQueries[0]).toContain('BEGIN');
      expect(clientQueries[1]).toContain('SELECT id, name, specialization, is_active FROM doctors WHERE id = $1 FOR UPDATE');
      expect(clientQueries[clientQueries.length - 1]).toContain('COMMIT');
      expect(dbMocks.mockClient.release).toHaveBeenCalled();
    });

    it('rejects booking requests from a RECEPTION user with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 30,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects booking requests containing patientId in the body with 400 INVALID_REQUEST', async () => {
      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          patientId: 2,
          doctorId: 1,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 30,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REQUEST');
      expect(res.body.error.message).toContain('X-User-Id');
    });

    it('rejects invalid appointment duration with 400 INVALID_DURATION', async () => {
      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 20, // Not in [15, 30, 45, 60]
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DURATION');
    });

    it('rejects timestamps without explicit timezone with 400 INVALID_TIMEZONE', async () => {
      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-01T11:00:00', // Missing timezone offset
          durationMinutes: 30,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TIMEZONE');
    });

    it('rejects impossible calendar dates with 400 INVALID_TIMEZONE', async () => {
      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-02-31T11:00:00+05:30', // Feb 31 does not exist
          durationMinutes: 30,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TIMEZONE');
    });

    it('rejects booking an inactive doctor with 409 DOCTOR_INACTIVE', async () => {
      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('FROM doctors WHERE id = $1 FOR UPDATE')) {
          return { rows: [TEST_INACTIVE_DOCTOR] } as any;
        }
        if (text.includes('ROLLBACK')) return {} as any;
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 4,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 30,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DOCTOR_INACTIVE');
      expect(dbMocks.mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(dbMocks.mockClient.release).toHaveBeenCalled();
    });

    it('rejects an overlapping booking with 409 SLOT_CONFLICT and rolls back transaction', async () => {
      const executed: string[] = [];

      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        executed.push(text);

        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('FROM doctors WHERE id = $1 FOR UPDATE')) {
          return { rows: [TEST_ACTIVE_DOCTOR] } as any;
        }
        if (text.includes('is_past')) {
          return { rows: [{ is_past: false }] } as any;
        }
        if (text.includes('FROM appointments') && text.includes('status = \'BOOKED\'')) {
          // Simulate an overlapping appointment found
          return { rows: [{ id: 99 }] } as any;
        }
        if (text.includes('ROLLBACK')) return {} as any;

        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 30,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLOT_CONFLICT');
      expect(executed).toContain('ROLLBACK');
      expect(dbMocks.mockClient.release).toHaveBeenCalled();
    });

    it('allows booking when existing appointment in that window is CANCELLED (does not block)', async () => {
      let overlapSql = '';

      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';

        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('FROM doctors WHERE id = $1 FOR UPDATE')) {
          return { rows: [TEST_ACTIVE_DOCTOR] } as any;
        }
        if (text.includes('is_past')) {
          return { rows: [{ is_past: false }] } as any;
        }
        if (text.includes('FROM appointments')) {
          overlapSql = text;
          // Notice that the overlap query only looks for status = 'BOOKED'
          // Thus cancelled appointments do not match
          return { rows: [] } as any;
        }
        if (text.includes('INSERT INTO appointments')) {
          return {
            rows: [
              {
                id: 11,
                doctor_id: 1,
                patient_id: 1,
                start_time: new Date('2026-12-01T05:30:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-11-14T00:00:00.000Z'),
                updated_at: new Date('2026-11-14T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('COMMIT')) return {} as any;

        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-01T11:00:00+05:30',
          durationMinutes: 30,
        });

      expect(res.status).toBe(201);
      expect(overlapSql).toContain("status = 'BOOKED'");
    });

    it('uses half-open interval logic allowing exact back-to-back bookings', async () => {
      let overlapSql = '';

      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';

        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('FROM doctors WHERE id = $1 FOR UPDATE')) {
          return { rows: [TEST_ACTIVE_DOCTOR] } as any;
        }
        if (text.includes('is_past')) {
          return { rows: [{ is_past: false }] } as any;
        }
        if (text.includes('FROM appointments')) {
          overlapSql = text;
          return { rows: [] } as any;
        }
        if (text.includes('INSERT INTO appointments')) {
          return {
            rows: [
              {
                id: 12,
                doctor_id: 1,
                patient_id: 1,
                start_time: new Date('2026-12-05T09:30:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-11-14T00:00:00.000Z'),
                updated_at: new Date('2026-11-14T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('COMMIT')) return {} as any;

        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id))
        .send({
          doctorId: 1,
          startTime: '2026-12-05T15:00:00+05:30', // Starts exactly when previous slot (14:00-15:00) ended
          durationMinutes: 30,
        });

      expect(res.status).toBe(201);
      // Strictly '<' and '>' prevent back-to-back equality from triggering false overlap
      expect(overlapSql).toContain('start_time < ($2::timestamptz + ($3 * INTERVAL \'1 minute\'))');
      expect(overlapSql).toContain('(start_time + (duration_minutes * INTERVAL \'1 minute\')) > $2::timestamptz');
    });
  });

  describe('GET /appointments', () => {
    it('returns only the patient\'s own appointments for a PATIENT caller', async () => {
      let executedFilter = '';

      dbMocks.poolQuery.mockImplementation(async (sql: any, params?: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_PATIENT_1] } as any;
        }
        if (text.includes('COUNT(*) AS total')) {
          return { rows: [{ total: '1' }] } as any;
        }
        if (text.includes('FROM appointments a')) {
          executedFilter = text;
          return {
            rows: [
              {
                id: 1,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 1,
                patient_name: 'Aarav Sharma',
                patient_email: 'aarav.sharma@clinic.test',
                start_time: new Date('2026-10-15T03:30:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/appointments')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(200);
      expect(executedFilter).toContain('WHERE a.patient_id = $1');
      expect(res.body.pagination).toEqual({ total: 1, limit: 20, offset: 0 });
      expect(res.body.data[0].patient.id).toBe(TEST_PATIENT_1.id);
    });

    it('allows RECEPTION staff to view appointments for all patients', async () => {
      let executedFilter = '';

      dbMocks.poolQuery.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_RECEPTION_USER] } as any;
        }
        if (text.includes('COUNT(*) AS total')) {
          return { rows: [{ total: '5' }] } as any;
        }
        if (text.includes('FROM appointments a')) {
          executedFilter = text;
          return {
            rows: [
              {
                id: 1,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 1,
                patient_name: 'Aarav Sharma',
                patient_email: 'aarav.sharma@clinic.test',
                start_time: new Date('2026-10-15T03:30:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
              {
                id: 2,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 2,
                patient_name: 'Priya Patel',
                patient_email: 'priya.patel@clinic.test',
                start_time: new Date('2026-10-15T04:30:00.000Z'),
                duration_minutes: 15,
                status: 'CANCELLED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/appointments')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(200);
      expect(executedFilter).not.toContain('WHERE a.patient_id = $1');
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.data).toHaveLength(2);
    });

    it('rejects invalid pagination parameters with 400 INVALID_PAGINATION', async () => {
      const res = await request(app)
        .get('/appointments?limit=150') // Exceeds max 100
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });
  });

  describe('PATCH /appointments/:id/cancel', () => {
    it('allows a patient to cancel their own appointment', async () => {
      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('SELECT') && text.includes('FROM appointments a') && text.includes('FOR UPDATE OF a')) {
          return {
            rows: [
              {
                id: 1,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 1, // Matches caller Aarav (1)
                patient_name: 'Aarav Sharma',
                patient_email: 'aarav.sharma@clinic.test',
                start_time: new Date('2026-12-05T14:00:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('UPDATE appointments') && text.includes('status = \'CANCELLED\'')) {
          return {
            rows: [
              {
                id: 1,
                doctor_id: 1,
                patient_id: 1,
                start_time: new Date('2026-12-05T14:00:00.000Z'),
                duration_minutes: 30,
                status: 'CANCELLED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-11-14T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('COMMIT')) return {} as any;
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/appointments/1/cancel')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(dbMocks.mockClient.release).toHaveBeenCalled();
    });

    it('denies a patient from cancelling another patient\'s appointment with 403 FORBIDDEN', async () => {
      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('SELECT') && text.includes('FROM appointments a')) {
          return {
            rows: [
              {
                id: 2,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 2, // Belongs to Priya (2), not caller Aarav (1)
                patient_name: 'Priya Patel',
                patient_email: 'priya.patel@clinic.test',
                start_time: new Date('2026-12-05T14:00:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('ROLLBACK')) return {} as any;
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/appointments/2/cancel')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows RECEPTION staff to cancel an appointment belonging to any patient', async () => {
      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('SELECT') && text.includes('FROM appointments a')) {
          return {
            rows: [
              {
                id: 2,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 2, // Patient Priya
                patient_name: 'Priya Patel',
                patient_email: 'priya.patel@clinic.test',
                start_time: new Date('2026-12-05T14:00:00.000Z'),
                duration_minutes: 30,
                status: 'BOOKED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('UPDATE appointments')) {
          return {
            rows: [
              {
                id: 2,
                doctor_id: 1,
                patient_id: 2,
                start_time: new Date('2026-12-05T14:00:00.000Z'),
                duration_minutes: 30,
                status: 'CANCELLED',
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-11-14T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('COMMIT')) return {} as any;
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/appointments/2/cancel')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id)); // Reception caller

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('returns 409 ALREADY_CANCELLED when cancelling an appointment that is already cancelled', async () => {
      dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('BEGIN')) return {} as any;
        if (text.includes('SELECT') && text.includes('FROM appointments a')) {
          return {
            rows: [
              {
                id: 1,
                doctor_id: 1,
                doctor_name: 'Dr. Rajesh Kothari',
                doctor_specialization: 'General Medicine',
                patient_id: 1,
                patient_name: 'Aarav Sharma',
                patient_email: 'aarav.sharma@clinic.test',
                start_time: new Date('2026-12-05T14:00:00.000Z'),
                duration_minutes: 30,
                status: 'CANCELLED', // Already cancelled
                created_at: new Date('2026-10-01T00:00:00.000Z'),
                updated_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        if (text.includes('ROLLBACK')) return {} as any;
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/appointments/1/cancel')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_CANCELLED');
    });
  });
});

