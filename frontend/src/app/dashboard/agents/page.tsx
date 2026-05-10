'use client';

import { useEffect, useState } from 'react';
import { usersAPI } from '@/lib/api';
import { Users, Mail, Calendar, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const response = await usersAPI.listAgents();
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleChangeRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'agent' : 'admin';
    try {
      await usersAPI.changeRole(id, newRole);
      toast.success(`Role changed to ${newRole === 'admin' ? 'Admin' : 'Support Agent'}`);
      fetchAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to change role');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const response = await usersAPI.toggleActive(id);
      toast.success(response.data.message);
      fetchAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await usersAPI.deleteUser(id);
      toast.success('User deleted');
      setDeleteId(null);
      fetchAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <p className="text-sm text-gray-500">{agents.length} user{agents.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="font-semibold text-lg">Delete User</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No other users registered yet</p>
          <p className="text-sm text-gray-400">
            Users can register from the sign-up page
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${agent.is_active ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <span className={`text-lg font-semibold ${agent.is_active ? 'text-primary-700' : 'text-gray-400'}`}>
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        agent.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {agent.role === 'admin' ? 'Admin' : 'Agent'}
                      </span>
                      {!agent.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{agent.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {new Date(agent.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(agent.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      agent.is_active
                        ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    title={agent.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {agent.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    {agent.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setDeleteId(agent.id)}
                    className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
