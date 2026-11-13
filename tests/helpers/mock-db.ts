import { vi } from 'vitest';
import { pool } from '../../src/db';

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: 'PATIENT' | 'RECEPTION';
  created_at: Date;
}

export interface MockDoctor {
  id: number;
  name: string;
  specialization: string | null;
  is_active: boolean;
  created_at: Date;
}

export const TEST_PATIENT_1: MockUser = {
  id: 1,
  name: 'Aarav Sharma',
  email: 'aarav.sharma@clinic.test',
  role: 'PATIENT',
  created_at: new Date('2026-10-01T00:00:00.000Z'),
};

export const TEST_PATIENT_2: MockUser = {
  id: 2,
  name: 'Priya Patel',
  email: 'priya.patel@clinic.test',
  role: 'PATIENT',
  created_at: new Date('2026-10-01T00:00:00.000Z'),
};

export const TEST_RECEPTION_USER: MockUser = {
  id: 5,
  name: 'Deepak Verma',
  email: 'deepak.verma@clinic.test',
  role: 'RECEPTION',
  created_at: new Date('2026-10-01T00:00:00.000Z'),
};

export const TEST_ACTIVE_DOCTOR: MockDoctor = {
  id: 1,
  name: 'Dr. Rajesh Kothari',
  specialization: 'General Medicine',
  is_active: true,
  created_at: new Date('2026-10-01T00:00:00.000Z'),
};

export const TEST_INACTIVE_DOCTOR: MockDoctor = {
  id: 4,
  name: 'Dr. Sneha Desai',
  specialization: 'Dermatology',
  is_active: false,
  created_at: new Date('2026-10-01T00:00:00.000Z'),
};

export interface MockClient {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

export function createMockClient(): MockClient {
  return {
    query: vi.fn(),
    release: vi.fn(),
  };
}

/**
 * Setup default mock responses for pool and client queries.
 */
export function setupDbMocks() {
  const mockClient = createMockClient();

  const querySpy = vi.spyOn(pool, 'query');
  const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);

  // Default handler for user authentication lookups
  querySpy.mockImplementation(async (sql: any, params?: any) => {
    const text = typeof sql === 'string' ? sql : sql?.text || '';

    if (text.includes('FROM users WHERE id = $1')) {
      const id = params?.[0];
      if (id === 1) return { rows: [TEST_PATIENT_1] } as any;
      if (id === 2) return { rows: [TEST_PATIENT_2] } as any;
      if (id === 5) return { rows: [TEST_RECEPTION_USER] } as any;
      return { rows: [] } as any;
    }

    return { rows: [] } as any;
  });

  return {
    poolQuery: querySpy,
    poolConnect: connectSpy,
    mockClient,
  };
}

