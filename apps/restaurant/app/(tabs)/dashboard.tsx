import { View, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const [isOpen, setIsOpen] = useState(true);
  const qc = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ['restaurant-analytics'],
    queryFn: async () => {
      const res = await api.get<{ revenue: number; orderCount: number; rating: number }>(
        '/api/analytics/dashboard',
      );
      return res.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (open: boolean) => {
      await api.patch('/api/stores/me/status', { isOpen: open });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-analytics'] }),
  });

  function handleToggle(value: boolean): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(value);
    toggleMutation.mutate(value);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="px-5 pt-4">
        <Text className="font-poppins-bold text-primary text-2xl mb-6">Dashboard</Text>

        {/* Online Toggle */}
        <View className={`rounded-3xl p-6 mb-6 ${isOpen ? 'bg-success' : 'bg-gray-400'}`}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white font-poppins-bold text-xl">
                {isOpen ? '🟢 Accepting Orders' : '🔴 Closed'}
              </Text>
              <Text className="text-white/80 font-inter text-sm mt-1">
                {isOpen ? 'Customers can order from you' : 'Toggle to start accepting orders'}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={handleToggle}
              trackColor={{ false: '#ffffff40', true: '#ffffff60' }}
              thumbColor="#ffffff"
              style={{ transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] }}
            />
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row mb-4">
          {[
            { label: "Today's Revenue", value: `$${(analytics?.revenue ?? 0).toFixed(2)}`, emoji: '💰' },
            { label: 'Orders Today', value: String(analytics?.orderCount ?? 0), emoji: '📦' },
          ].map(({ label, value, emoji }) => (
            <View key={label} className="flex-1 bg-white rounded-2xl p-4 mr-3 last:mr-0 shadow-sm">
              <Text className="text-2xl mb-2">{emoji}</Text>
              <Text className="font-mono text-primary text-xl font-bold">{value}</Text>
              <Text className="font-inter text-gray-500 text-xs mt-1">{label}</Text>
            </View>
          ))}
        </View>

        {/* Rating */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-2xl mb-2">⭐</Text>
          <Text className="font-mono text-primary text-xl font-bold">
            {(analytics?.rating ?? 0).toFixed(1)}
          </Text>
          <Text className="font-inter text-gray-500 text-xs mt-1">Average Rating</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
