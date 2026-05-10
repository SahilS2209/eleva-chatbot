'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { conversationsAPI, ticketsAPI } from '@/lib/api';
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  BookOpen,
  BarChart3,
  LogOut,
  Sparkles,
  Users,
} from 'lucide-react';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'] },
  { href: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare, roles: ['admin', 'agent'], badge: 'escalated' },
  { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket, roles: ['admin', 'agent'], badge: 'openTickets' },
  { href: '/dashboard/agents', label: 'Agents', icon: Users, roles: ['admin'], badge: null },
  { href: '/dashboard/knowledge', label: 'Train Chatbot', icon: BookOpen, roles: ['admin'], badge: null },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'], badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [counts, setCounts] = useState({ escalated: 0, openTickets: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [convRes, ticketRes] = await Promise.all([
          conversationsAPI.list('escalated'),
          ticketsAPI.list('open'),
        ]);
        setCounts({
          escalated: convRes.data.length,
          openTickets: ticketRes.data.length,
        });
      } catch (error) {
        // Silently fail
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary-600" />
          <span className="font-bold text-lg">Eleva</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {allNavItems
          .filter((item) => item.roles.includes(user?.role || ''))
          .map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badgeCount = item.badge ? counts[item.badge as keyof typeof counts] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                {item.label}
              </div>
              {badgeCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors w-full px-2 py-1"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
