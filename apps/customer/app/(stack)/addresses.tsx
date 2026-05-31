import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Address } from '@halalgo/types';

export default function AddressesScreen() {
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: async (): Promise<Address[]> => {
      const res = await api.get<{ addresses: Address[] }>('/api/addresses');
      return res.data.addresses;
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Text style={{ fontSize: 24 }}>←</Text></TouchableOpacity>
        <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 20 }}>My Addresses</Text>
      </View>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <Text style={{ fontWeight: '600', color: '#1B4332' }}>{item.label}</Text>
            <Text style={{ color: '#6B7280', marginTop: 4 }}>{item.street}, {item.city}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 48 }}><Text style={{ fontSize: 40 }}>📍</Text><Text style={{ color: '#9CA3AF', marginTop: 12 }}>No addresses saved yet</Text></View>}
      />
    </SafeAreaView>
  );
}
