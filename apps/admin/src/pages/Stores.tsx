import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';
import type { Store } from '@halalgo/types';

type FilterKey = 'all' | 'pending' | 'verified';

export function Stores() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const qc = useQueryClient();

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores', filter],
    queryFn:  async () => {
      const res = await api.get<{ stores: Store[] }>('/api/stores');
      const all = res.data.stores;
      if (filter === 'pending')  return all.filter((s) => !s.isVerified);
      if (filter === 'verified') return all.filter((s) => s.isVerified);
      return all;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ storeId, verify }: { storeId: string; verify: boolean }) => {
      await api.patch(`/api/admin/stores/${storeId}/verify`, { isVerified: verify });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stores'] }),
  });

  const COLUMNS = [
    { key: 'name',      label: 'Store Name' },
    { key: 'storeType', label: 'Type' },
    { key: 'city',      label: 'City' },
    { key: 'rating',    label: 'Rating', render: (s: Store) => `⭐ ${s.rating.toFixed(1)}` },
    {
      key: 'isVerified',
      label: 'Status',
      render: (s: Store) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isVerified ? 'bg-success/10 text-success' : 'bg-yellow-50 text-yellow-700'}`}>
          {s.isVerified ? '✓ Halal Verified' : '⏳ Pending'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s: Store) => (
        <div className="flex gap-2">
          {s.halalCertificateUrl && (
            <a href={s.halalCertificateUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-blue-600 hover:underline">View Cert</a>
          )}
          {!s.isVerified ? (
            <button
              className="text-xs bg-success text-white px-3 py-1 rounded-lg hover:bg-success/90"
              onClick={() => verifyMutation.mutate({ storeId: s.id, verify: true })}
            >Verify</button>
          ) : (
            <button
              className="text-xs bg-error text-white px-3 py-1 rounded-lg hover:bg-error/90"
              onClick={() => verifyMutation.mutate({ storeId: s.id, verify: false })}
            >Revoke</button>
          )}
        </div>
      ),
    },
  ];

  const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending Verification' },
    { key: 'verified', label: 'Verified' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Stores</h1>

      <div className="flex gap-2 mb-4">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === tab.key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <DataTable columns={COLUMNS} data={stores} keyField="id" loading={isLoading} />
      </div>
    </div>
  );
}
