import { useState, type FormEvent } from 'react';
import { useUser } from '../context/UserContext';
import { bookAppointment } from '../services/appointment.service';
import { ApiError } from '../services/api';
import { formatIstDateTime } from '../utils/date';
import type { Appointment, AppointmentDuration, Doctor } from '../types';

interface BookingFormProps {
  doctors: Doctor[];
  selectedDoctorId: number | null;
  onSelectDoctorId: (id: number) => void;
  onBookingSuccess?: (appointment: Appointment) => void;
}

interface FormErrorState {
  title: string;
  message: string;
  actionGuidance: string;
}

const DURATIONS: AppointmentDuration[] = [15, 30, 45, 60];

interface TimeSlot {
  value: string;
  label: string;
}

// Generates time slots strictly from 9:00 AM to 8:45 PM in 15-minute intervals.
// 9:00 PM (21:00) is excluded because the clinic closes at 9:00 PM and appointments cannot start at closing time.
const generateClinicTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let min = 0; min <= 45; min += 15) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(min).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const displayHh = String(displayHour).padStart(2, '0');
      const label = `${displayHh}:${mm} ${period}`;
      slots.push({ value, label });
    }
  }
  return slots;
};

const CLINIC_TIME_SLOTS = generateClinicTimeSlots();

// Helper to get today's date formatted as YYYY-MM-DD
// Returns the earlier of local browser date and IST date so "today" is always included and selectable
function getTodayDateString(): string {
  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const localDateStr = `${localYear}-${localMonth}-${localDay}`;

  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  const istDateStr = istDate.toISOString().split('T')[0];

  return localDateStr < istDateStr ? localDateStr : istDateStr;
}

// Helper to get today's date formatted as YYYY-MM-DD in IST
function getTodayIstString(): string {
  const now = new Date();
  // IST is UTC + 5.5 hours
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().split('T')[0];
}

