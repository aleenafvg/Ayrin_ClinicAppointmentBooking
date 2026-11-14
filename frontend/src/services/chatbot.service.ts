import { apiClient } from './api';

export interface ChatbotMessageResponse {
  reply: string;
  timestamp: string;
}

export async function sendChatMessage(message: string): Promise<ChatbotMessageResponse> {
  return apiClient<ChatbotMessageResponse>('/chatbot/message', {
    method: 'POST',
    body: { message },
  });
}

