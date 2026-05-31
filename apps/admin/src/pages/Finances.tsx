import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RevenueChart } from '../components/RevenueChart';
import { StatCard } from '../components/StatCard';

interface RevenuePoint {
  date:         string;
  totalRevenue: string;
  orderCount:   number;
}

export function Finances() {
  const { data: revenue = [] } = useQuery({
    queryKey: ['admin-revenue-30d'],
    queryFn:  async () => {
      const res = await api.get<{ data: RevenuePoint[] }>('/api/analytics/revenue?days=30');
      return res.data.data;
    },
  });

  const totalRevenue = revenue.reduce((sum, d) => sum + Number(d.totalRevenue), 0);
  const totalOrders  = revenue.reduce((sum, d) => sum + d.orderCount, 0);
  const platformFees = totalRevenue * 0.20;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Finances</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="30-Day Revenue" value={`$${totalRevenue.toFixed(2)}`} emoji="💰" />
        <StatCard label="Platform Fees"  value={`$${platformFees.toFixed(2)}`} emoji="📊" />
        <StatCard label="Total Orders"   value={totalOrders}                   emoji="📦" />
      </div>
      <RevenueChart data={revenue} />
    </div>
  );
}
