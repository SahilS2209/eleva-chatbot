'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ticketsAPI } from '@/lib/api';
import { Ticket, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketData {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  conversation_id: string | null;
  customer_email: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== filter) {
      setFilter(statusParam);
    }
  }, [searchParams]);

  const fetchTickets = async () => {
    try {
      const response = await ticketsAPI.list(filter || undefined);
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const statusLabels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    try {
      await ticketsAPI.updateStatus(id, status);
      toast.success(`Ticket marked as ${statusLabels[status] || status}`);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress': return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Tickets</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card text-center py-12">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(ticket.status)}
                    <h3 className="font-semibold">{ticket.title}</h3>
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                    {ticket.customer_email && <span>Email: {ticket.customer_email}</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {ticket.status === 'open' && (
                    <button
                      onClick={() => updateStatus(ticket.id, 'in_progress')}
                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                    >
                      Start
                    </button>
                  )}
                  {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                    <button
                      onClick={() => updateStatus(ticket.id, 'resolved')}
                      className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded hover:bg-green-100"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
