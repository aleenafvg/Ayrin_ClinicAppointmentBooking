import React, { useEffect } from 'react';
import { formatIstDateTime, getAppointmentSlotDetails } from '../utils/date';
import type { Appointment } from '../types';

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onCancel: (appointment: Appointment) => void;
  isCancelling: boolean;
  isReception: boolean;
  currentUserId: number;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onCancel,
  isCancelling,
  isReception,
  currentUserId,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !appointment) return null;

  const isBooked = appointment.status === 'BOOKED';
  const canCancel = isBooked && (isReception || appointment.patient.id === currentUserId);
  const istDetails = getAppointmentSlotDetails(appointment.startTime, appointment.durationMinutes);
  const createdIst = formatIstDateTime(appointment.createdAt);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-modal-title"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="appointment-modal-title" className="modal-title">
              Appointment #{appointment.id}
            </h3>
            <span
              className={`badge ${isBooked ? 'badge-booked' : 'badge-cancelled'}`}
            >
              {appointment.status}
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-row">
            <span className="detail-label">Doctor</span>
            <div className="detail-value">
              <span className="detail-primary">{appointment.doctor.name}</span>
              <span className="detail-secondary">
                {appointment.doctor.specialization || 'General Practice'}
              </span>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">Patient</span>
            <div className="detail-value">
              <span className="detail-primary">{appointment.patient.name}</span>
              {isReception && (
                <span className="detail-secondary">{appointment.patient.email}</span>
              )}
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">Date</span>
            <div className="detail-value">
              <span className="detail-primary">
                {formatIstDateTime(appointment.startTime).date}
              </span>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">Time & Duration</span>
            <div className="detail-value">
              <span className="detail-primary">
                {istDetails.timeRangeLabel} IST
              </span>
              <span className="detail-secondary">
                {appointment.durationMinutes} minutes consultation
              </span>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">Booked On</span>
            <div className="detail-value">
              <span className="detail-secondary">
                {createdIst.full}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {canCancel && (
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => onCancel(appointment)}
              className="btn btn-sm btn-danger"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

