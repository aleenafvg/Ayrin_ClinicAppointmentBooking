import React, { useMemo } from 'react';
import type { Doctor } from '../types';

export interface SpecialtyTabItem {
  id: string;
  label: string;
}

export const BASE_SPECIALTY_TABS: SpecialtyTabItem[] = [
  { id: 'ALL', label: 'All Doctors' },
  { id: 'Cardiology', label: 'Cardiology' },
  { id: 'Dermatology', label: 'Dermatology' },
  { id: 'General Medicine', label: 'General Medicine' },
  { id: 'Pediatrics', label: 'Pediatrics' },
];

interface SpecialtyTabsProps {
  selectedSpecialty: string;
  onSelectSpecialty: (specialty: string) => void;
  doctors?: Doctor[];
}

export const SpecialtyTabs: React.FC<SpecialtyTabsProps> = ({
  selectedSpecialty,
  onSelectSpecialty,
  doctors,
}) => {
  const tabs = useMemo(() => {
    const list = [...BASE_SPECIALTY_TABS];
    if (doctors && doctors.length > 0) {
      const known = new Set(list.map((t) => t.id));
      doctors.forEach((d) => {
        if (d.specialization && !known.has(d.specialization)) {
          list.push({ id: d.specialization, label: d.specialization });
          known.add(d.specialization);
        }
      });
    }
    return list;
  }, [doctors]);

  return (
    <nav className="specialty-nav-section" aria-label="Specialty Filter Navigation">
      <div
        className="specialty-pills-container"
        role="tablist"
        aria-label="Filter doctors by specialty"
      >
        <div className="specialty-pills-track">
          {tabs.map((tab) => {
            const isActive = selectedSpecialty === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`specialty-tab-${tab.id.replace(/\s+/g, '-').toLowerCase()}`}
                aria-selected={isActive}
                className={`specialty-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSelectSpecialty(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

