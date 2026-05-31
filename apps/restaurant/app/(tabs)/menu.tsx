import { View, Text, FlatList, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { MenuItem } from '@halalgo/types';

export default function MenuScreen() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['restaurant-menu'],
    queryFn: async () => {
      const res = await api.get<{ items: MenuItem[] }>('/api/menu/me');
      return res.data.items ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) => {
      await api.patch(`/api/menu/${itemId}`, { isAvailable });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-menu'] }),
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="font-poppins-bold text-primary text-2xl">Menu</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-inter-medium text-primary">{item.name}</Text>
              <Text className="font-mono text-secondary text-sm mt-1">${Number(item.basePrice).toFixed(2)}</Text>
            </View>
            <Switch
              value={item.isAvailable}
              onValueChange={(val) => toggleMutation.mutate({ itemId: item.id, isAvailable: val })}
              trackColor={{ false: '#E5E7EB', true: '#2D6A4F' }}
              thumbColor="#ffffff"
            />
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 font-inter mt-8">No menu items</Text>
        }
      />
    </SafeAreaView>
  );
}
