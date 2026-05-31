import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Store } from '@halalgo/types';

interface UseNearbyStoresParams {
  lat?: number;
  lng?: number;
  storeType?: 'restaurant' | 'grocery';
  radiusKm?: number;
}

export function useNearbyStores({ lat, lng, storeType, radiusKm = 10 }: UseNearbyStoresParams) {
  return useQuery({
    queryKey: ['stores', 'nearby', lat, lng, storeType],
    queryFn: async (): Promise<Store[]> => {
      if (!lat || !lng) return [];
      const res = await api.get<{ stores: Store[] }>('/api/stores/nearby', {
        params: { lat, lng, storeType, radiusKm },
      });
      return res.data.stores;
    },
    enabled: !!lat && !!lng,
  });
}
