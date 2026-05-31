import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import type { Order } from '@halalgo/types';

export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', tab],
    queryFn: async (): Promise<Order[]> => {
      const res = await api.get<{ orders: Order[] }>('/api/orders');
      return res.data.orders ?? [];
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontWeight: '700', fontSize: 24, color: '#1B4332', marginBottom: 16 }}>My Orders</Text>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {(['active', 'past'] as const).map((t) => (
            <TouchableOpacity key={t} style={{ marginRight: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: tab === t ? '#1B4332' : '#F3F4F6' }} onPress={() => setTab(t)}>
              <Text style={{ color: tab === t ? 'white' : '#6B7280', fontWeight: '500', textTransform: 'capitalize' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }} onPress={() => router.push(`/(stack)/order/${item.id}` as never)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: '#1B4332' }}>#{item.id.slice(-8).toUpperCase()}</Text>
              <Text style={{ color: '#40916C', fontWeight: '600' }}>${Number(item.total).toFixed(2)}</Text>
            </View>
            <Text style={{ color: '#9CA3AF', fontSize: 12, textTransform: 'capitalize' }}>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 48 }}><Text style={{ fontSize: 40 }}>📦</Text><Text style={{ color: '#9CA3AF', marginTop: 12 }}>No {tab} orders</Text></View>}
      />
    </SafeAreaView>
  );
}
