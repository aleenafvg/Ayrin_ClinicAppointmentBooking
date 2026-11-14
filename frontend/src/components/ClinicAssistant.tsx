import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useUser } from '../context/UserContext';
import { sendChatMessage } from '../services/chatbot.service';
import { ApiError } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  time: string;
  isError?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hello! I'm your clinic assistant. Ask me about clinic timings, doctors, specialties, appointments or booking policies.",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const SUGGESTED_QUESTIONS = [
  'What are the clinic opening hours?',
  'Which doctors and specialties are available?',
  'What appointment durations can I book?',
  'How do I cancel an appointment?',
];

export const ClinicAssistant = () => {
  const { currentUser } = useUser();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (currentUser.role !== 'PATIENT') {
      setIsOpen(false);
    }
  }, [currentUser.role]);

  if (currentUser.role !== 'PATIENT') {
    return null;
  }

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setGlobalError(null);

    try {
      const res = await sendChatMessage(trimmed);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      let errorMessage = 'The assistant service is temporarily unavailable. Please try again.';
      if (err instanceof ApiError) {
        if (err.status === 503) {
          errorMessage =
            'Clinic Assistant is currently unavailable because the AI service is not configured.';
        } else if (err.status === 502) {
          errorMessage =
            'The AI assistant service is temporarily unreachable. Please try again shortly or contact the clinic reception.';
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: errorMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setGlobalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="clinic-assistant-wrapper">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open Clinic Assistant"
          title="Open Clinic Assistant"
        >
          <span className="chatbot-fab-icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="chatbot-fab-text">Clinic Assistant</span>
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className="chatbot-panel"
          role="dialog"
          aria-label="Clinic Assistant Chat Window"
        >
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-status-dot" aria-hidden="true" />
              <div>
                <h3 className="chatbot-title">Clinic Assistant</h3>
                <span className="chatbot-subtitle">FAQ & Clinic Information</span>
              </div>
            </div>
            <button
              type="button"
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Clinic Assistant"
              title="Close chat"
            >
              &times;
            </button>
          </div>

          {/* Messages Area */}
          <div className="chatbot-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chatbot-bubble-row ${m.sender === 'user' ? 'user-row' : 'assistant-row'}`}
              >
                <div
                  className={`chatbot-bubble ${
                    m.sender === 'user'
                      ? 'user-bubble'
                      : m.isError
                      ? 'error-bubble'
                      : 'assistant-bubble'
                  }`}
                >
                  <div className="chatbot-bubble-text">{m.text}</div>
                  <div className="chatbot-bubble-time">{m.time}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-bubble-row assistant-row">
                <div className="chatbot-bubble assistant-bubble loading-bubble">
                  <span className="loading-spinner loading-spinner-sm" aria-hidden="true" />
                  <span style={{ fontSize: '0.825rem', color: 'var(--color-text-subtle)' }}>
                    Assistant is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts (visible when few messages) */}
          {messages.length <= 2 && !loading && (
            <div className="chatbot-suggestions">
              <span className="suggestions-label">Suggested questions:</span>
              <div className="suggestions-list">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="form-control chatbot-input"
              placeholder="Ask about hours, doctors, policies..."
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              aria-label="Ask a question"
            />
            <button
              type="submit"
              className="btn btn-primary chatbot-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send question"
            >
              Send
            </button>
          </form>

          {globalError && (
            <div className="chatbot-banner-error" role="status">
              <span>{globalError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
