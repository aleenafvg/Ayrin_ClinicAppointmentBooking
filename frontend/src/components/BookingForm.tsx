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

const DURATIONS: AppointmentDuration[] = [15, 30, 45, 60];

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
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<{ code: string; message: string } | null>(null);
  const [successAppointment, setSuccessAppointment] = useState<Appointment | null>(null);

  const isReception = currentUser.role === 'RECEPTION';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setServerError(null);
    setSuccessAppointment(null);

    // 1. Client-side validation: Doctor selection
    if (!selectedDoctorId) {
      setClientError('Please select a doctor for the appointment.');
      return;
    }

    // 2. Client-side validation: Date and time presence
    if (!date || !time) {
      setClientError('Please specify both an appointment date and start time.');
      return;
    }

    // 3. Client-side validation: Past time check in IST
    const istTimestamp = `${date}T${time}:00+05:30`;
    const appointmentEpoch = new Date(istTimestamp).getTime();

    if (isNaN(appointmentEpoch)) {
      setClientError('Invalid date or time format.');
      return;
    }

    if (appointmentEpoch <= Date.now()) {
      setClientError('Appointment start time must be in the future.');
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
        setServerError({ code: err.code, message: err.message });
      } else {
        setServerError({
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred while booking.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setSuccessAppointment(null);
    setServerError(null);
    setClientError(null);
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem', color: '#2d3748', fontWeight: 600 }}>
        Book an Appointment
      </h2>
      <p style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '0.875rem', color: '#718096' }}>
        Schedule a new clinic consultation. All appointments are scheduled in <strong>Indian Standard Time (IST, UTC+05:30)</strong>.
      </p>

      {/* Role notice if caller is Reception */}
      {isReception && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fefcbf',
          border: '1px solid #f6e05e',
          borderRadius: '0.375rem',
          color: '#744210',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
          lineHeight: 1.4,
        }}>
          <strong>Role Notice:</strong> You are currently acting as <strong>Reception Staff</strong> ({currentUser.name}).
          Under clinic business rules, bookings must be submitted by <strong>Patients</strong>.
          Switch to a Patient caller in the top bar to book, or submit to verify server-side authorization enforcement.
        </div>
      )}

      {/* Success banner */}
      {successAppointment && (
        <div style={{
          padding: '1.25rem',
          backgroundColor: '#f0fff4',
          border: '1px solid #9ae6b4',
          borderRadius: '0.375rem',
          color: '#22543d',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✓</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Appointment Successfully Booked!</h3>
          </div>
          <div style={{
            fontSize: '0.875rem',
            lineHeight: 1.6,
            backgroundColor: '#ffffff',
            padding: '0.75rem 1rem',
            borderRadius: '0.25rem',
            border: '1px solid #c6f6d5',
            marginTop: '0.5rem',
          }}>
            <div><strong>Appointment ID:</strong> #{successAppointment.id}</div>
            <div><strong>Doctor:</strong> {successAppointment.doctor.name} ({successAppointment.doctor.specialization || 'General Practice'})</div>
            <div><strong>Patient:</strong> {successAppointment.patient.name} ({successAppointment.patient.email})</div>
            <div><strong>Scheduled Time:</strong> {formatIstDateTime(successAppointment.startTime).full}</div>
            <div><strong>Duration:</strong> {successAppointment.durationMinutes} minutes</div>
            <div><strong>Status:</strong> <span style={{ color: '#276749', fontWeight: 700 }}>{successAppointment.status}</span></div>
          </div>
          <button
            type="button"
            onClick={handleBookAnother}
            style={{
              marginTop: '1rem',
              backgroundColor: '#38a169',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Book Another Appointment
          </button>
        </div>
      )}

      {/* Client error banner */}
      {clientError && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#fff5f5',
          border: '1px solid #feb2b2',
          borderRadius: '0.375rem',
          color: '#c53030',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>⚠</span>
          <span>{clientError}</span>
        </div>
      )}

      {/* Server error banner (including conflict and validation) */}
      {serverError && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: serverError.code === 'SLOT_CONFLICT' ? '#fffaf0' : '#fff5f5',
          border: `1px solid ${serverError.code === 'SLOT_CONFLICT' ? '#fbd38d' : '#feb2b2'}`,
          borderRadius: '0.375rem',
          color: serverError.code === 'SLOT_CONFLICT' ? '#7b341e' : '#c53030',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            {serverError.code === 'SLOT_CONFLICT' && '⚡ Booking Slot Conflict (HTTP 409)'}
            {serverError.code === 'PAST_APPOINTMENT' && '⌛ Past Appointment Error (HTTP 422)'}
            {serverError.code === 'FORBIDDEN' && '⛔ Permission Denied (HTTP 403)'}
            {serverError.code === 'DOCTOR_INACTIVE' && '⏸ Doctor Inactive (HTTP 409)'}
            {!['SLOT_CONFLICT', 'PAST_APPOINTMENT', 'FORBIDDEN', 'DOCTOR_INACTIVE'].includes(serverError.code) &&
              `Server Error (${serverError.code})`}
          </div>
          <div>{serverError.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Doctor Select */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="doctor-select" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4a5568', marginBottom: '0.35rem' }}>
            Doctor: <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <select
            id="doctor-select"
            value={selectedDoctorId || ''}
            onChange={(e) => onSelectDoctorId(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e0',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#2d3748',
            }}
          >
            <option value="">-- Select a doctor --</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.isActive}>
                {d.name} — {d.specialization || 'General Practice'} {!d.isActive ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
          {selectedDoctor && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: '#4a5568' }}>
              Selected: <strong>{selectedDoctor.name}</strong> ({selectedDoctor.specialization || 'General Practice'})
            </div>
          )}
        </div>

        {/* Date and Time Pickers (IST) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label htmlFor="date-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4a5568', marginBottom: '0.35rem' }}>
              Date (IST): <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              id="date-input"
              type="date"
              value={date}
              min={getTodayIstString()}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e0',
                fontSize: '0.9rem',
                color: '#2d3748',
              }}
            />
          </div>

          <div>
            <label htmlFor="time-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4a5568', marginBottom: '0.35rem' }}>
              Start Time (IST): <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              id="time-input"
              type="time"
              value={time}
              step="300"
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e0',
                fontSize: '0.9rem',
                color: '#2d3748',
              }}
            />
          </div>
        </div>

        {/* Duration Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4a5568', marginBottom: '0.35rem' }}>
            Duration: <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                style={{
                  flex: '1 1 60px',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: duration === d ? 700 : 500,
                  borderRadius: '0.375rem',
                  border: duration === d ? '2px solid #3182ce' : '1px solid #cbd5e0',
                  backgroundColor: duration === d ? '#ebf8ff' : '#ffffff',
                  color: duration === d ? '#2b6cb0' : '#4a5568',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                }}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            backgroundColor: submitting ? '#a0aec0' : '#3182ce',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          {submitting ? 'Booking Appointment...' : 'Confirm Appointment Booking'}
        </button>
      </form>
    </div>
  );
};

