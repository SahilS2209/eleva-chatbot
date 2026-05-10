import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
        if (!isAuthPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/api/auth/register', data),
  getMe: () => api.get('/api/auth/me'),
};

// Conversations API
export const conversationsAPI = {
  create: (userName?: string) =>
    api.post('/api/conversations', null, { params: { user_name: userName } }),
  list: (status?: string, limit?: number, skip?: number) =>
    api.get('/api/conversations', { params: { status, limit, skip } }),
  get: (id: string) => api.get(`/api/conversations/${id}`),
  escalate: (id: string) => api.patch(`/api/conversations/${id}/escalate`),
  resolve: (id: string) => api.patch(`/api/conversations/${id}/resolve`),
  end: (id: string) => api.patch(`/api/conversations/${id}/end`),
  assign: (id: string, agentId: string) =>
    api.patch(`/api/conversations/${id}/assign`, null, { params: { agent_id: agentId } }),
};

// Chat API
export const chatAPI = {
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/api/chat/${conversationId}/message`, { content }),
  sendAgentMessage: (conversationId: string, content: string) =>
    api.post(`/api/chat/${conversationId}/agent-message`, { content }),
};

// Tickets API
export const ticketsAPI = {
  list: (status?: string) => api.get('/api/tickets', { params: { status } }),
  get: (id: string) => api.get(`/api/tickets/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/api/tickets/${id}/status`, null, { params: { new_status: status } }),
  assign: (id: string, agentId: string) =>
    api.patch(`/api/tickets/${id}/assign`, null, { params: { agent_id: agentId } }),
};

// Knowledge Base API
export const knowledgeAPI = {
  listDocuments: () => api.get('/api/knowledge/documents'),
  getDocument: (id: string) => api.get(`/api/knowledge/documents/${id}`),
  addDocument: (data: { title: string; content: string; source?: string }) =>
    api.post('/api/knowledge/documents', data),
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDocument: (id: string) => api.delete(`/api/knowledge/documents/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
};

// Users API
export const usersAPI = {
  listAgents: () => api.get('/api/users/agents'),
  changeRole: (id: string, role: string) =>
    api.patch(`/api/users/${id}/role`, null, { params: { new_role: role } }),
  toggleActive: (id: string) => api.patch(`/api/users/${id}/toggle-active`),
  deleteUser: (id: string) => api.delete(`/api/users/${id}`),
};

// Feedback API
export const feedbackAPI = {
  submit: (conversationId: string, rating: number, comment?: string) =>
    api.post('/api/feedback', { conversation_id: conversationId, rating, comment }),
  list: (limit?: number, skip?: number) =>
    api.get('/api/feedback/list', { params: { limit, skip } }),
};
