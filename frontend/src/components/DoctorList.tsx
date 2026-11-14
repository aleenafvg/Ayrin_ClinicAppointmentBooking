import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { fetchDoctors } from '../services/doctor.service';
import type { Doctor } from '../types';

interface DoctorListProps {
  selectedDoctorId: number | null;
  onSelectDoctor: (doctor: Doctor) => void;
}

export const DoctorList = ({ selectedDoctorId, onSelectDoctor }: DoctorListProps) => {
  const { currentUser } = useUser();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);

  const isReception = currentUser.role === 'RECEPTION';

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDoctors(currentUser.id, isReception && includeInactive);
      setDoctors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isReception, includeInactive]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2d3748', fontWeight: 600 }}>
          Available Doctors
        </h2>

        {isReception && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: '#4a5568',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Include inactive doctors
          </label>
        )}
      </div>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>
          <span>Loading doctors list...</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff5f5',
          border: '1px solid #feb2b2',
          borderRadius: '0.375rem',
          color: '#c53030',
          marginBottom: '1rem',
        }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
          <button
            onClick={loadDoctors}
            style={{
              marginTop: '0.5rem',
              backgroundColor: '#e53e3e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>
          <p style={{ margin: 0 }}>No doctors found.</p>
        </div>
      )}

      {!loading && !error && doctors.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {doctors.map((doctor) => {
            const isSelected = selectedDoctorId === doctor.id;
            return (
              <div
                key={doctor.id}
                onClick={() => doctor.isActive && onSelectDoctor(doctor)}
                style={{
                  border: isSelected ? '2px solid #3182ce' : '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  padding: '1rem',
                  backgroundColor: isSelected ? '#ebf8ff' : '#ffffff',
                  cursor: doctor.isActive ? 'pointer' : 'not-allowed',
                  opacity: doctor.isActive ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#2d3748', fontWeight: 600 }}>
                    {doctor.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                      backgroundColor: doctor.isActive ? '#def7ec' : '#fde8e8',
                      color: doctor.isActive ? '#03543f' : '#9b1c1c',
                    }}
                  >
                    {doctor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.875rem', color: '#718096' }}>
                  {doctor.specialization || 'General Practice'}
                </p>

                <button
                  type="button"
                  disabled={!doctor.isActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (doctor.isActive) onSelectDoctor(doctor);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: isSelected ? '#3182ce' : doctor.isActive ? '#edf2f7' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : doctor.isActive ? '#2d3748' : '#a0aec0',
                    cursor: doctor.isActive ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isSelected ? '✓ Selected' : doctor.isActive ? 'Select Doctor' : 'Unavailable'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

