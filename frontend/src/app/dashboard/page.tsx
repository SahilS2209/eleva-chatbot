'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Ticket,
  Users,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  conversations: {
    total: number;
    active: number;
    escalated: number;
    resolved: number;
    recent_7_days: number;
  };
  messages: {
    total: number;
    ai_messages: number;
    user_messages: number;
  };
  tickets: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
  };
  agents: {
    total: number;
  };
  rates: {
    resolution_rate: number;
    ai_resolution_rate: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsAPI.getDashboard();
        setStats(response.data);
      } catch (error: any) {
        console.error('Failed to fetch stats:', error.response?.status, error.response?.data);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const agentCards = [
    {
      title: 'Escalated',
      value: stats?.conversations.escalated || 0,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      link: '/dashboard/conversations?status=escalated',
    },
    {
      title: 'Active Conversations',
      value: stats?.conversations.active || 0,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50',
      link: '/dashboard/conversations?status=active',
    },
    {
      title: 'Open Tickets',
      value: stats?.tickets.open || 0,
      icon: Ticket,
      color: 'text-red-600',
      bg: 'bg-red-50',
      link: '/dashboard/tickets?status=open',
    },
    {
      title: 'Total Messages',
      value: stats?.messages.total || 0,
      icon: MessageSquare,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      link: null,
    },
  ];

  const adminCards = [
    {
      title: 'Resolved Conversations',
      value: stats?.conversations.resolved || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/dashboard/conversations?status=resolved',
    },
    {
      title: 'Active Conversations',
      value: stats?.conversations.active || 0,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50',
      link: '/dashboard/conversations?status=active',
    },
    {
      title: 'Escalated',
      value: stats?.conversations.escalated || 0,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      link: '/dashboard/conversations?status=escalated',
    },
    {
      title: 'Open Tickets',
      value: stats?.tickets.open || 0,
      icon: Ticket,
      color: 'text-red-600',
      bg: 'bg-red-50',
      link: '/dashboard/tickets?status=open',
    },
    {
      title: 'In Progress Tickets',
      value: stats?.tickets.in_progress || 0,
      icon: Ticket,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      link: '/dashboard/tickets?status=in_progress',
    },
    {
      title: 'Resolution Rate',
      value: `${stats?.rates.resolution_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: null,
    },
    {
      title: 'AI Resolution Rate',
      value: `${stats?.rates.ai_resolution_rate || 0}%`,
      icon: Sparkles,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      link: null,
    },
    {
      title: 'Support Agents',
      value: stats?.agents.total || 0,
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      link: '/dashboard/agents',
    },
  ];

  const statCards = isAdmin ? adminCards : agentCards;

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 mt-8 md:mt-0">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`card ${card.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              onClick={() => card.link && router.push(card.link)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.title}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity - Admin only */}
      {isAdmin && (
        <div className="mt-8 card">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Conversations (7 days)</p>
              <p className="text-xl font-bold">{stats?.conversations.recent_7_days || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Messages</p>
              <p className="text-xl font-bold">{stats?.messages.total || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">AI Messages Sent</p>
              <p className="text-xl font-bold">{stats?.messages.ai_messages || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tickets Resolved</p>
              <p className="text-xl font-bold">{stats?.tickets.resolved || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
