import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { api } from '../../../lib/api';
import { useOrderTracking } from '../../../hooks/useOrderTracking';
import { OrderStatusStepper } from '../../../components/OrderStatusStepper';
import type { Order } from '@halalgo/types';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<{ order: Order }>(`/api/orders/${id}`);
      return res.data.order;
    },
    refetchInterval: 15_000,
  });

  const { status, driverLocation, eta } = useOrderTracking(
    id ?? '',
    order?.driverId ?? null,
    order?.status ?? 'confirmed',
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/orders' as never)} style={{ marginRight: 16 }}><Text style={{ fontSize: 24 }}>←</Text></TouchableOpacity>
        <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 20 }}>Track Order</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {driverLocation && (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ height: 220, marginHorizontal: 20, borderRadius: 16 }}
            region={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          >
            <Marker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} title="Your driver" />
          </MapView>
        )}

        {eta && (
          <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>⏱</Text>
            <View>
              <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 18 }}>{eta}</Text>
              <Text style={{ color: '#40916C', fontSize: 12 }}>Estimated arrival</Text>
            </View>
          </View>
        )}

        <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: 'white', borderRadius: 16 }}>
          <OrderStatusStepper currentStatus={status} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
