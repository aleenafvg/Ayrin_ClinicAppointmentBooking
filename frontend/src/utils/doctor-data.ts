import type { DoctorRating } from '../types';

export const FALLBACK_DOCTOR_PHOTO = '/images/doctors/fallback.svg';

// Locally stored fictional doctor portrait assets in frontend/public/images/doctors/
export const DOCTOR_PROFILE_PHOTOS: Record<number, string> = {
  1: '/images/doctors/dr-rajesh-kothari.svg',
  2: '/images/doctors/dr-meera-nambiar.svg',
  3: '/images/doctors/dr-vikram-sethi.svg',
  4: '/images/doctors/dr-sneha-desai.svg',
};

// Clearly labelled DEMO ratings (ready for actual patient review data structure in a later feature)
export const DOCTOR_DEMO_RATINGS: Record<number, DoctorRating> = {
  1: { averageRating: 4.8, reviewCount: 142, isDemo: true }, // Dr. Rajesh Kothari - General Medicine
  2: { averageRating: 4.9, reviewCount: 98, isDemo: true },  // Dr. Meera Nambiar - Pediatrics
  3: { averageRating: 4.7, reviewCount: 115, isDemo: true }, // Dr. Vikram Sethi - Cardiology
  4: { averageRating: 4.6, reviewCount: 64, isDemo: true },  // Dr. Sneha Desai - Dermatology
};

export function getDoctorProfilePhoto(doctorId: number): string {
  return DOCTOR_PROFILE_PHOTOS[doctorId] || FALLBACK_DOCTOR_PHOTO;
}

export function getDoctorRating(doctorId: number): DoctorRating {
  return (
    DOCTOR_DEMO_RATINGS[doctorId] || {
      averageRating: 4.5,
      reviewCount: 10,
      isDemo: true,
    }
  );
}

