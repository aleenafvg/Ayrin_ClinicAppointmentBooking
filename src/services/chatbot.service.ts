import { AppError } from '../middleware/error-handler';
import {
  CHATBOT_SYSTEM_PROMPT,
  isMedicalQuery,
  MEDICAL_ADVICE_REFUSAL,
} from '../config/chatbot-knowledge';

export interface ChatbotResponse {
  reply: string;
  timestamp: string;
}

export async function askChatbot(userMessage: string): Promise<ChatbotResponse> {
  const trimmed = userMessage.trim();

  if (!trimmed) {
    throw new AppError(400, 'INVALID_MESSAGE', 'Message is required and cannot be empty.');
  }

  if (trimmed.length > 500) {
    throw new AppError(
      400,
      'MESSAGE_TOO_LONG',
      'Message exceeds maximum allowed length of 500 characters.'
    );
  }

  // Safety guardrail: immediate medical advice refusal
  if (isMedicalQuery(trimmed)) {
    return {
      reply: MEDICAL_ADVICE_REFUSAL,
      timestamp: new Date().toISOString(),
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (!geminiApiKey && !openAiApiKey) {
    throw new AppError(
      503,
      'CHATBOT_UNAVAILABLE',
      'Clinic Assistant is currently unavailable because the AI service is not configured.'
    );
  }

  const controller = new AbortController();
  const timeoutMs = 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let reply = '';

    if (geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(
        geminiApiKey
      )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: CHATBOT_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: trimmed }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (openAiApiKey) {
      const url = 'https://api.openai.com/v1/chat/completions';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
            { role: 'user', content: trimmed },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      reply = data?.choices?.[0]?.message?.content?.trim() || '';
    }

    if (!reply) {
      throw new Error('AI Provider returned an empty response.');
    }

    return {
      reply,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    // Timeout or network/API failure
    throw new AppError(
      502,
      'AI_PROVIDER_ERROR',
      'The AI assistant service is temporarily unavailable. Please try again later.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

