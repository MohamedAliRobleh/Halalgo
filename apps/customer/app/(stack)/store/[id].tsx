import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useCartStore } from '../../../store/cart.store';
import { CartBar } from '../../../components/CartBar';
import { HalalBadge } from '../../../components/HalalBadge';
import { SkeletonLoader } from '../../../components/SkeletonLoader';
import type { Store, MenuItem } from '@halalgo/types';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCartStore();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const res = await api.get<{ store: Store }>(`/api/stores/${id}`);
      return res.data.store;
    },
  });

  const { data: menu = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu', id],
    queryFn: async () => {
      const res = await api.get<{ items: MenuItem[] }>(`/api/menu/${id}`);
      return res.data.items;
    },
  });

  if (storeLoading || !store) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <SkeletonLoader width="100%" height={220} borderRadius={0} />
        <View style={{ padding: 20 }}><SkeletonLoader width={200} height={24} /></View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <Image source={{ uri: store.coverUrl || 'https://via.placeholder.com/800x400/1B4332/fff?text=HalalGo' }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
          <TouchableOpacity style={{ position: 'absolute', top: 48, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 }} onPress={() => router.back()}>
            <Text style={{ color: 'white', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 24, flex: 1 }}>{store.name}</Text>
            {store.isVerified && <HalalBadge />}
          </View>
          <Text style={{ color: '#40916C', fontSize: 13, marginTop: 4 }}>{store.cuisineType}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Text style={{ color: '#1B4332', fontSize: 13 }}>⭐ {store.rating.toFixed(1)}</Text>
            <Text style={{ color: '#D1D5DB', marginHorizontal: 8 }}>•</Text>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>{store.deliveryTimeMin} min</Text>
            <Text style={{ color: '#D1D5DB', marginHorizontal: 8 }}>•</Text>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>${Number(store.deliveryFee).toFixed(2)} delivery</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 120 }}>
          <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 18, marginBottom: 16 }}>Menu</Text>
          {menuLoading
            ? [1, 2, 3].map((n) => (
                <View key={n} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <SkeletonLoader width={160} height={16} />
                    <View style={{ marginTop: 8 }}><SkeletonLoader width={120} height={12} /></View>
                  </View>
                  <SkeletonLoader width={80} height={80} borderRadius={12} />
                </View>
              ))
            : menu.map((item) => (
                <View key={item.id} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontWeight: '600', color: '#1B4332', fontSize: 15 }}>{item.name}</Text>
                    {item.description && <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }} numberOfLines={2}>{item.description}</Text>}
                    <Text style={{ color: '#1B4332', fontWeight: '700', marginTop: 8 }}>${Number(item.basePrice).toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={{ width: 80, height: 80, borderRadius: 12 }} />}
                    <TouchableOpacity
                      style={{ marginTop: 8, backgroundColor: '#1B4332', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => addItem({ menuItemId: item.id, name: item.name, quantity: 1, unitPrice: Number(item.basePrice), selectedModifiers: [], imageUrl: item.imageUrl, specialRequests: null }, store.id, store.name)}
                    >
                      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          }
        </View>
      </ScrollView>
      <CartBar />
    </View>
  );
}