export const BookingForm = ({
  doctors,
  selectedDoctorId,
  onSelectDoctorId,
  onBookingSuccess,
}: BookingFormProps) => {
  const { currentUser } = useUser();

  const [date, setDate] = useState<string>(getTodayIstString());
  const [time, setTime] = useState<string>('10:00');
  const [duration, setDuration] = useState<AppointmentDuration>(30);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<FormErrorState | null>(null);
  const [successAppointment, setSuccessAppointment] = useState<Appointment | null>(null);

  const isReception = currentUser.role === 'RECEPTION';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessAppointment(null);

    // 1. Doctor selection validation
    if (!selectedDoctorId) {
      setFormError({
        title: 'Please select a doctor.',
        message: 'A doctor must be selected before booking an appointment.',
        actionGuidance: 'Choose a doctor from the list.',
      });
      return;
    }

    // 2. Date and time presence
    if (!date || !time) {
      setFormError({
        title: 'Missing date or time.',
        message: 'Please specify both an appointment date and start time.',
        actionGuidance: 'Select a date and start time.',
      });
      return;
    }

    // 3. Detailed date and clinic hours validation
    const minAllowedDate = getTodayDateString(); // 'YYYY-MM-DD'
    const isPastDate = date < minAllowedDate;

    const [hourStr, minStr] = time.split(':');
    const h = parseInt(hourStr, 10);
    const m = parseInt(minStr, 10);

    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration;
    // Clinic hours: 9:00 AM (540 min) to 9:00 PM (1260 min)
    // For slots starting from 8:00 PM onwards or any slot extending past 9:00 PM closing time:
    // (e.g. 8:15 PM 60m, 8:30 PM 45m/60m, 8:45 PM 30m/45m/60m, 9:00 PM any duration)
    const isOutsideClinicHours = isNaN(startMinutes) || startMinutes < 540 || endMinutes > 1260;

    const istTimestamp = `${date}T${time}:00+05:30`;
    const appointmentEpoch = new Date(istTimestamp).getTime();
    const isPastEpoch = isNaN(appointmentEpoch) || appointmentEpoch <= Date.now();

    // Specific Error Scenario 1: If the appointment duration extends beyond 9:00 PM closing time
    if (isOutsideClinicHours) {
      setFormError({
        title: 'The clinic closes at 9:00 PM.',
        message:
          'This appointment cannot be booked because it falls outside clinic hours. Please select an earlier time between 9:00 AM and 9:00 PM.',
        actionGuidance: 'Select another time.',
      });
      return;
    }

    // Specific Error Scenario 2: If the selected date is in the past
    if (isPastDate) {
      setFormError({
        title: 'Please select a future date and time.',
        message: 'Appointments cannot be booked for a past date. Please select another day.',
        actionGuidance: 'Select another date.',
      });
      return;
    }

    // Specific Error Scenario 3: If date is today, but time has already passed
    if (isPastEpoch) {
      setFormError({
        title: 'Please select a future date and time.',
        message:
          'The selected appointment time has already passed today. Please choose a future time between 9:00 AM and 9:00 PM IST.',
        actionGuidance: 'Select another time.',
      });
      return;
    }

    // 4. Submit to backend API
    setSubmitting(true);
    try {
      const booked = await bookAppointment(currentUser.id, {
        doctorId: selectedDoctorId,
        startTime: istTimestamp,
        durationMinutes: duration,
      });

      setSuccessAppointment(booked);
      if (onBookingSuccess) {
        onBookingSuccess(booked);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SLOT_CONFLICT') {
          // Specific Error Scenario 4: If the selected slot overlaps another booked appointment
          setFormError({
            title: 'This time slot is already booked.',
            message:
              'The selected doctor is unavailable at this time. Please choose another time or select a different doctor.',
            actionGuidance: 'Select another time or doctor.',
          });
        } else if (err.code === 'OUTSIDE_CLINIC_HOURS') {
          // Specific Error Scenario 1
          setFormError({
            title: 'The clinic closes at 9:00 PM.',
            message:
              'This appointment cannot be booked because it falls outside clinic hours. Please select an earlier time between 9:00 AM and 9:00 PM.',
            actionGuidance: 'Select another time.',
          });
        } else if (err.code === 'PAST_APPOINTMENT') {
          // Specific Error Scenario 2
          setFormError({
            title: 'This date has already passed.',
            message: 'Appointments cannot be booked for a past date. Please select another day.',
            actionGuidance: 'Select another date.',
          });
        } else if (err.code === 'FORBIDDEN') {
          setFormError({
            title: 'Permission Denied (HTTP 403)',
            message: 'Only patients are permitted to book appointments under clinic policy.',
            actionGuidance: 'Switch to a Patient caller in the demo user selector.',
          });
        } else if (err.code === 'DOCTOR_INACTIVE') {
          setFormError({
            title: 'Doctor Inactive',
            message: 'Cannot book an appointment with this doctor because they are currently inactive.',
            actionGuidance: 'Select an active doctor from the list.',
          });
        } else {
          setFormError({
            title: `Booking Error (${err.code})`,
            message: err.message,
            actionGuidance: 'Please review your appointment details and try again.',
          });
        }
      } else {
        setFormError({
          title: 'Unexpected Error',
          message: err instanceof Error ? err.message : 'An unexpected error occurred while booking.',
          actionGuidance: 'Please try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setSuccessAppointment(null);
    setFormError(null);
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // When reception staff is active, hide the booking form entirely and display a neutral informational message
  if (isReception) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Staff Overview</h2>
          </div>
        </div>
        <div className="alert alert-neutral" role="status">
          Appointment booking is available through the patient view. As reception staff, you can manage clinic appointments below.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Book an Appointment</h2>
          <p className="card-subtitle">
            Schedule a consultation. Clinic appointments are available between 9:00 AM and 9:00 PM IST.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {successAppointment && (
        <div className="alert alert-success" role="status">
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--color-success-text)' }}>
            Appointment Successfully Booked
          </h3>

          <div className="success-details-box">
            <div>
              Appointment Reference: <code>#{successAppointment.id}</code>
            </div>
            <div>
              Doctor: {successAppointment.doctor.name}{' '}
              <span style={{ color: 'var(--color-text-subtle)' }}>
                ({successAppointment.doctor.specialization || 'General Practice'})
              </span>
            </div>
            <div>
              Patient: {successAppointment.patient.name}{' '}
              <span style={{ color: 'var(--color-text-subtle)' }}>
                ({successAppointment.patient.email})
              </span>
            </div>
            <div>
              Scheduled Time: {formatIstDateTime(successAppointment.startTime).full}
            </div>
            <div>
              Duration: {successAppointment.durationMinutes} minutes
            </div>
            <div>
              Status: <span className="badge badge-booked">{successAppointment.status}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBookAnother}
            className="btn btn-sm btn-primary"
            style={{ marginTop: '0.5rem' }}
          >
            + Book Another Appointment
          </button>
        </div>
      )}

      {/* Specific, informative inline error alert */}
      {formError && (
        <div className="alert alert-error" role="alert">
          <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>{formError.title}</h4>
          <div style={{ marginBottom: '0.4rem' }}>{formError.message}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-danger-text)', opacity: 0.9 }}>
            Action: {formError.actionGuidance}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Doctor Select */}
        <div className="form-group">
          <label htmlFor="doctor-select" className="form-label">
            Doctor <span className="required-indicator">*</span>
          </label>
          <select
            id="doctor-select"
            className="form-control"
            value={selectedDoctorId || ''}
            onChange={(e) => onSelectDoctorId(Number(e.target.value))}
            required
          >
            <option value="">-- Choose a doctor --</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.isActive}>
                {d.name} — {d.specialization || 'General Practice'} {!d.isActive ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
          {selectedDoctor && (
            <div className="form-helper">
              Selected: {selectedDoctor.name} ({selectedDoctor.specialization || 'General Practice'})
            </div>
          )}
        </div>

        {/* Date & Time Row */}
        <div className="form-row form-group">
          <div>
            <label htmlFor="date-input" className="form-label">
              Date (IST) <span className="required-indicator">*</span>
            </label>
            <input
              id="date-input"
              type="date"
              className="form-control"
              value={date}
              min={getTodayDateString()}
              onChange={(e) => {
                setDate(e.target.value);
                setFormError(null);
              }}
              required
            />
          </div>

          <div>
            <label htmlFor="time-select" className="form-label">
              Start Time (IST) <span className="required-indicator">*</span>
            </label>
            <select
              id="time-select"
              className="form-control"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setFormError(null);
              }}
              required
            >
              {CLINIC_TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-helper" style={{ marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
          Clinic appointments are available between 9:00 AM and 9:00 PM IST. Please select a future date and time.
        </div>

        {/* Duration Picker */}
        <div className="form-group">
          <label className="form-label">
            Duration <span className="required-indicator">*</span>
          </label>
          <div className="duration-container" role="radiogroup" aria-label="Appointment duration in minutes">
            {DURATIONS.map((d) => {
              const isCurrent = duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={isCurrent}
                  onClick={() => {
                    setDuration(d);
                    setFormError(null);
                  }}
                  className={`duration-pill ${isCurrent ? 'active' : ''}`}
                >
                  {d} min
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary btn-block"
          style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
        >
          {submitting ? (
            <>
              <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
              <span>Confirming Booking...</span>
            </>
          ) : (
            'Confirm Appointment Booking'
          )}
        </button>
      </form>
    </div>
  );
};
