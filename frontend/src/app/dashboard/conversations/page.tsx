'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { conversationsAPI, chatAPI } from '@/lib/api';
import { MessageSquare, Send, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  user_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('status');
      if (statusParam) {
        setFilter(statusParam);
      }
    }
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await conversationsAPI.list(filter || undefined);
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  const openConversation = async (id: string) => {
    setSelectedConv(id);
    try {
      const response = await conversationsAPI.get(id);
      setMessages(response.data.messages);
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };

  // Poll for new messages in selected conversation
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedConv) {
      pollRef.current = setInterval(async () => {
        try {
          const response = await conversationsAPI.get(selectedConv);
          setMessages((prev) => {
            if (response.data.messages.length > prev.length) {
              return response.data.messages;
            }
            return prev;
          });
        } catch (error) {
          // Silently fail
        }
      }, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [selectedConv]);

  const sendAgentMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentInput.trim() || !selectedConv) return;

    try {
      await chatAPI.sendAgentMessage(selectedConv, agentInput);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'agent',
        content: agentInput,
        timestamp: new Date().toISOString(),
      }]);
      setAgentInput('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const resolveConversation = async (id: string) => {
    try {
      // Send a closing message before resolving
      await chatAPI.sendAgentMessage(id, "This conversation has been resolved. Thank you for contacting Elements HR Services. If you need further help, feel free to start a new chat!");
      await conversationsAPI.resolve(id);
      toast.success('Conversation resolved');
      fetchConversations();
      setSelectedConv(null);
    } catch (error) {
      toast.error('Failed to resolve conversation');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      escalated: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-gray-100 text-gray-700',
      closed: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8">
      {/* Conversation List */}
      <div className="w-96 border-r bg-white overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold mb-3">Conversations</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="divide-y">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                selectedConv === conv.id ? 'bg-primary-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm">{conv.user_name}</span>
                {getStatusBadge(conv.status)}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {conv.last_message || 'No messages'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {conv.message_count} messages
              </p>
            </button>
          ))}
          {conversations.length === 0 && !loading && (
            <p className="p-4 text-sm text-gray-500 text-center">No conversations found</p>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <span className="font-medium">Conversation</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resolveConversation(selectedConv)}
                  className="flex items-center gap-1 text-sm text-green-600 hover:bg-green-50 px-3 py-1 rounded"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve
                </button>
                <button
                  onClick={() => setSelectedConv(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : msg.role === 'agent'
                        ? 'bg-green-100 text-green-900 border border-green-200'
                        : 'bg-white border text-gray-800'
                    }`}
                  >
                    {msg.role === 'agent' && (
                      <p className="text-xs font-medium text-green-600 mb-1">You (Agent)</p>
                    )}
                    {msg.role === 'assistant' && (
                      <p className="text-xs font-medium text-primary-600 mb-1">AI Assistant</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Agent Input */}
            <div className="bg-white border-t p-4">
              <form onSubmit={sendAgentMessage} className="flex gap-3">
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  placeholder="Reply as agent..."
                  className="input-field flex-1"
                />
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4" />
              <p>Select a conversation to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
