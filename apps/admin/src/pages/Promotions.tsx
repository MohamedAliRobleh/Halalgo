import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type PromoType = 'percentage' | 'fixed' | 'free_delivery';

export function Promotions() {
  const [code, setCode]   = useState('');
  const [value, setValue] = useState('');
  const [type, setType]   = useState<PromoType>('percentage');
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/payments/promotions', {
        code,
        type,
        value:    Number(value),
        minOrder: 0,
        isActive: true,
      });
    },
    onSuccess: () => {
      setCode('');
      setValue('');
      qc.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Promotions</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <h2 className="font-semibold text-gray-900 mb-4">Create Promo Code</h2>
        <div className="space-y-3">
          <input
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            placeholder="Code (e.g. WELCOME20)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            value={type}
            onChange={(e) => setType(e.target.value as PromoType)}
          >
            <option value="percentage">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="free_delivery">Free delivery</option>
          </select>
          {type !== 'free_delivery' && (
            <input
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder={type === 'percentage' ? 'Value (e.g. 20 for 20%)' : 'Value (e.g. 5 for $5 off)'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="number"
            />
          )}
          <button
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            onClick={() => createMutation.mutate()}
            disabled={!code || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Promo Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
