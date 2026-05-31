import { View, Text, FlatList, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import * as Haptics from 'expo-haptics';
import type { Order } from '@halalgo/types';

type Tab = 'new' | 'active' | 'completed';

export default function OrdersScreen() {
  const [activeTab, setTab]     = useState<Tab>('new');
  const [newOrder, setNewOrder] = useState<Order | null>(null);
  const qc = useQueryClient();

  useWebSocket('store:current', useCallback((data) => {
    const msg = data as { type: string; order?: Order };
    if (msg.type === 'new_order' && msg.order) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setNewOrder(msg.order);
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
    }
  }, []));

  const { data: orders = [] } = useQuery({
    queryKey: ['restaurant-orders', activeTab],
    queryFn: async () => {
      const statusMap: Record<Tab, string[]> = {
        new:       ['pending', 'confirmed'],
        active:    ['preparing', 'ready'],
        completed: ['delivered', 'cancelled'],
      };
      const res = await api.get<{ orders: Order[] }>('/api/orders');
      return (res.data.orders ?? []).filter((o) => statusMap[activeTab].includes(o.status));
    },
    refetchInterval: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await api.patch(`/api/orders/${orderId}/status`, { status, changedByRole: 'store' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-orders'] }),
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'new', label: 'New' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Modal visible={!!newOrder} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="font-poppins-bold text-primary text-xl mb-2">🔔 New Order!</Text>
            <Text className="font-inter text-gray-500 mb-6">
              Order #{newOrder?.id.slice(-6).toUpperCase()} — ${Number(newOrder?.total ?? 0).toFixed(2)}
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-error rounded-2xl py-4 items-center mr-3"
                onPress={() => {
                  if (newOrder) updateMutation.mutate({ orderId: newOrder.id, status: 'cancelled' });
                  setNewOrder(null);
                }}
              >
                <Text className="text-white font-inter-medium">Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-success rounded-2xl py-4 items-center"
                onPress={() => {
                  if (newOrder) updateMutation.mutate({ orderId: newOrder.id, status: 'confirmed' });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setNewOrder(null);
                }}
              >
                <Text className="text-white font-inter-medium">Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="px-5 pt-4">
        <Text className="font-poppins-bold text-primary text-2xl mb-4">Orders</Text>
        <View className="flex-row mb-4">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`mr-3 px-4 py-2 rounded-xl ${activeTab === tab.key ? 'bg-primary' : 'bg-gray-100'}`}
              onPress={() => setTab(tab.key)}
            >
              <Text className={`font-inter-medium text-sm ${activeTab === tab.key ? 'text-white' : 'text-gray-600'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row justify-between mb-2">
              <Text className="font-poppins-bold text-primary">#{item.id.slice(-6).toUpperCase()}</Text>
              <Text className="font-mono text-primary">${Number(item.total).toFixed(2)}</Text>
            </View>
            <Text className="font-inter text-gray-500 text-xs mb-3">Status: {item.status}</Text>
            {item.status === 'preparing' && (
              <TouchableOpacity
                className="bg-success rounded-xl py-3 items-center"
                onPress={() => updateMutation.mutate({ orderId: item.id, status: 'ready' })}
              >
                <Text className="text-white font-inter-medium">Mark as Ready</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 font-inter mt-8">No {activeTab} orders</Text>
        }
      />
    </SafeAreaView>
  );
}
