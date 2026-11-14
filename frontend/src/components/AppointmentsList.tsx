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
      // Refresh current page to reflect CANCELLED status
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
    <div className="card section-full">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            {isReception ? 'All Clinic Appointments (Reception View)' : 'My Appointments'}
          </h2>
          <p className="card-subtitle">
            {isReception
              ? 'Viewing clinic-wide appointments across all patients, ordered chronologically. All times in IST.'
              : `Showing appointments booked for ${currentUser.name}. All times displayed in Indian Standard Time (IST).`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAppointments(page)}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          title="Refresh appointments list"
        >
          {loading ? (
            <>
              <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
              <span>Refreshing...</span>
            </>
          ) : (
            'Refresh List'
          )}
        </button>
      </div>

      {/* Cancellation success feedback */}
      {cancelSuccessMsg && (
        <div className="alert alert-success" role="status">
          <div className="alert-flex">
            <div>Success: {cancelSuccessMsg}</div>
            <button
              type="button"
              onClick={() => setCancelSuccessMsg(null)}
              className="alert-close-btn"
              aria-label="Dismiss success message"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Cancellation error feedback */}
      {cancelErrorMsg && (
        <div className="alert alert-error" role="alert">
          <div className="alert-flex">
            <div>Error: {cancelErrorMsg}</div>
            <button
              type="button"
              onClick={() => setCancelErrorMsg(null)}
              className="alert-close-btn"
              aria-label="Dismiss error message"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="state-container">
          <div className="loading-spinner" aria-hidden="true" />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>
            Loading appointments...
          </span>
        </div>
      )}

      {/* Fetch error state */}
      {fetchError && !loading && (
        <div className="alert alert-error" role="alert">
          <div className="alert-flex">
            <div>Fetch Error: {fetchError}</div>
            <button
              type="button"
              onClick={() => loadAppointments(page)}
              className="btn btn-sm btn-danger"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && appointments.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">No appointments found</p>
          <p className="empty-state-desc">
            {isReception
              ? 'There are currently no appointments registered in the clinic database.'
              : 'You have no booked appointments. Use the booking form above to schedule your clinic consultation.'}
          </p>
        </div>
      )}

      {/* Appointments Table */}
      {!loading && !fetchError && appointments.length > 0 && (
        <div className="table-responsive">
          <table className="clinic-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Doctor</th>
                {isReception && <th>Patient</th>}
                <th>Date & Time (IST)</th>
                <th>Duration</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const isBooked = appt.status === 'BOOKED';
                const canCancel = isBooked && (isReception || appt.patient.id === currentUser.id);
                const isCancellingThis = cancellingId === appt.id;
                const istFormatted = formatIstDateTime(appt.startTime);

                return (
                  <tr key={appt.id}>
                    <td>
                      <code>#{appt.id}</code>
                    </td>
                    <td>
                      <div className="table-primary-text">{appt.doctor.name}</div>
                      <div className="table-sub-text">
                        {appt.doctor.specialization || 'General Practice'}
                      </div>
                    </td>
                    {isReception && (
                      <td>
                        <div className="table-primary-text">{appt.patient.name}</div>
                        <div className="table-sub-text">{appt.patient.email}</div>
                      </td>
                    )}
                    <td>
                      <div className="table-primary-text">{istFormatted.date}</div>
                      <div className="table-sub-text">{istFormatted.time}</div>
                    </td>
                    <td>
                      <span>{appt.durationMinutes} mins</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${isBooked ? 'badge-booked' : 'badge-cancelled'}`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(appt)}
                          disabled={cancellingId !== null}
                          className="btn btn-sm btn-danger"
                          title={`Cancel appointment #${appt.id}`}
                        >
                          {isCancellingThis ? (
                            <>
                              <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
                              <span>Cancelling...</span>
                            </>
                          ) : (
                            'Cancel'
                          )}
                        </button>
                      )}
                      {!isBooked && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
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
        <div className="pagination-wrapper">
          <div>
            Showing Page {page} of {totalPages}{' '}
            <span style={{ color: 'var(--color-text-subtle)' }}>
              ({totalCount} total appointment{totalCount === 1 ? '' : 's'})
            </span>
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              disabled={!hasPrev || loading}
              onClick={() => {
                const prev = page - 1;
                setPage(prev);
                loadAppointments(prev);
              }}
              className="btn btn-sm btn-secondary"
              aria-label="Previous page"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!hasNext || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                loadAppointments(next);
              }}
              className="btn btn-sm btn-secondary"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
