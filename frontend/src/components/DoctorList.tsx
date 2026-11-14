import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { fetchDoctors, deactivateDoctor, activateDoctor } from '../services/doctor.service';
import type { Doctor } from '../types';

interface DoctorListProps {
  selectedDoctorId: number | null;
  onSelectDoctor: (doctor: Doctor) => void;
  onDoctorUpdated?: () => void;
}

export const DoctorList = ({
  selectedDoctorId,
  onSelectDoctor,
  onDoctorUpdated,
}: DoctorListProps) => {
  const { currentUser } = useUser();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);
  const [actionDoctorId, setActionDoctorId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'activate' | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

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

  const handleDeactivate = async (doctor: Doctor) => {
    if (actionDoctorId !== null) return;

    const confirmMessage = `Are you sure you want to deactivate ${doctor.name}? They will no longer be available for new appointment bookings.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionDoctorId(doctor.id);
    setActionType('deactivate');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await deactivateDoctor(currentUser.id, doctor.id);
      setActionSuccessMsg(`${doctor.name} was successfully deactivated.`);
      await loadDoctors();
      if (onDoctorUpdated) {
        onDoctorUpdated();
      }
    } catch (err) {
      setActionErrorMsg(err instanceof Error ? err.message : 'Failed to deactivate doctor.');
    } finally {
      setActionDoctorId(null);
      setActionType(null);
    }
  };

  const handleActivate = async (doctor: Doctor) => {
    if (actionDoctorId !== null) return;

    const confirmMessage = `Are you sure you want to reactivate ${doctor.name}? They will become available for appointment bookings.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionDoctorId(doctor.id);
    setActionType('activate');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await activateDoctor(currentUser.id, doctor.id);
      setActionSuccessMsg(`${doctor.name} was successfully reactivated.`);
      await loadDoctors();
      if (onDoctorUpdated) {
        onDoctorUpdated();
      }
    } catch (err) {
      setActionErrorMsg(err instanceof Error ? err.message : 'Failed to reactivate doctor.');
    } finally {
      setActionDoctorId(null);
      setActionType(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Available Doctors</h2>
          <p className="card-subtitle">
            {isReception
              ? 'Clinic doctors directory and active status'
              : 'Select a specialist to book an appointment consultation'}
          </p>
        </div>

        {isReception && (
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            <span>Include inactive doctors</span>
          </label>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '1rem' }}>
          <div className="alert-flex">
            <div>{actionSuccessMsg}</div>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setActionSuccessMsg(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {actionErrorMsg && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
          <div className="alert-flex">
            <div>{actionErrorMsg}</div>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setActionErrorMsg(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="state-container">
          <div className="loading-spinner" aria-hidden="true" />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>
            Loading clinic doctors...
          </span>
        </div>
      )}

      {error && !loading && (
        <div className="alert alert-error">
          <div className="alert-flex">
            <div>Error: {error}</div>
            <button
              type="button"
              onClick={loadDoctors}
              className="btn btn-sm btn-danger"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">No doctors found</p>
          <p className="empty-state-desc">
            No doctors are currently listed in the system matching your filter criteria.
          </p>
        </div>
      )}

      {!loading && !error && doctors.length > 0 && (
        <div className="doctor-grid">
          {doctors.map((doctor) => {
            const isSelected = selectedDoctorId === doctor.id;
            const cardClass = `doctor-card ${doctor.isActive ? 'active' : 'inactive'} ${isSelected ? 'selected' : ''}`;

            return (
              <div
                key={doctor.id}
                className={cardClass}
                onClick={() => doctor.isActive && onSelectDoctor(doctor)}
                role="button"
                tabIndex={doctor.isActive ? 0 : -1}
                aria-pressed={isSelected}
                aria-disabled={!doctor.isActive}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && doctor.isActive) {
                    e.preventDefault();
                    onSelectDoctor(doctor);
                  }
                }}
              >
                <div>
                  <div className="doctor-card-header">
                    <h3 className="doctor-name">{doctor.name}</h3>
                    <span
                      className={`badge ${doctor.isActive ? 'badge-active' : 'badge-inactive'}`}
                    >
                      {doctor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="doctor-specialty">
                    {doctor.specialization || 'General Practice'}
                  </p>
                </div>

                <div>
                  {isReception ? (
                    doctor.isActive ? (
                      <button
                        type="button"
                        disabled={actionDoctorId === doctor.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeactivate(doctor);
                        }}
                        className="btn btn-block btn-sm btn-danger"
                        title={`Deactivate ${doctor.name}`}
                      >
                        {actionDoctorId === doctor.id && actionType === 'deactivate'
                          ? 'Deactivating...'
                          : 'Deactivate'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionDoctorId === doctor.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(doctor);
                        }}
                        className="btn btn-block btn-sm btn-primary"
                        title={`Reactivate ${doctor.name}`}
                      >
                        {actionDoctorId === doctor.id && actionType === 'activate'
                          ? 'Reactivating...'
                          : 'Reactivate'}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={!doctor.isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (doctor.isActive) onSelectDoctor(doctor);
                      }}
                      className={`btn btn-block btn-sm ${
                        isSelected
                          ? 'btn-primary'
                          : doctor.isActive
                          ? 'btn-secondary'
                          : 'btn-secondary'
                      }`}
                    >
                      {isSelected ? 'Selected' : doctor.isActive ? 'Select Doctor' : 'Unavailable'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
