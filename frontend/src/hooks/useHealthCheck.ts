import { useState, useEffect } from 'react';
import { apiClient, API_BASE_URL } from '../services/api';

export interface HealthStatus {
  status: 'loading' | 'online' | 'offline';
  timestamp?: string;
  error?: string;
}

export function useHealthCheck(): HealthStatus & { apiUrl: string; recheck: () => void } {
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });

  const check = async () => {
    setHealth({ status: 'loading' });
    try {
      const res = await apiClient<{ status: string; timestamp: string }>('/health');
      setHealth({ status: 'online', timestamp: res.timestamp });
    } catch (err) {
      setHealth({
        status: 'offline',
        error: err instanceof Error ? err.message : 'Unable to connect to backend',
      });
    }
  };

  useEffect(() => {
    check();
  }, []);

  return {
    ...health,
    apiUrl: API_BASE_URL,
    recheck: check,
  };
}

