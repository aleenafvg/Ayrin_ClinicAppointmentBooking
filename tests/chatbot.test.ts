import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Chatbot API (/chatbot/message)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects empty or whitespace-only messages with 400', async () => {
    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MESSAGE');
  });

  it('rejects missing message property with 400', async () => {
    const res = await request(app)
      .post('/chatbot/message')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_MESSAGE');
  });

  it('rejects excessively long messages (> 500 chars) with 400', async () => {
    const longMessage = 'A'.repeat(501);
    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MESSAGE_TOO_LONG');
  });

  it('returns 503 when the AI API key is missing from environment', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: 'What are the clinic timings?' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CHATBOT_UNAVAILABLE');
    expect(res.body.error.message).toContain('currently unavailable');
  });

  it('politely refuses medical diagnosis / medication questions without calling LLM', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: 'I have a severe headache and fever, what medicine should I take?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('I cannot provide medical diagnoses');
    expect(res.body.reply).toContain('healthcare professional');
    // Guardrail intercepts before external LLM network call
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers valid clinic FAQ questions when LLM returns answer', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const fakeAnswer =
      'Ayrin Clinic is open Monday through Sunday from 9:00 AM to 9:00 PM IST.';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: fakeAnswer }],
            },
          },
        ],
      }),
    } as any);

    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: 'What are the clinic opening hours?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe(fakeAnswer);
    expect(res.body.timestamp).toBeDefined();
  });

  it('handles unknown questions appropriately', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const fallbackAnswer =
      "I don't have information about that. For inquiries not covered by our clinic FAQ, please contact clinic reception.";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: fallbackAnswer }],
            },
          },
        ],
      }),
    } as any);

    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: 'Can I land a helicopter on the clinic roof?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("don't have information");
  });

  it('handles AI provider failure gracefully with 502', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    global.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: 'Who are the available doctors?' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
    expect(res.body.error.message).toContain('temporarily unavailable');
  });

  it('handles non-200 response from AI provider with 502', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error from Gemini',
    } as any);

    const res = await request(app)
      .post('/chatbot/message')
      .send({ message: 'What are the appointment durations?' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
  });
});

