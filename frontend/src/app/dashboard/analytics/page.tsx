'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI, feedbackAPI } from '@/lib/api';
import { BarChart3, TrendingUp, Sparkles, MessageSquare, Clock, Star } from 'lucide-react';

interface Stats {
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
    resolved: number;
  };
  rates: {
    resolution_rate: number;
    ai_resolution_rate: number;
  };
  response_time: {
    avg_ms: number;
    min_ms: number;
    max_ms: number;
    total_responses: number;
  };
  feedback: {
    avg_rating: number;
    total_reviews: number;
  };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, fbRes] = await Promise.all([
          analyticsAPI.getDashboard(),
          feedbackAPI.list(),
        ]);
        setStats(statsRes.data);
        setFeedbacks(fbRes.data);
      } catch (error) {
        console.error('Failed to fetch analytics');
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Analytics</h1>

      {/* Resolution Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold">Overall Resolution Rate</h2>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-green-600">
              {stats?.rates.resolution_rate || 0}%
            </span>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${stats?.rates.resolution_rate || 0}%` }}
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold">AI Resolution Rate</h2>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-primary-600">
              {stats?.rates.ai_resolution_rate || 0}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Conversations resolved by AI without human intervention
          </p>
          <div className="mt-4 bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary-500 h-3 rounded-full transition-all"
              style={{ width: `${stats?.rates.ai_resolution_rate || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Conversation Breakdown */}
      <div className="card mb-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold">Conversation Breakdown</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{stats?.conversations.active || 0}</p>
            <p className="text-sm text-green-600">Active</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-700">{stats?.conversations.escalated || 0}</p>
            <p className="text-sm text-yellow-600">Escalated</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{stats?.conversations.resolved || 0}</p>
            <p className="text-sm text-blue-600">Resolved</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-700">{stats?.conversations.total || 0}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
        </div>
      </div>

      {/* Message Stats */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold">Message Statistics</h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{stats?.messages.total || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total Messages</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-600">{stats?.messages.ai_messages || 0}</p>
            <p className="text-sm text-gray-500 mt-1">AI Responses</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600">{stats?.messages.user_messages || 0}</p>
            <p className="text-sm text-gray-500 mt-1">User Messages</p>
          </div>
        </div>
      </div>

      {/* Response Time & Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold">Response Time</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                {stats?.response_time?.avg_ms ? `${(stats.response_time.avg_ms / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-green-600 mt-1">Average</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {stats?.response_time?.min_ms ? `${(stats.response_time.min_ms / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-blue-600 mt-1">Fastest</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-700">
                {stats?.response_time?.max_ms ? `${(stats.response_time.max_ms / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-orange-600 mt-1">Slowest</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Based on {stats?.response_time?.total_responses || 0} responses
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold">Customer Satisfaction</h2>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-yellow-500">
              {stats?.feedback?.avg_rating || '—'}
              <span className="text-lg text-gray-400">/5</span>
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= (stats?.feedback?.avg_rating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Based on {stats?.feedback?.total_reviews || 0} reviews
            </p>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      {feedbacks.length > 0 && (
        <div className="card mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold">Customer Reviews</h2>
          </div>
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= fb.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  {fb.comment && (
                    <p className="text-sm text-gray-700">{fb.comment}</p>
                  )}
                  {!fb.comment && (
                    <p className="text-sm text-gray-400 italic">No comment</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(fb.created_at).toLocaleDateString()} at {new Date(fb.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
