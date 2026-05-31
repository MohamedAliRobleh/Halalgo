import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { StoreCard } from '../../components/StoreCard';
import type { Store } from '@halalgo/types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<Store[]> => {
      if (query.length < 2) return [];
      const res = await api.get<{ results: Store[] }>('/api/search/stores', { params: { q: query } });
      return res.data.results;
    },
    enabled: query.length >= 2,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Text style={{ fontSize: 24 }}>←</Text></TouchableOpacity>
        <TextInput
          style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1A1A2E' }}
          placeholder="Search restaurants or dishes..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => <StoreCard store={item} />}
        ListEmptyComponent={
          query.length >= 2 && !isLoading
            ? <View style={{ alignItems: 'center', paddingVertical: 48 }}><Text style={{ color: '#9CA3AF' }}>No results for "{query}"</Text></View>
            : null
        }
      />
    </SafeAreaView>
  );
}
