import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface EarningsData {
  todayEarnings:  number;
  weekEarnings:   number;
  totalDeliveries: number;
  rating:         number;
}

export default function EarningsScreen() {
  const { data } = useQuery({
    queryKey: ['driver-earnings'],
    queryFn: async () => {
      const res = await api.get<EarningsData>('/api/drivers/earnings');
      return res.data;
    },
  });

  const STATS = [
    { label: "Today's Earnings", value: `$${(data?.todayEarnings ?? 0).toFixed(2)}`, emoji: '💰' },
    { label: 'This Week',        value: `$${(data?.weekEarnings ?? 0).toFixed(2)}`,  emoji: '📅' },
    { label: 'Deliveries',       value: String(data?.totalDeliveries ?? 0),          emoji: '📦' },
    { label: 'Rating',           value: `${(data?.rating ?? 0).toFixed(1)} ⭐`,      emoji: '⭐' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="px-5 pt-4">
        <Text className="font-poppins-bold text-primary text-2xl mb-6">Earnings</Text>
        <View className="flex-row flex-wrap">
          {STATS.map(({ label, value, emoji }) => (
            <View key={label} className="w-1/2 pr-3 pb-3">
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <Text className="text-2xl mb-2">{emoji}</Text>
                <Text className="font-mono text-primary text-xl font-bold">{value}</Text>
                <Text className="font-inter text-gray-500 text-xs mt-1">{label}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
