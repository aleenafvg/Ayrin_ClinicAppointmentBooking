import { Router } from 'express';
import { handleChatbotMessage } from '../controllers/chatbot.controller';

const router = Router();

router.post('/chatbot/message', handleChatbotMessage);

export default router;

