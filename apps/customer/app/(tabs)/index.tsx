import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useNearbyStores } from '../../hooks/useNearbyStores';
import { StoreCard } from '../../components/StoreCard';
import { StoreCardSkeleton } from '../../components/SkeletonLoader';

const CUISINES = [
  { emoji: '🥙', label: 'Shawarma' },
  { emoji: '🍔', label: 'Burgers' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍛', label: 'Biryani' },
  { emoji: '🔥', label: 'Grills' },
  { emoji: '🍣', label: 'Sushi' },
  { emoji: '🧁', label: 'Desserts' },
  { emoji: '🥤', label: 'Drinks' },
];

export default function HomeScreen() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: stores = [], isLoading } = useNearbyStores({ lat: coords?.lat, lng: coords?.lng, storeType: 'restaurant' });

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
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#40916C' }}>Delivering to</Text>
          <TouchableOpacity onPress={() => router.push('/(stack)/addresses' as never)}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1B4332' }}>📍 Ottawa, ON</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}
          onPress={() => router.push('/(stack)/search' as never)}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#9CA3AF', flex: 1, fontSize: 14 }}>Search restaurants or dishes...</Text>
        </TouchableOpacity>

        {/* Cuisine Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, marginBottom: 24 }}>
          {CUISINES.map((c) => (
            <TouchableOpacity key={c.label} style={{ marginRight: 12, alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
              <Text style={{ fontSize: 11, color: '#1B4332', marginTop: 4, fontWeight: '500' }}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Near You */}
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 18, marginBottom: 16 }}>Near You</Text>
          {isLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[1, 2, 3].map((n) => <StoreCardSkeleton key={n} />)}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stores.map((store) => <StoreCard key={store.id} store={store} horizontal />)}
            </ScrollView>
          )}
        </View>

        {/* All Restaurants */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, paddingBottom: 32 }}>
          <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 18, marginBottom: 16 }}>All Restaurants</Text>
          {isLoading
            ? [1, 2, 3].map((n) => <StoreCardSkeleton key={n} />)
            : stores.map((store) => <StoreCard key={store.id} store={store} />)
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
