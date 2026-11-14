import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { fetchDoctors } from '../services/doctor.service';
import { SpecialtyTabs } from '../components/SpecialtyTabs';
import { DoctorList } from '../components/DoctorList';
import { BookingForm } from '../components/BookingForm';
import { AppointmentsList } from '../components/AppointmentsList';
import type { Doctor } from '../types';

export const HomePage = () => {
  const { currentUser } = useUser();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  const isReception = currentUser.role === 'RECEPTION';

  // Load doctors for form dropdown synchronization
  const loadDoctors = useCallback(async () => {
    try {
      const data = await fetchDoctors(currentUser.id, isReception);
      setDoctors(data);
      // Auto-select first active doctor if none selected
      if (!selectedDoctorId) {
        const firstActive = data.find((d) => d.isActive);
        if (firstActive) {
          setSelectedDoctorId(firstActive.id);
        }
      }
    } catch {
      // Handled inside DoctorList
    }
  }, [currentUser.id, isReception, selectedDoctorId]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctorId(doctor.id);
  };

  const handleBookingSuccess = () => {
    // Increment refreshTrigger to signal AppointmentsList to re-fetch
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="app-container">
      {/* Current session info banner */}
      <section className="session-banner" aria-label="Current session context">
        <div className="session-info">
          <span>Acting as:</span>
          <span style={{ color: 'var(--color-text-main)' }}>{currentUser.name}</span>
          <span style={{ color: 'var(--color-text-subtle)' }}>({currentUser.email})</span>
        </div>
        <span
          className={`badge ${currentUser.role === 'PATIENT' ? 'badge-patient' : 'badge-reception'}`}
        >
          {currentUser.role === 'PATIENT' ? 'Patient' : 'Reception'}
        </span>
      </section>

      {/* ROW 1: Full-width specialty navigation tabs spanning the entire content width, above both columns */}
      <SpecialtyTabs
        selectedSpecialty={selectedSpecialty}
        onSelectSpecialty={setSelectedSpecialty}
        doctors={doctors}
      />

      {/* ROW 2: Main 2-column responsive layout */}
      <div className="main-grid">
        {/* Left Column: Available Doctors, search bar and doctor cards */}
        <section aria-label="Available Doctors">
          <DoctorList
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={handleSelectDoctor}
            onDoctorUpdated={loadDoctors}
            selectedSpecialty={selectedSpecialty}
            onSelectSpecialty={setSelectedSpecialty}
          />
        </section>

        {/* Right Column: Booking Form for Patients, or Neutral Information for Reception */}
        {!isReception ? (
          <section aria-label="Book an Appointment">
            <BookingForm
              doctors={doctors}
              selectedDoctorId={selectedDoctorId}
              onSelectDoctorId={setSelectedDoctorId}
              onBookingSuccess={handleBookingSuccess}
            />
          </section>
        ) : (
          <section aria-label="Staff Overview">
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
          </section>
        )}
      </div>

      {/* Full-width Appointments List with pagination & cancellation */}
      <section aria-label="Appointments Schedule">
        <AppointmentsList refreshTrigger={refreshTrigger} />
      </section>
    </main>
  );
};
