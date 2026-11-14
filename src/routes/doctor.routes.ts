import { Router } from 'express';
import { authenticateUser, requireRole } from '../middleware/auth';
import {
  getDoctors,
  handleDeactivateDoctor,
  handleActivateDoctor,
} from '../controllers/doctor.controller';

const router = Router();

// GET /doctors — List doctors (patients get active only; reception can pass includeInactive=true)
router.get('/doctors', authenticateUser, getDoctors);

// PATCH /doctors/:id/deactivate — Deactivate doctor (reception only)
router.patch(
  '/doctors/:id/deactivate',
  authenticateUser,
  requireRole('RECEPTION'),
  handleDeactivateDoctor
);

// PATCH /doctors/:id/activate — Activate/reactivate doctor (reception only)
router.patch(
  '/doctors/:id/activate',
  authenticateUser,
  requireRole('RECEPTION'),
  handleActivateDoctor
);

export default router;

