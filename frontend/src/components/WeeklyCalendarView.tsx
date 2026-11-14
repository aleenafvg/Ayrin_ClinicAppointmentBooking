import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { listAppointments, cancelAppointment } from '../services/appointment.service';
import {
  getIstWeekRange,
  addWeeksToDate,
  getAppointmentSlotDetails,
  type IstWeekRange,
} from '../utils/date';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { ApiError } from '../services/api';
import type { Appointment, Doctor } from '../types';

interface WeeklyCalendarViewProps {
  selectedDoctorId: number | null;
  currentRefDate: Date;
  onRefDateChange: (date: Date) => void;
  doctors: Doctor[];
  refreshTrigger?: number;
  onAppointmentCancelled?: () => void;
}

const CLINIC_HOURS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
];

const HOUR_HEIGHT = 80; // px per 60 minutes
const TOTAL_HOURS = 12; // 9:00 AM to 9:00 PM
const TOTAL_GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT; // 960px

interface PositionedAppointment {
  appointment: Appointment;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  timeRangeLabel: string;
}

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  selectedDoctorId,
  currentRefDate,
  onRefDateChange,
  doctors,
  refreshTrigger,
  onAppointmentCancelled,
}) => {
  const { currentUser } = useUser();
  const isReception = currentUser.role === 'RECEPTION';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected appointment for details modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Find the selected doctor object
  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Computed week range in IST
  const weekRange: IstWeekRange = useMemo(() => {
    return getIstWeekRange(currentRefDate);
  }, [currentRefDate]);

  // Load appointments for this specific week range and selected doctor
  const loadWeekAppointments = useCallback(async () => {
    // Reception must select a doctor first; do not fetch all doctors' appointments together
    if (isReception && !selectedDoctorId) {
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await listAppointments(currentUser.id, {
        limit: 100, // Sufficient for any doctor's weekly schedule
        offset: 0,
        startDate: weekRange.startDateIso,
        endDate: weekRange.queryEndDateIso,
        doctorId: selectedDoctorId ?? undefined,
      });
      setAppointments(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly appointments');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, isReception, selectedDoctorId, weekRange.startDateIso, weekRange.queryEndDateIso]);

  useEffect(() => {
    loadWeekAppointments();
  }, [loadWeekAppointments]);

  // Re-fetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadWeekAppointments();
    }
  }, [refreshTrigger, loadWeekAppointments]);

  // Navigation handlers
  const handlePrevWeek = () => {
    onRefDateChange(addWeeksToDate(currentRefDate, -1));
  };

  const handleNextWeek = () => {
    onRefDateChange(addWeeksToDate(currentRefDate, 1));
  };

  const handleToday = () => {
    onRefDateChange(new Date());
  };

  // Appointment click handler
  const handleAppointmentClick = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsModalOpen(true);
    setCancelFeedback(null);
  };

  // Cancellation handler inside modal
  const handleCancelAppointment = async (appt: Appointment) => {
    if (cancellingId !== null) return;

    const confirmMsg = `Are you sure you want to cancel appointment #${appt.id} with ${appt.doctor.name}?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setCancellingId(appt.id);
    setCancelFeedback(null);

    try {
      await cancelAppointment(currentUser.id, appt.id);
      setCancelFeedback({
        type: 'success',
        message: `Appointment #${appt.id} was successfully cancelled.`,
      });
      setIsModalOpen(false);
      setSelectedAppointment(null);
      await loadWeekAppointments();
      if (onAppointmentCancelled) {
        onAppointmentCancelled();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `Cancellation failed (${err.code}): ${err.message}`
          : err instanceof Error
          ? err.message
          : 'Cancellation failed';
      setCancelFeedback({ type: 'error', message: msg });
    } finally {
      setCancellingId(null);
    }
  };

  // Group appointments by day and compute overlapping visual layout
  const dayAppointmentsMap = useMemo(() => {
    const map = new Map<string, PositionedAppointment[]>();
    for (const day of weekRange.days) {
      map.set(day.dateStr, []);
    }

    if (appointments.length === 0) {
      return map;
    }

    // Partition appointments by IST date
    const rawByDay: Record<string, { appt: Appointment; slot: ReturnType<typeof getAppointmentSlotDetails> }[]> = {};
    for (const appt of appointments) {
      const slot = getAppointmentSlotDetails(appt.startTime, appt.durationMinutes);
      if (!rawByDay[slot.dateStr]) {
        rawByDay[slot.dateStr] = [];
      }
      rawByDay[slot.dateStr].push({ appt, slot });
    }

    // Layout each day column
    for (const day of weekRange.days) {
      const items = rawByDay[day.dateStr] || [];
      if (items.length === 0) continue;

      // Sort by start minute, then longest duration first
      const sorted = [...items].sort((a, b) => {
        if (a.slot.minutesFromClinicOpen !== b.slot.minutesFromClinicOpen) {
          return a.slot.minutesFromClinicOpen - b.slot.minutesFromClinicOpen;
        }
        return b.appt.durationMinutes - a.appt.durationMinutes;
      });

      // Cluster overlapping appointments to assign columns
      const columns: { appt: Appointment; slot: ReturnType<typeof getAppointmentSlotDetails>; col: number }[][] = [];
      const assigned: { appt: Appointment; slot: ReturnType<typeof getAppointmentSlotDetails>; col: number }[] = [];

      for (const item of sorted) {
        const itemStart = item.slot.minutesFromClinicOpen;
        let placedCol = -1;

        for (let c = 0; c < columns.length; c++) {
          const colList = columns[c];
          const lastInCol = colList[colList.length - 1];
          const lastEnd = lastInCol.slot.minutesFromClinicOpen + lastInCol.appt.durationMinutes;
          if (lastEnd <= itemStart) {
            colList.push({ ...item, col: c });
            assigned.push({ ...item, col: c });
            placedCol = c;
            break;
          }
        }

        if (placedCol === -1) {
          const newCol = columns.length;
          columns.push([{ ...item, col: newCol }]);
          assigned.push({ ...item, col: newCol });
        }
      }

      const totalCols = Math.max(1, columns.length);
      const positioned: PositionedAppointment[] = assigned.map((entry) => {
        const topPx = Math.max(0, (entry.slot.minutesFromClinicOpen / 60) * HOUR_HEIGHT);
        const calcHeight = (entry.appt.durationMinutes / 60) * HOUR_HEIGHT;
        const heightPx = Math.max(52, calcHeight);
        const leftPct = (entry.col / totalCols) * 100;
        const widthPct = (1 / totalCols) * 100;

        return {
          appointment: entry.appt,
          topPx,
          heightPx,
          leftPct,
          widthPct,
          timeRangeLabel: entry.slot.timeRangeLabel,
        };
      });

      map.set(day.dateStr, positioned);
    }

    return map;
  }, [appointments, weekRange.days]);

  // Reception Prompt: When no doctor is selected
  if (isReception && !selectedDoctorId) {
    return (
      <div className="calendar-view-container">
        {/* Navigation bar with week range still accessible */}
        <div className="calendar-nav-bar">
          <div className="calendar-nav-controls">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="btn btn-sm btn-secondary"
              aria-label="Previous week"
            >
              &larr; Previous Week
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="btn btn-sm btn-secondary"
              aria-label="Jump to current week"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="btn btn-sm btn-secondary"
              aria-label="Next week"
            >
              Next Week &rarr;
            </button>
          </div>

          <div className="calendar-range-display">
            <span className="calendar-range-label">{weekRange.rangeLabel}</span>
            <span className="calendar-range-tz">IST (Clinic Hours: 9:00 AM – 9:00 PM)</span>
          </div>
        </div>

        {/* Helpful Prompt asking reception to select a doctor */}
        <div className="calendar-prompt-card">
          <div className="calendar-prompt-badge">Doctor Schedule View</div>
          <h3 className="calendar-prompt-title">Select a Doctor to View Weekly Calendar</h3>
          <p className="calendar-prompt-desc">
            To view appointments, please choose a doctor from the doctor selector above. Weekly calendars display schedules for one doctor at a time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-view-container">
      {/* Prominently show selected doctor name above calendar */}
      {selectedDoctor && (
        <div className="calendar-selected-doctor-bar">
          <div className="selected-doctor-info">
            <span className="selected-doctor-label">Viewing Schedule for:</span>
            <span className="selected-doctor-name">{selectedDoctor.name}</span>
            <span className="selected-doctor-spec">
              ({selectedDoctor.specialization || 'General Practice'})
            </span>
            {!selectedDoctor.isActive && (
              <span className="badge badge-inactive" title="Doctor is inactive; viewing historical appointments">
                Inactive
              </span>
            )}
          </div>
        </div>
      )}

      {/* Week Navigation Header */}
      <div className="calendar-nav-bar">
        <div className="calendar-nav-controls">
          <button
            type="button"
            onClick={handlePrevWeek}
            disabled={loading}
            className="btn btn-sm btn-secondary"
            aria-label="Previous week"
            title="Navigate to previous week"
          >
            &larr; Previous Week
          </button>

          <button
            type="button"
            onClick={handleToday}
            disabled={loading}
            className="btn btn-sm btn-secondary"
            aria-label="Navigate to current week"
            title="Jump to today's week"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            disabled={loading}
            className="btn btn-sm btn-secondary"
            aria-label="Next week"
            title="Navigate to next week"
          >
            Next Week &rarr;
          </button>
        </div>

        <div className="calendar-range-display">
          <span className="calendar-range-label">{weekRange.rangeLabel}</span>
          <span className="calendar-range-tz">IST (Clinic Hours: 9:00 AM – 9:00 PM)</span>
        </div>

        <div className="calendar-nav-actions">
          <button
            type="button"
            onClick={loadWeekAppointments}
            disabled={loading}
            className="btn btn-sm btn-secondary"
            title="Refresh weekly schedule"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Cancellation Feedback Messages */}
      {cancelFeedback && (
        <div
          className={`alert ${
            cancelFeedback.type === 'success' ? 'alert-success' : 'alert-error'
          }`}
          role="status"
          style={{ marginBottom: '1rem' }}
        >
          <div className="alert-flex">
            <div>{cancelFeedback.message}</div>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setCancelFeedback(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay / spinner */}
      {loading && (
        <div className="state-container" style={{ padding: '2rem 1rem' }}>
          <div className="loading-spinner" aria-hidden="true" />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)' }}>
            Loading appointments for {selectedDoctor ? selectedDoctor.name : 'week'}...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
          <div className="alert-flex">
            <div>Calendar Error: {error}</div>
            <button
              type="button"
              onClick={loadWeekAppointments}
              className="btn btn-sm btn-danger"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty State Banner (Visible when 0 appointments in the entire week for the selected doctor) */}
      {!loading && !error && appointments.length === 0 && (
        <div className="calendar-empty-banner">
          <p className="calendar-empty-title">
            No appointments scheduled {selectedDoctor ? `for ${selectedDoctor.name}` : ''} this week
          </p>
          <p className="calendar-empty-desc">
            {selectedDoctor
              ? `No appointments found for ${selectedDoctor.name} between ${weekRange.rangeLabel}.`
              : `You have no appointments booked for the week of ${weekRange.rangeLabel}.`}
          </p>
        </div>
      )}

      {/* Responsive Calendar Grid Wrapper (Enables horizontal scrolling on smaller screens) */}
      {!loading && !error && (
        <div className="calendar-scroll-wrapper">
          <div className="calendar-grid-layout">
            {/* Header Row: Time gutter label + 7 Day Headers */}
            <div className="calendar-grid-header">
              <div className="calendar-time-gutter-header">
                <span>IST Time</span>
              </div>
              {weekRange.days.map((day) => (
                <div
                  key={day.dateStr}
                  className={`calendar-day-header ${day.isToday ? 'today' : ''}`}
                >
                  <span className="day-name">{day.shortDay}</span>
                  <span className="day-number">{day.dayNumber} {day.monthShort}</span>
                  {day.isToday && <span className="today-badge">Today</span>}
                </div>
              ))}
            </div>

            {/* Calendar Body: Time Axis + 7 Day Columns */}
            <div
              className="calendar-grid-body"
              style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
            >
              {/* Left Time Axis */}
              <div className="calendar-time-axis">
                {CLINIC_HOURS.slice(0, 12).map((hourLabel, idx) => (
                  <div
                    key={hourLabel}
                    className="calendar-time-tick"
                    style={{
                      top: `${idx * HOUR_HEIGHT}px`,
                      height: `${HOUR_HEIGHT}px`,
                    }}
                  >
                    <span className="time-tick-label">{hourLabel}</span>
                  </div>
                ))}
              </div>

              {/* 7 Day Columns */}
              <div className="calendar-days-track">
                {weekRange.days.map((day) => {
                  const dayAppts = dayAppointmentsMap.get(day.dateStr) || [];

                  return (
                    <div
                      key={day.dateStr}
                      className={`calendar-day-column ${day.isToday ? 'today-col' : ''}`}
                    >
                      {/* Horizontal Hourly Grid Guideline Lines */}
                      {Array.from({ length: TOTAL_HOURS }).map((_, hIdx) => (
                        <div
                          key={hIdx}
                          className="calendar-hour-slot"
                          style={{
                            top: `${hIdx * HOUR_HEIGHT}px`,
                            height: `${HOUR_HEIGHT}px`,
                          }}
                        />
                      ))}

                      {/* Render Appointment Blocks */}
                      {dayAppts.map((item) => {
                        const appt = item.appointment;
                        const isBooked = appt.status === 'BOOKED';
                        const isCancelled = appt.status === 'CANCELLED';

                        return (
                          <div
                            key={appt.id}
                            className={`calendar-appt-block ${
                              isBooked ? 'appt-booked' : 'appt-cancelled'
                            }`}
                            style={{
                              top: `${item.topPx}px`,
                              height: `${item.heightPx}px`,
                              left: `${item.leftPct}%`,
                              width: `calc(${item.widthPct}% - 4px)`,
                            }}
                            onClick={() => handleAppointmentClick(appt)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Appointment with ${appt.doctor.name} at ${item.timeRangeLabel}, status: ${appt.status}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAppointmentClick(appt);
                              }
                            }}
                          >
                            <div className="appt-block-header">
                              <span className="appt-time">{item.timeRangeLabel}</span>
                              <span
                                className={`appt-status-tag ${
                                  isBooked ? 'tag-booked' : 'tag-cancelled'
                                }`}
                              >
                                {isCancelled ? 'CANCELLED' : `${appt.durationMinutes}m`}
                              </span>
                            </div>

                            <div className="appt-doctor-name">
                              {appt.doctor.name}
                            </div>

                            <div className="appt-patient-name">
                              {isReception ? `Patient: ${appt.patient.name}` : appt.doctor.specialization || 'Consultation'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCancel={handleCancelAppointment}
        isCancelling={cancellingId !== null}
        isReception={isReception}
        currentUserId={currentUser.id}
      />
    </div>
  );
};
