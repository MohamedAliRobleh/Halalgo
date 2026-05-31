import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatCard } from '../components/StatCard';
import { RevenueChart } from '../components/RevenueChart';
import { MapContainer, TileLayer } from 'react-leaflet';

interface DashboardData {
  revenue: { today: number; orderCount: number };
  orders:  { hourly: unknown[] };
}

interface RevenuePoint {
  date:         string;
  totalRevenue: string;
  orderCount:   number;
}

export function Dashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn:  async () => {
      const res = await api.get<DashboardData>('/api/analytics/dashboard');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ['admin-revenue-7d'],
    queryFn:  async () => {
      const res = await api.get<{ data: RevenuePoint[] }>('/api/analytics/revenue?days=7');
      return res.data.data;
    },
  });

  const STATS = [
    { label: "Today's Revenue", value: `$${(dashboard?.revenue.today ?? 0).toFixed(2)}`, emoji: '💰', trend: '12%', trendUp: true  as const },
    { label: 'Orders Today',    value: dashboard?.revenue.orderCount ?? 0,                emoji: '📦', trend: '8%',  trendUp: true  as const },
    { label: 'Active Drivers',  value: '—',                                               emoji: '🛵' },
    { label: 'Open Stores',     value: '—',                                               emoji: '🏪' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2">
          <RevenueChart data={revenue} />
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Orders This Hour</h3>
          <p className="text-4xl font-bold text-primary font-mono">
            {dashboard?.revenue.orderCount ?? 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">orders placed today</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Live Driver Map</h3>
        </div>
        <MapContainer
          center={[45.4215, -75.6972]}
          zoom={12}
          style={{ height: 320, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    </div>
  );
}
