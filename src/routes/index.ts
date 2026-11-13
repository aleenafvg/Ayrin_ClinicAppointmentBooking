import { Router } from 'express';
import healthRoutes from './health.routes';
import doctorRoutes from './doctor.routes';
import appointmentRoutes from './appointment.routes';

const router = Router();

router.use(healthRoutes);
router.use(doctorRoutes);
router.use(appointmentRoutes);

export default router;

