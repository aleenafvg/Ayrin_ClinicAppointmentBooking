import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { setupDbMocks, TEST_PATIENT_1, TEST_RECEPTION_USER } from './helpers/mock-db';

describe('Report Endpoint (GET /reports/appointments)', () => {
  let dbMocks: ReturnType<typeof setupDbMocks>;

  beforeEach(() => {
    dbMocks = setupDbMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows RECEPTION staff to retrieve the appointment report', async () => {
    let executedSql = '';
    let executedParams: any[] = [];

    dbMocks.poolQuery.mockImplementation(async (sql: any, params?: any) => {
      const text = typeof sql === 'string' ? sql : sql?.text || '';
      if (text.includes('FROM users WHERE id = $1')) {
        return { rows: [TEST_RECEPTION_USER] } as any;
      }
      if (text.includes('COUNT(a.id) FILTER')) {
        executedSql = text;
        executedParams = params || [];
        return {
          rows: [
            {
              doctor_id: 2,
              doctor_name: 'Dr. Meera Nambiar',
              specialization: 'Pediatrics',
              is_active: true,
              booked_count: '1',
              cancelled_count: '0',
            },
            {
              doctor_id: 1,
              doctor_name: 'Dr. Rajesh Kothari',
              specialization: 'General Medicine',
              is_active: true,
              booked_count: '0',
              cancelled_count: '0',
            },
          ],
        } as any;
      }
      return { rows: [] } as any;
    });

    const res = await request(app)
      .get('/reports/appointments?startDate=2026-12-01&endDate=2026-12-31')
      .set('X-User-Id', String(TEST_RECEPTION_USER.id));

    expect(res.status).toBe(200);
    expect(res.body.range).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      timeZone: 'Asia/Kolkata',
    });
    // Check counts converted to numbers
    expect(typeof res.body.data[0].bookedCount).toBe('number');
    expect(res.body.data[0].bookedCount).toBe(1);
    expect(typeof res.body.data[0].cancelledCount).toBe('number');
    expect(res.body.data[0].cancelledCount).toBe(0);

    // Verify SQL query structure
    expect(executedSql).toContain('FROM doctors d');
    expect(executedSql).toContain('LEFT JOIN appointments a');
    expect(executedSql).toContain('COUNT(a.id) FILTER (WHERE a.status = \'BOOKED\')');
    expect(executedSql).toContain('COUNT(a.id) FILTER (WHERE a.status = \'CANCELLED\')');
    expect(executedSql).toContain('GROUP BY d.id, d.name, d.specialization, d.is_active');
    expect(executedSql).toContain('ORDER BY d.name ASC, d.id ASC');

    // Verify date filters applied in the JOIN ON clause (not WHERE)
    expect(executedSql).toContain('ON a.doctor_id = d.id');
    expect(executedSql).toContain('AND a.start_time >= $1::timestamptz');
    expect(executedSql).toContain('AND a.start_time < $2::timestamptz');

    // Verify IST to UTC parameters
    // 2026-12-01 00:00:00 IST -> 2026-11-30 18:30:00 UTC
    // 2027-01-01 00:00:00 IST -> 2026-12-31 18:30:00 UTC
    expect(executedParams[0]).toBe('2026-11-30T18:30:00.000Z');
    expect(executedParams[1]).toBe('2026-12-31T18:30:00.000Z');
  });

  it('denies a PATIENT from accessing the report with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/reports/appointments?startDate=2026-12-01&endDate=2026-12-31')
      .set('X-User-Id', String(TEST_PATIENT_1.id));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects missing date parameters with 400 INVALID_DATE_RANGE', async () => {
    const res = await request(app)
      .get('/reports/appointments?startDate=2026-12-01')
      .set('X-User-Id', String(TEST_RECEPTION_USER.id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    expect(res.body.error.message).toContain('Both startDate and endDate query parameters are required');
  });

  it('rejects malformed date parameters with 400 INVALID_DATE_RANGE', async () => {
    const res = await request(app)
      .get('/reports/appointments?startDate=2026/12/01&endDate=2026/12/31')
      .set('X-User-Id', String(TEST_RECEPTION_USER.id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
  });

  it('rejects impossible calendar dates with 400 INVALID_DATE_RANGE', async () => {
    const res = await request(app)
      .get('/reports/appointments?startDate=2026-02-29&endDate=2026-03-01') // 2026 is not leap year
      .set('X-User-Id', String(TEST_RECEPTION_USER.id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
  });

  it('rejects an inverted date range (startDate > endDate) with 400 INVALID_DATE_RANGE', async () => {
    const res = await request(app)
      .get('/reports/appointments?startDate=2026-12-31&endDate=2026-12-01')
      .set('X-User-Id', String(TEST_RECEPTION_USER.id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    expect(res.body.error.message).toContain('cannot be later than endDate');
  });
});

