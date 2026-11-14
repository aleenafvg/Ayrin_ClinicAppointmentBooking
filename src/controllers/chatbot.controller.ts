import { Request, Response, NextFunction } from 'express';
import { askChatbot } from '../services/chatbot.service';
import { AppError } from '../middleware/error-handler';

export async function handleChatbotMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.body || typeof req.body !== 'object') {
      throw new AppError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
    }

    const { message } = req.body;

    if (message === undefined || message === null) {
      throw new AppError(400, 'INVALID_MESSAGE', 'Message field is required.');
    }

    if (typeof message !== 'string') {
      throw new AppError(400, 'INVALID_MESSAGE', 'Message must be a string.');
    }

    const result = await askChatbot(message);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

