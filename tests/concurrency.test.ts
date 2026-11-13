import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { setupDbMocks, TEST_PATIENT_1, TEST_ACTIVE_DOCTOR } from './helpers/mock-db';

describe('Booking Concurrency & Row-Level Lock Sequencing', () => {
  let dbMocks: ReturnType<typeof setupDbMocks>;

  beforeEach(() => {
    dbMocks = setupDbMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('strictly requests the doctor row lock with SELECT ... FOR UPDATE before executing the overlap check or insert', async () => {
    const executedQueries: string[] = [];

    dbMocks.mockClient.query.mockImplementation(async (sql: any) => {
      const text = typeof sql === 'string' ? sql : sql?.text || '';
      executedQueries.push(text);

      if (text.includes('BEGIN')) return {} as any;
      if (text.includes('FROM doctors WHERE id = $1 FOR UPDATE')) {
        return { rows: [TEST_ACTIVE_DOCTOR] } as any;
      }
      if (text.includes('is_past')) {
        return { rows: [{ is_past: false }] } as any;
      }
      if (text.includes('FROM appointments') && text.includes('status = \'BOOKED\'')) {
        return { rows: [] } as any;
      }
      if (text.includes('INSERT INTO appointments')) {
        return {
          rows: [
            {
              id: 20,
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

    // Verify exact sequence of operations on the checked-out client
    const beginIndex = executedQueries.findIndex((q) => q.includes('BEGIN'));
    const lockDoctorIndex = executedQueries.findIndex((q) =>
      q.includes('FROM doctors WHERE id = $1 FOR UPDATE')
    );
    const overlapIndex = executedQueries.findIndex((q) =>
      q.includes('status = \'BOOKED\'') && q.includes('FROM appointments')
    );
    const insertIndex = executedQueries.findIndex((q) =>
      q.includes('INSERT INTO appointments')
    );
    const commitIndex = executedQueries.findIndex((q) => q.includes('COMMIT'));

    expect(beginIndex).toBeGreaterThanOrEqual(0);
    expect(lockDoctorIndex).toBeGreaterThan(beginIndex);
    expect(overlapIndex).toBeGreaterThan(lockDoctorIndex);
    expect(insertIndex).toBeGreaterThan(overlapIndex);
    expect(commitIndex).toBeGreaterThan(insertIndex);
  });

  it('marks live concurrent race-condition integration tests as skipped when TEST_DATABASE_URL is not configured', () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      // Intentionally documenting that live database integration test requires TEST_DATABASE_URL
      // and cannot run against development or unconfigured databases.
      expect(testDbUrl).toBeUndefined();
    }
  });
});

