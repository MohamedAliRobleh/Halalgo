import { useState } from 'react';

type UserTab = 'customers' | 'restaurants' | 'drivers';

export function Users() {
  const [tab, setTab] = useState<UserTab>('customers');

  const TABS: { key: UserTab; label: string }[] = [
    { key: 'customers',   label: 'Customers' },
    { key: 'restaurants', label: 'Restaurant Owners' },
    { key: 'drivers',     label: 'Drivers' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Users</h1>
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-400">Showing {tab} — connect to Clerk Users API to list users by role.</p>
      </div>
    </div>
  );
}
