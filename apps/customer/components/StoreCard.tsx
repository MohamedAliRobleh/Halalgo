import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { HalalBadge } from './HalalBadge';
import type { Store } from '@halalgo/types';

interface StoreCardProps {
  store: Store;
  horizontal?: boolean;
}

export function StoreCard({ store, horizontal = false }: StoreCardProps) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(stack)/store/${store.id}` as never)}
      activeOpacity={0.9}
      style={[
        { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
        horizontal ? { width: 220, marginRight: 16 } : { marginBottom: 16 },
      ]}
    >
      <Image
        source={{ uri: store.coverUrl || 'https://via.placeholder.com/400x200/1B4332/ffffff?text=HalalGo' }}
        style={horizontal ? { width: 220, height: 120 } : { width: '100%', height: 160 }}
        resizeMode="cover"
      />
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 15, flex: 1, marginRight: 8 }} numberOfLines={1}>
            {store.name}
          </Text>
          {store.isVerified && <HalalBadge />}
        </View>
        <Text style={{ color: '#40916C', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {store.cuisineType ?? 'Groceries'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ color: '#1B4332', fontSize: 12 }}>⭐ {store.rating.toFixed(1)}</Text>
          <Text style={{ color: '#D1D5DB', marginHorizontal: 6 }}>•</Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>{store.deliveryTimeMin} min</Text>
          <Text style={{ color: '#D1D5DB', marginHorizontal: 6 }}>•</Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>${Number(store.deliveryFee).toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
