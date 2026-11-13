import { Router } from 'express';
import { authenticateUser, requireRole } from '../middleware/auth';
import {
  handleBookAppointment,
  handleListAppointments,
  handleCancelAppointment,
} from '../controllers/appointment.controller';

const router = Router();

// POST /appointments — Book an appointment (patients only)
router.post(
  '/appointments',
  authenticateUser,
  requireRole('PATIENT'),
  handleBookAppointment
);

// GET /appointments — List appointments (patients see own; reception sees all; paginated)
router.get(
  '/appointments',
  authenticateUser,
  handleListAppointments
);

// PATCH /appointments/:id/cancel — Cancel an appointment (patient own or reception any)
router.patch(
  '/appointments/:id/cancel',
  authenticateUser,
  handleCancelAppointment
);

export default router;

