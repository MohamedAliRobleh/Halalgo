import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useNearbyStores } from '../../hooks/useNearbyStores';
import { StoreCard } from '../../components/StoreCard';
import { StoreCardSkeleton } from '../../components/SkeletonLoader';

const GROCERY_CATS = [
  { emoji: '🥩', label: 'Meat' },
  { emoji: '🥛', label: 'Dairy' },
  { emoji: '🥦', label: 'Produce' },
  { emoji: '🥫', label: 'Pantry' },
  { emoji: '🍞', label: 'Bakery' },
  { emoji: '🧃', label: 'Beverages' },
];

export default function GroceriesScreen() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { data: stores = [], isLoading } = useNearbyStores({ lat: coords?.lat, lng: coords?.lng, storeType: 'grocery' });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({}).then((loc) => {
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      });
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontWeight: '700', fontSize: 24, color: '#1B4332' }}>Halal Groceries</Text>
          <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>Fresh halal-certified products delivered to your door</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, marginBottom: 24, marginTop: 16 }}>
          {GROCERY_CATS.map((c) => (
            <View key={c.label} style={{ marginRight: 12, alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 24 }}>{c.emoji}</Text>
              <Text style={{ fontSize: 11, color: '#1B4332', marginTop: 4, fontWeight: '500' }}>{c.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 18, marginBottom: 16 }}>Grocery Stores</Text>
          {isLoading
            ? [1, 2].map((n) => <StoreCardSkeleton key={n} />)
            : stores.length > 0
              ? stores.map((store) => <StoreCard key={store.id} store={store} />)
              : <View style={{ alignItems: 'center', paddingVertical: 48 }}><Text style={{ fontSize: 40 }}>🛒</Text><Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 15 }}>No grocery stores nearby yet</Text></View>
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
