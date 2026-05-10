'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, MessageCircle, Minimize2 } from 'lucide-react';
import { chatAPI, conversationsAPI } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant' | 'agent';
  content: string;
  timestamp: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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
      content: 'Hi! I\'m Eleva from Elements HR Services. How can I help you today?',
      timestamp: new Date().toISOString(),
    }]);
    setStatus('active');
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      startConversation();
    }
  };

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

      const allMessages: Message[] = [
        {
          role: 'assistant' as const,
          content: 'Hi! I\'m Eleva from Elements HR Services. How can I help you today?',
          timestamp: new Date().toISOString(),
        },
        ...serverMessages,
      ];

      setMessages((prev) => {
        if (allMessages.length >= prev.length) {
          return allMessages;
        }
        return prev;
      });
      setStatus(response.data.status);
    } catch (error) {
      // Silently fail
    }
  }, [conversationId]);

  useEffect(() => {
    if (status === 'escalated' && conversationId) {
      pollingRef.current = setInterval(pollMessages, 3000);
    } else {
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
        const convResponse = await conversationsAPI.create('Website Visitor');
        convId = convResponse.data.id;
        setConversationId(convId);
      }

      if (status === 'escalated') {
        await chatAPI.sendMessage(convId!, userMessage.content);
      } else {
        const response = await chatAPI.sendMessage(convId!, userMessage.content);
        if (response.data.response) {
          const aiMessage: Message = {
            role: 'assistant',
            content: response.data.response,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
        setStatus(response.data.status);
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'escalated': return 'Connected to human agent';
      case 'resolved': return 'Conversation ended';
      default: return 'AI Assistant • Online';
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Eleva</h3>
                <p className="text-xs text-white/80">
                  {getStatusText()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    msg.role === 'agent' ? 'bg-green-100' : 'bg-primary-100'
                  }`}>
                    <Sparkles className={`w-4 h-4 ${msg.role === 'agent' ? 'text-green-600' : 'text-primary-600'}`} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : msg.role === 'agent'
                      ? 'bg-green-100 text-green-900 border border-green-200 rounded-bl-md'
                      : 'bg-white text-gray-800 shadow-sm border rounded-bl-md'
                  }`}
                >
                  {msg.role === 'agent' && (
                    <p className="text-xs font-medium text-green-600 mb-0.5">Human Agent</p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-white shadow-sm border rounded-2xl rounded-bl-md px-4 py-3">
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

          {/* Input */}
          <div className="border-t bg-white px-4 py-3">
            {status === 'resolved' ? (
              <button
                onClick={() => {
                  setConversationId(null);
                  setMessages([]);
                  setStatus('active');
                  startConversation();
                }}
                className="w-full py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Start New Conversation
              </button>
            ) : (
              <form onSubmit={sendMessage} className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  placeholder={status === 'escalated' ? 'Type your reply...' : 'Type a message...'}
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none min-h-[40px] max-h-[80px]"
                  disabled={loading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
            <p className="text-center text-xs text-gray-400 mt-2">
              Powered by Elements HR Services
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
