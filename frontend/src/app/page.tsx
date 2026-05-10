'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { MessageSquare, Shield, BarChart3, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated, loadFromStorage } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary-700 flex items-center gap-2">
          <Sparkles className="w-7 h-7" />
          Eleva
        </h1>
        <div className="flex gap-4">
          <Link href="/chat" className="btn-secondary">
            Try Chat Demo
          </Link>
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn-primary">
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          AI-Powered Customer Support
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Eleva is an intelligent chatbot that resolves customer queries instantly,
          creates tickets, and seamlessly escalates to human agents when needed.
        </p>

        <div className="flex gap-4 justify-center mb-20">
          <Link href="/chat" className="btn-primary text-lg px-8 py-3">
            Start a Conversation
          </Link>
          <Link href="/demo" className="btn-secondary text-lg px-8 py-3">
            View Widget Demo
          </Link>
          <Link href={isAuthenticated ? '/dashboard' : '/login'} className="btn-secondary text-lg px-8 py-3">
            Admin Dashboard
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="card text-center">
            <MessageSquare className="w-10 h-10 text-primary-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Smart Chat</h3>
            <p className="text-gray-600 text-sm">
              AI-powered responses with knowledge base integration
            </p>
          </div>
          <div className="card text-center">
            <Zap className="w-10 h-10 text-primary-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Agentic AI</h3>
            <p className="text-gray-600 text-sm">
              Autonomous actions: tickets, knowledge search, and escalation
            </p>
          </div>
          <div className="card text-center">
            <Shield className="w-10 h-10 text-primary-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Human Escalation</h3>
            <p className="text-gray-600 text-sm">
              Seamless handoff to human agents for complex issues
            </p>
          </div>
          <div className="card text-center">
            <BarChart3 className="w-10 h-10 text-primary-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm">
              Track resolution rates, conversations, and ticket stats
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
