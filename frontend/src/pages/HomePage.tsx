import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { fetchDoctors } from '../services/doctor.service';
import { DoctorList } from '../components/DoctorList';
import { BookingForm } from '../components/BookingForm';
import type { Doctor } from '../types';

export const HomePage = () => {
  const { currentUser } = useUser();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

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

  return (
    <main style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Current session info banner */}
      <div style={{
        backgroundColor: '#edf2f7',
        border: '1px solid #e2e8f0',
        borderRadius: '0.375rem',
        padding: '0.65rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: '#4a5568',
      }}>
        <div>
          Acting as <strong>{currentUser.name}</strong> ({currentUser.email}) &bull; Role: <strong>{currentUser.role}</strong>
        </div>
        <div style={{ color: '#718096', fontSize: '0.8rem' }}>
          Header: <code>X-User-Id: {currentUser.id}</code>
        </div>
      </div>

      {/* Main 2-column responsive layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* Left Column: Doctor Listing */}
        <section>
          <DoctorList
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={handleSelectDoctor}
          />
        </section>

        {/* Right Column: Booking Form */}
        <section>
          <BookingForm
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onSelectDoctorId={setSelectedDoctorId}
          />
        </section>
      </div>
    </main>
  );
};
