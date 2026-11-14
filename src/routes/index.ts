import { Router } from 'express';
import healthRoutes from './health.routes';
import doctorRoutes from './doctor.routes';
import appointmentRoutes from './appointment.routes';
import reportRoutes from './report.routes';
import chatbotRoutes from './chatbot.routes';

const router = Router();

router.use(healthRoutes);
router.use(doctorRoutes);
router.use(appointmentRoutes);
router.use(reportRoutes);
router.use(chatbotRoutes);

export default router;

