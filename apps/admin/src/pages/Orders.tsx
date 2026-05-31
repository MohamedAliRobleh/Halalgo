import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';
import type { Order } from '@halalgo/types';

export function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn:  async () => {
      const res = await api.get<{ orders: Order[] }>('/api/orders');
      const all = res.data.orders ?? [];
      return statusFilter === 'all' ? all : all.filter((o) => o.status === statusFilter);
    },
    refetchInterval: 30_000,
  });

  const refundMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post('/api/payments/refund', { orderId, reason: 'Admin initiated refund' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

  const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-700',
    confirmed: 'bg-blue-50 text-blue-700',
    preparing: 'bg-orange-50 text-orange-700',
    ready:     'bg-purple-50 text-purple-700',
    picked_up: 'bg-indigo-50 text-indigo-700',
    delivered: 'bg-success/10 text-success',
    cancelled: 'bg-error/10 text-error',
  };

  const COLUMNS = [
    { key: 'id',        label: 'Order ID',  render: (o: Order) => `#${o.id.slice(-8).toUpperCase()}` },
    { key: 'storeId',   label: 'Store',     render: (o: Order) => o.storeId.slice(-8) },
    { key: 'total',     label: 'Total',     render: (o: Order) => `$${Number(o.total).toFixed(2)}` },
    {
      key: 'status', label: 'Status',
      render: (o: Order) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? ''}`}>
          {o.status}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Placed At', render: (o: Order) => new Date(o.createdAt).toLocaleString('en-CA') },
    {
      key: 'actions', label: 'Actions',
      render: (o: Order) => o.status === 'delivered' ? (
        <button
          className="text-xs bg-error/10 text-error px-3 py-1 rounded-lg hover:bg-error/20"
          onClick={() => { if (confirm('Issue a full refund for this order?')) refundMutation.mutate(o.id); }}
        >Refund</button>
      ) : null,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Orders</h1>
      <select
        className="mb-4 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-primary"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
        ))}
      </select>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <DataTable columns={COLUMNS} data={orders} keyField="id" loading={isLoading} />
      </div>
    </div>
  );
}
