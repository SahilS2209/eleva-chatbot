'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, RotateCcw, CheckCircle2, Star } from 'lucide-react';
import { chatAPI, conversationsAPI, feedbackAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant' | 'agent';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startConversation = () => {
    setConversationId(null);
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m Eleva, your AI support assistant from Elements HR Services. How can I help you today?',
      timestamp: new Date().toISOString(),
    }]);
  };

  useEffect(() => {
    startConversation();
  }, []);

  // Poll for new messages when escalated
  const pollMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await conversationsAPI.get(conversationId);
      const serverMessages: Message[] = response.data.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      // Add the welcome message at the start
      const allMessages: Message[] = [
        {
          role: 'assistant' as const,
          content: 'Hello! I\'m Eleva, your AI support assistant from Elements HR Services. How can I help you today?',
          timestamp: new Date().toISOString(),
        },
        ...serverMessages,
      ];

      // Only update if server has new messages
      setMessages((prev) => {
        if (allMessages.length >= prev.length) {
          return allMessages;
        }
        return prev;
      });
      setStatus(response.data.status);
    } catch (error) {
      // Silently fail polling
    }
  }, [conversationId]);

  useEffect(() => {
    if (status === 'escalated' && conversationId) {
      // Start polling every 3 seconds when escalated
      pollingRef.current = setInterval(pollMessages, 3000);
    } else {
      // Stop polling when not escalated
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [status, conversationId, pollMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Create conversation on first message
      let convId = conversationId;
      if (!convId) {
        const convResponse = await conversationsAPI.create('Customer');
        convId = convResponse.data.id;
        setConversationId(convId);
      }

      if (status === 'escalated') {
        await chatAPI.sendMessage(convId!, userMessage.content);
      } else {
        const response = await chatAPI.sendMessage(convId!, userMessage.content);
        const aiMessage: Message = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setStatus(response.data.status);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="font-semibold text-lg">Eleva</h1>
            <p className="text-sm text-gray-500">
              {status === 'escalated' ? '🟡 Connected to human agent' : status === 'resolved' ? '✅ Conversation resolved' : '🟢 Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {(status === 'active' || status === 'escalated') && messages.length > 1 && (
            <button
              onClick={async () => {
                if (!conversationId) return;
                try {
                  await conversationsAPI.end(conversationId);
                  setStatus('resolved');
                  setMessages((prev) => [...prev, {
                    role: 'assistant',
                    content: 'Thank you for contacting Elements HR Services! Your conversation has been closed. Feel free to start a new chat anytime you need help.',
                    timestamp: new Date().toISOString(),
                  }]);
                } catch (error) {
                  toast.error('Failed to end chat');
                }
              }}
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              End Chat
            </button>
          )}
          <button
            onClick={() => {
              setConversationId(null);
              setMessages([]);
              setStatus('active');
              setRating(0);
              setRatingHover(0);
              setFeedbackComment('');
              setRatingSubmitted(false);
              startConversation();
            }}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Chat
          </button>
          <Link href="/" className="text-sm text-primary-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role !== 'user' && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'agent' ? 'bg-green-100' : 'bg-primary-100'
                }`}>
                  <Sparkles className={`w-5 h-5 ${msg.role === 'agent' ? 'text-green-600' : 'text-primary-600'}`} />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : msg.role === 'agent'
                    ? 'bg-green-100 text-green-900 border border-green-200'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {msg.role === 'agent' && (
                  <p className="text-xs font-medium text-green-600 mb-1">Human Agent</p>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-6 py-4">
        {/* Canned Responses - show only when no messages sent yet */}
        {messages.length <= 1 && status === 'active' && (
          <div className="max-w-4xl mx-auto mb-3 flex gap-2 flex-wrap">
            {['Tell me about your services', 'Pricing details', 'Contact information', 'How to get started'].map((text) => (
              <button
                key={text}
                onClick={async () => {
                  setInput('');
                  const userMessage: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
                  setMessages((prev) => [...prev, userMessage]);
                  setLoading(true);
                  try {
                    let convId = conversationId;
                    if (!convId) {
                      const convResponse = await conversationsAPI.create('Customer');
                      convId = convResponse.data.id;
                      setConversationId(convId);
                    }
                    const response = await chatAPI.sendMessage(convId!, text);
                    const aiMessage: Message = { role: 'assistant', content: response.data.response, timestamp: new Date().toISOString() };
                    setMessages((prev) => [...prev, aiMessage]);
                    setStatus(response.data.status);
                  } catch (error) {
                    toast.error('Failed to send message');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors"
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Rating UI - show after conversation is resolved */}
        {status === 'resolved' && !ratingSubmitted && (
          <div className="max-w-4xl mx-auto mb-4 p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">How was your experience?</p>
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="p-1"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      star <= (ratingHover || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Any additional feedback? (optional)"
                  className="input-field text-sm mb-3 min-h-[60px] resize-none"
                  rows={2}
                />
                <button
                  onClick={async () => {
                    if (!conversationId) return;
                    try {
                      await feedbackAPI.submit(conversationId, rating, feedbackComment || undefined);
                      setRatingSubmitted(true);
                      toast.success('Thank you for your feedback!');
                    } catch (error) {
                      toast.error('Failed to submit feedback');
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  Submit Feedback
                </button>
              </>
            )}
          </div>
        )}

        {ratingSubmitted && (
          <div className="max-w-4xl mx-auto mb-4 p-3 bg-green-50 rounded-xl text-center text-sm text-green-700">
            Thank you for your feedback! Start a new chat anytime.
          </div>
        )}

        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder={status === 'resolved' ? 'Conversation closed. Start a new chat for more help.' : status === 'escalated' ? 'Type your reply to the agent...' : 'Type your message...'}
            className="input-field flex-1 resize-none min-h-[44px] max-h-[120px]"
            disabled={loading || status === 'resolved'}
            rows={1}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || status === 'resolved'}
            className="btn-primary flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
