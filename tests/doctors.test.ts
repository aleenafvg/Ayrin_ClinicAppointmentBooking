import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  setupDbMocks,
  TEST_PATIENT_1,
  TEST_RECEPTION_USER,
  TEST_ACTIVE_DOCTOR,
  TEST_INACTIVE_DOCTOR,
} from './helpers/mock-db';

describe('Doctor Endpoints', () => {
  let dbMocks: ReturnType<typeof setupDbMocks>;

  beforeEach(() => {
    dbMocks = setupDbMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /doctors', () => {
    it('returns only active doctors for a PATIENT caller', async () => {
      let executedQuery = '';

      dbMocks.poolQuery.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_PATIENT_1] } as any;
        }
        if (text.includes('FROM doctors')) {
          executedQuery = text;
          return { rows: [TEST_ACTIVE_DOCTOR] } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/doctors')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(200);
      expect(executedQuery).toContain('WHERE is_active = true');
      expect(res.body.data).toEqual([
        {
          id: TEST_ACTIVE_DOCTOR.id,
          name: TEST_ACTIVE_DOCTOR.name,
          specialization: TEST_ACTIVE_DOCTOR.specialization,
          isActive: true,
          createdAt: TEST_ACTIVE_DOCTOR.created_at.toISOString(),
        },
      ]);
    });

    it('denies a PATIENT from requesting inactive doctors with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/doctors?includeInactive=true')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({
        code: 'FORBIDDEN',
        message: 'Only reception staff are permitted to view inactive doctors.',
      });
    });

    it('allows RECEPTION staff to request inactive doctors using includeInactive=true', async () => {
      let executedQuery = '';

      dbMocks.poolQuery.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_RECEPTION_USER] } as any;
        }
        if (text.includes('FROM doctors')) {
          executedQuery = text;
          return { rows: [TEST_ACTIVE_DOCTOR, TEST_INACTIVE_DOCTOR] } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/doctors?includeInactive=true')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(200);
      expect(executedQuery).not.toContain('WHERE is_active = true');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[1].isActive).toBe(false);
    });
  });

  describe('PATCH /doctors/:id/deactivate', () => {
    it('allows RECEPTION staff to deactivate an existing active doctor', async () => {
      let executedSql = '';
      let executedParams: any[] = [];

      dbMocks.poolQuery.mockImplementation(async (sql: any, params?: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_RECEPTION_USER] } as any;
        }
        if (text.includes('UPDATE doctors')) {
          executedSql = text;
          executedParams = params || [];
          return {
            rows: [
              {
                id: 1,
                name: 'Dr. Rajesh Kothari',
                specialization: 'General Medicine',
                is_active: false,
                created_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/doctors/1/deactivate')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(200);
      expect(executedSql).toContain('SET is_active = false');
      expect(executedParams).toEqual([1]);
      expect(res.body.data.isActive).toBe(false);
    });

    it('denies a PATIENT from deactivating a doctor with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch('/doctors/1/deactivate')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 DOCTOR_NOT_FOUND when attempting to deactivate a nonexistent doctor', async () => {
      dbMocks.poolQuery.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_RECEPTION_USER] } as any;
        }
        if (text.includes('UPDATE doctors')) {
          return { rows: [] } as any; // No doctor updated
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/doctors/9999/deactivate')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });

    it('returns 400 INVALID_DOCTOR_ID when doctor ID is invalid', async () => {
      const res = await request(app)
        .patch('/doctors/invalid-id/deactivate')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DOCTOR_ID');
    });
  });

  describe('PATCH /doctors/:id/activate', () => {
    it('allows RECEPTION staff to reactivate an inactive doctor', async () => {
      let executedSql = '';
      let executedParams: any[] = [];

      dbMocks.poolQuery.mockImplementation(async (sql: any, params?: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_RECEPTION_USER] } as any;
        }
        if (text.includes('UPDATE doctors')) {
          executedSql = text;
          executedParams = params || [];
          return {
            rows: [
              {
                id: 2,
                name: 'Dr. Priya Sharma',
                specialization: 'Pediatrics',
                is_active: true,
                created_at: new Date('2026-10-01T00:00:00.000Z'),
              },
            ],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/doctors/2/activate')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(200);
      expect(executedSql).toContain('SET is_active = true');
      expect(executedParams).toEqual([2]);
      expect(res.body.data.isActive).toBe(true);
    });

    it('denies a PATIENT from activating a doctor with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch('/doctors/2/activate')
        .set('X-User-Id', String(TEST_PATIENT_1.id));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 UNAUTHORIZED when no caller header is provided', async () => {
      const res = await request(app).patch('/doctors/2/activate');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 DOCTOR_NOT_FOUND when attempting to activate a nonexistent doctor', async () => {
      dbMocks.poolQuery.mockImplementation(async (sql: any) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes('FROM users WHERE id = $1')) {
          return { rows: [TEST_RECEPTION_USER] } as any;
        }
        if (text.includes('UPDATE doctors')) {
          return { rows: [] } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .patch('/doctors/9999/activate')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });

    it('returns 400 INVALID_DOCTOR_ID when doctor ID is invalid', async () => {
      const res = await request(app)
        .patch('/doctors/invalid-id/activate')
        .set('X-User-Id', String(TEST_RECEPTION_USER.id));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DOCTOR_ID');
    });
  });
});

