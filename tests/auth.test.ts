import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { setupDbMocks, TEST_PATIENT_1, TEST_RECEPTION_USER } from './helpers/mock-db';

describe('Authentication & Authorization (X-User-Id Middleware)', () => {
  let dbMocks: ReturnType<typeof setupDbMocks>;

  beforeEach(() => {
    dbMocks = setupDbMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests missing the X-User-Id header with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/doctors');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing required X-User-Id header.',
      },
    });
  });

  it('rejects requests with a non-numeric X-User-Id header with 401 INVALID_USER_ID', async () => {
    const res = await request(app)
      .get('/doctors')
      .set('X-User-Id', 'not-a-number');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'INVALID_USER_ID',
        message: 'X-User-Id header must be a positive integer representing a valid user ID.',
      },
    });
  });

  it('rejects requests with a zero or negative X-User-Id header with 401 INVALID_USER_ID', async () => {
    const res = await request(app)
      .get('/doctors')
      .set('X-User-Id', '-5');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'INVALID_USER_ID',
        message: 'X-User-Id header must be a positive integer representing a valid user ID.',
      },
    });
  });

  it('rejects requests with an unseeded / nonexistent X-User-Id with 401 USER_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/doctors')
      .set('X-User-Id', '9999');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'No user found with ID 9999. Please provide a valid seeded user ID.',
      },
    });
  });

  it('resolves caller identity and role strictly from database, preventing privilege escalation from request body', async () => {
    // Patient attempting to spoof reception role via request body
    const res = await request(app)
      .patch('/doctors/1/deactivate')
      .set('X-User-Id', String(TEST_PATIENT_1.id))
      .send({ role: 'RECEPTION' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Allowed roles: RECEPTION. Current role: PATIENT.');
  });

  it('denies a PATIENT access to reception-only endpoints with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/reports/appointments?startDate=2026-12-01&endDate=2026-12-31')
      .set('X-User-Id', String(TEST_PATIENT_1.id));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('grants a RECEPTION user access to reception-only endpoints', async () => {
    // Mock the report query response
    dbMocks.poolQuery.mockImplementation(async (sql: any) => {
      const text = typeof sql === 'string' ? sql : sql?.text || '';
      if (text.includes('FROM users WHERE id = $1')) {
        return { rows: [TEST_RECEPTION_USER] } as any;
      }
      if (text.includes('COUNT(a.id) FILTER')) {
        return { rows: [] } as any;
      }
      return { rows: [] } as any;
    });

    const res = await request(app)
      .get('/reports/appointments?startDate=2026-12-01&endDate=2026-12-31')
      .set('X-User-Id', String(TEST_RECEPTION_USER.id));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('range');
  });
});

