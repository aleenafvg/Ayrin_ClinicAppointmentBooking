import { Router } from 'express';
import { authenticateUser, requireRole } from '../middleware/auth';
import { handleGetAppointmentReport } from '../controllers/report.controller';

const router = Router();

// GET /reports/appointments — Doctor appointment report (reception only)
router.get(
  '/reports/appointments',
  authenticateUser,
  requireRole('RECEPTION'),
  handleGetAppointmentReport
);

export default router;

