import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

type NotifTarget = 'all' | 'customer' | 'driver' | 'restaurant';

export function Notifications() {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [target, setTarget] = useState<NotifTarget>('all');
  const [sent, setSent]     = useState(false);

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/admin/notifications/broadcast', { title, body, target });
    },
    onSuccess: () => {
      setSent(true);
      setTitle('');
      setBody('');
      setTimeout(() => setSent(false), 3000);
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Push Notifications</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl">
        <h2 className="font-semibold text-gray-900 mb-4">Broadcast Notification</h2>
        {sent && (
          <div className="bg-success/10 text-success rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            ✅ Notification sent successfully!
          </div>
        )}
        <div className="space-y-3">
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            value={target}
            onChange={(e) => setTarget(e.target.value as NotifTarget)}
          >
            <option value="all">All users</option>
            <option value="customer">Customers only</option>
            <option value="driver">Drivers only</option>
            <option value="restaurant">Restaurant owners only</option>
          </select>
          <input
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
            placeholder="Notification body message..."
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            onClick={() => broadcastMutation.mutate()}
            disabled={!title || !body || broadcastMutation.isPending}
          >
            {broadcastMutation.isPending ? 'Sending...' : `Send to ${target === 'all' ? 'All Users' : target}`}
          </button>
        </div>
      </div>
    </div>
  );
}
