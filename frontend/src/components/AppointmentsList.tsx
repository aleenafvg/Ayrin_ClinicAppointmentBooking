import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { listAppointments, cancelAppointment } from '../services/appointment.service';
import { fetchDoctors } from '../services/doctor.service';
import { formatIstDateTime } from '../utils/date';
import { ApiError } from '../services/api';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import type { Appointment, Doctor } from '../types';

interface AppointmentsListProps {
  refreshTrigger?: number;
}

const PAGE_SIZE = 5;

export const AppointmentsList = ({ refreshTrigger }: AppointmentsListProps) => {
  const { currentUser } = useUser();

  const [viewMode, setViewMode] = useState<'LIST' | 'WEEK'>('LIST');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const selectedDoctorIdRef = useRef<number | null>(null);
  const [currentRefDate, setCurrentRefDate] = useState<Date>(() => new Date());
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);

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

  // Fetch doctors (reception includes inactive doctors to access historical appointments)
  useEffect(() => {
    let active = true;
    const loadDoctorsList = async () => {
      try {
        const data = await fetchDoctors(currentUser.id, isReception);
        if (active) {
          setAvailableDoctors(data);
        }
      } catch {
        // Handled silently
      }
    };
    loadDoctorsList();
    return () => {
      active = false;
    };
  }, [currentUser.id, isReception]);

  // Fetch appointments for current user, target pagination page, and optional doctor filter (excluding past appointments)
  const loadAppointments = useCallback(
    async (targetPage: number, doctorIdOverride?: number | null) => {
      setLoading(true);
      setFetchError(null);
      const activeDoctorFilter =
        doctorIdOverride !== undefined ? doctorIdOverride : selectedDoctorIdRef.current;
      try {
        const offset = (targetPage - 1) * PAGE_SIZE;
        const res = await listAppointments(currentUser.id, {
          limit: PAGE_SIZE,
          offset,
          startDate: new Date().toISOString(),
          doctorId: activeDoctorFilter ?? undefined,
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
    },
    [currentUser.id]
  );

  // Reset state when user changes
  useEffect(() => {
    setPage(1);
    setSelectedDoctorId(null);
    selectedDoctorIdRef.current = null;
    setCancelSuccessMsg(null);
    setCancelErrorMsg(null);
    loadAppointments(1, null);
  }, [currentUser.id, loadAppointments]);

  // Handler for user selecting a doctor from the single doctor dropdown
  const handleDoctorChange = (newDocId: number | null) => {
    setSelectedDoctorId(newDocId);
    selectedDoctorIdRef.current = newDocId;
    setPage(1);
    loadAppointments(1, newDocId);
  };

  // Re-fetch when refreshTrigger fires (e.g. after a booking)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadAppointments(page);
    }
  }, [refreshTrigger, page, loadAppointments]);

  const selectedDoctorObj = useMemo(() => {
    if (!selectedDoctorId) return null;
    return availableDoctors.find((d) => d.id === selectedDoctorId) || null;
  }, [availableDoctors, selectedDoctorId]);

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
      <div className="card-header appointments-header">
        <div>
          <h2 className="card-title">
            {isReception ? 'All Clinic Appointments (Reception View)' : 'My Appointments'}
          </h2>
          <p className="card-subtitle">
            {isReception
              ? 'Viewing clinic-wide upcoming appointments across all patients, ordered chronologically. All times in IST.'
              : `Showing upcoming appointments booked for ${currentUser.name}. All times displayed in Indian Standard Time (IST).`}
          </p>
        </div>

        <div className="appointments-header-actions">
          {/* Prominent Doctor Selector */}
          <div className="doctor-select-field">
            <label htmlFor="appointments-doctor-select" className="doctor-select-label">
              {isReception ? 'Doctor:' : 'Doctor Filter:'}
            </label>
            <select
              id="appointments-doctor-select"
              className="form-control appointments-doctor-dropdown"
              value={selectedDoctorId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                handleDoctorChange(val ? parseInt(val, 10) : null);
              }}
              aria-label={
                isReception
                  ? 'Select doctor for calendar and appointments'
                  : 'Filter appointments by doctor'
              }
            >
              <option value="">
                {isReception ? '-- Choose a Doctor --' : 'All My Doctors'}
              </option>
              {availableDoctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialization || 'General Practice'})
                  {!doc.isActive ? ' - Inactive' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Switcher: List View (default) vs Week View */}
          <div className="view-switcher" role="tablist" aria-label="Appointment view format">
            <button
              type="button"
              role="tab"
              id="view-tab-list"
              aria-selected={viewMode === 'LIST'}
              className={`view-toggle-btn ${viewMode === 'LIST' ? 'active' : ''}`}
              onClick={() => setViewMode('LIST')}
            >
              List View
            </button>
            <button
              type="button"
              role="tab"
              id="view-tab-week"
              aria-selected={viewMode === 'WEEK'}
              className={`view-toggle-btn ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEK')}
            >
              Week View
            </button>
          </div>

          {viewMode === 'LIST' && (
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
          )}
        </div>
      </div>

      {viewMode === 'WEEK' ? (
        <WeeklyCalendarView
          selectedDoctorId={selectedDoctorId}
          currentRefDate={currentRefDate}
          onRefDateChange={setCurrentRefDate}
          doctors={availableDoctors}
          refreshTrigger={refreshTrigger}
          onAppointmentCancelled={() => loadAppointments(page)}
        />
      ) : (
        <>
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
              <p className="empty-state-title">No upcoming appointments found</p>
              <p className="empty-state-desc">
                {selectedDoctorObj
                  ? `No upcoming appointments found for ${selectedDoctorObj.name}.`
                  : isReception
                  ? 'There are currently no upcoming appointments registered in the clinic database.'
                  : 'You have no upcoming booked appointments. Use the booking form above to schedule your clinic consultation.'}
              </p>
              {selectedDoctorId !== null && (
                <button
                  type="button"
                  onClick={() => handleDoctorChange(null)}
                  className="btn btn-sm btn-secondary"
                  style={{ marginTop: '0.75rem' }}
                >
                  Clear Doctor Filter
                </button>
              )}
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
        </>
      )}
    </div>
  );
};
