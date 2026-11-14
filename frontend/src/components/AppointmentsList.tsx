import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { listAppointments, cancelAppointment } from '../services/appointment.service';
import { formatIstDateTime } from '../utils/date';
import { ApiError } from '../services/api';
import type { Appointment } from '../types';

interface AppointmentsListProps {
  refreshTrigger?: number;
}

const PAGE_SIZE = 5;

export const AppointmentsList = ({ refreshTrigger }: AppointmentsListProps) => {
  const { currentUser } = useUser();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cancellation states
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [cancelErrorMsg, setCancelErrorMsg] = useState<string | null>(null);

  const isReception = currentUser.role === 'RECEPTION';

  // Fetch appointments for current user and current pagination offset
  const loadAppointments = useCallback(async (targetPage: number) => {
    setLoading(true);
    setFetchError(null);
    try {
      const offset = (targetPage - 1) * PAGE_SIZE;
      const res = await listAppointments(currentUser.id, {
        limit: PAGE_SIZE,
        offset,
      });

      setAppointments(res.data);
      setTotalCount(res.pagination.total);

      // Handle case where items on current page were cleared/cancelled and page is now empty
      if (res.data.length === 0 && targetPage > 1 && res.pagination.total > 0) {
        setPage(targetPage - 1);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  // Reset to page 1 whenever current caller changes
  useEffect(() => {
    setPage(1);
    setCancelSuccessMsg(null);
    setCancelErrorMsg(null);
    loadAppointments(1);
  }, [currentUser.id, loadAppointments]);

  // Re-fetch when refreshTrigger fires (e.g. after a booking)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadAppointments(page);
    }
  }, [refreshTrigger, page, loadAppointments]);

  // Cancellation handler
  const handleCancel = async (appt: Appointment) => {
    if (cancellingId !== null) return; // Prevent duplicate concurrent requests

    const formattedTime = formatIstDateTime(appt.startTime).full;
    const confirmMessage = `Are you sure you want to cancel appointment #${appt.id} with ${appt.doctor.name} scheduled for ${formattedTime}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setCancellingId(appt.id);
    setCancelSuccessMsg(null);
    setCancelErrorMsg(null);

    try {
      await cancelAppointment(currentUser.id, appt.id);
      setCancelSuccessMsg(`Appointment #${appt.id} with ${appt.doctor.name} was successfully cancelled.`);
      // Refresh the current page to reflect CANCELLED status
      await loadAppointments(page);
    } catch (err) {
      if (err instanceof ApiError) {
        setCancelErrorMsg(`Cancellation failed (${err.code}): ${err.message}`);
      } else {
        setCancelErrorMsg(err instanceof Error ? err.message : 'An error occurred during cancellation.');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      marginTop: '1.5rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2d3748', fontWeight: 600 }}>
            {isReception ? 'All Clinic Appointments (Reception View)' : 'My Appointments'}
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#718096' }}>
            {isReception
              ? 'Viewing clinic-wide appointments across all patients. Ordered chronologically.'
              : `Showing appointments booked for ${currentUser.name}. All times displayed in IST.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAppointments(page)}
          disabled={loading}
          style={{
            backgroundColor: '#edf2f7',
            color: '#4a5568',
            border: '1px solid #cbd5e0',
            borderRadius: '0.25rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh List'}
        </button>
      </div>

      {/* Cancellation success feedback */}
      {cancelSuccessMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f0fff4',
          border: '1px solid #9ae6b4',
          borderRadius: '0.375rem',
          color: '#22543d',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>✓ {cancelSuccessMsg}</div>
          <button
            onClick={() => setCancelSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#22543d', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Cancellation error feedback */}
      {cancelErrorMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fff5f5',
          border: '1px solid #feb2b2',
          borderRadius: '0.375rem',
          color: '#c53030',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>⚠ {cancelErrorMsg}</div>
          <button
            onClick={() => setCancelErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>
          <span>Loading appointments...</span>
        </div>
      )}

      {/* Fetch error state */}
      {fetchError && !loading && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff5f5',
          border: '1px solid #feb2b2',
          borderRadius: '0.375rem',
          color: '#c53030',
          marginBottom: '1rem',
        }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{fetchError}</p>
          <button
            onClick={() => loadAppointments(page)}
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

      {/* Empty state */}
      {!loading && !fetchError && appointments.length === 0 && (
        <div style={{
          padding: '2.5rem 1rem',
          textAlign: 'center',
          backgroundColor: '#f7fafc',
          borderRadius: '0.375rem',
          border: '1px dashed #cbd5e0',
          color: '#718096',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 500, color: '#4a5568' }}>
            No appointments found.
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            {isReception
              ? 'There are currently no appointments registered in the clinic database.'
              : 'You have no booked appointments. Use the booking form above to schedule a visit.'}
          </p>
        </div>
      )}

      {/* Appointments Table / Cards */}
      {!loading && !fetchError && appointments.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#4a5568' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>ID</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Doctor</th>
                {isReception && <th style={{ padding: '0.65rem 0.5rem' }}>Patient</th>}
                <th style={{ padding: '0.65rem 0.5rem' }}>Date & Time (IST)</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Duration</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const isBooked = appt.status === 'BOOKED';
                const canCancel = isBooked && (isReception || appt.patient.id === currentUser.id);
                const isCancellingThis = cancellingId === appt.id;
                const istFormatted = formatIstDateTime(appt.startTime);

                return (
                  <tr key={appt.id} style={{ borderBottom: '1px solid #edf2f7', transition: 'background-color 0.1s' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#718096' }}>
                      #{appt.id}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#2d3748' }}>{appt.doctor.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                        {appt.doctor.specialization || 'General Practice'}
                      </div>
                    </td>
                    {isReception && (
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 500, color: '#2d3748' }}>{appt.patient.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>{appt.patient.email}</div>
                      </td>
                    )}
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#2d3748' }}>{istFormatted.date}</div>
                      <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>{istFormatted.time}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#4a5568' }}>
                      {appt.durationMinutes} min
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isBooked ? '#def7ec' : '#fde8e8',
                          color: isBooked ? '#03543f' : '#9b1c1c',
                        }}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(appt)}
                          disabled={cancellingId !== null}
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            borderRadius: '0.25rem',
                            border: '1px solid #feb2b2',
                            backgroundColor: isCancellingThis ? '#cbd5e0' : '#fff5f5',
                            color: isCancellingThis ? '#718096' : '#c53030',
                            cursor: cancellingId !== null ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isCancellingThis ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      {!isBooked && (
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontStyle: 'italic' }}>
                          Cancelled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {!loading && !fetchError && totalCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#4a5568',
        }}>
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total appointment{totalCount === 1 ? '' : 's'})
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              disabled={!hasPrev || loading}
              onClick={() => {
                const prev = page - 1;
                setPage(prev);
                loadAppointments(prev);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '0.25rem',
                border: '1px solid #cbd5e0',
                backgroundColor: hasPrev && !loading ? '#ffffff' : '#edf2f7',
                color: hasPrev && !loading ? '#2d3748' : '#a0aec0',
                cursor: hasPrev && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={!hasNext || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                loadAppointments(next);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '0.25rem',
                border: '1px solid #cbd5e0',
                backgroundColor: hasNext && !loading ? '#ffffff' : '#edf2f7',
                color: hasNext && !loading ? '#2d3748' : '#a0aec0',
                cursor: hasNext && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

