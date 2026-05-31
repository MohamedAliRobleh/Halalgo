import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useCartStore } from '../../store/cart.store';
import { api } from '../../lib/api';

const TIP_OPTIONS = [{ label: '15%', value: 0.15 }, { label: '18%', value: 0.18 }, { label: '20%', value: 0.20 }, { label: 'None', value: 0 }];

export default function CheckoutScreen() {
  const { items, subtotal, storeId, clear } = useCartStore();
  const [selectedTip, setTip] = useState(0.15);
  const [loading, setLoading]  = useState(false);

  const DELIVERY_FEE = 2.99;
  const tip    = subtotal() * selectedTip;
  const taxes  = subtotal() * 0.13;
  const total  = subtotal() + DELIVERY_FEE + taxes + tip;

  async function handlePlaceOrder(): Promise<void> {
    if (!storeId) return;
    setLoading(true);
    try {
      const orderRes = await api.post<{ order: { id: string } }>('/api/orders', {
        storeId,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: i.unitPrice, selectedModifiers: i.selectedModifiers })),
        deliveryAddress: { street: '123 Main St', city: 'Ottawa', province: 'ON', postalCode: 'K1A0A9', latitude: 45.4215, longitude: -75.6972 },
        subtotal: subtotal(),
        deliveryFee: DELIVERY_FEE,
        tip,
        promoCodeUsed: null,
        specialInstructions: null,
      });
      clear();
      router.replace(`/(stack)/order/${orderRes.data.order.id}` as never);
    } catch (err: unknown) {
      Alert.alert('Order failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}><Text style={{ fontSize: 24 }}>←</Text></TouchableOpacity>
        <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 20 }}>Checkout</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '700', color: '#1B4332', marginBottom: 12 }}>Add a tip</Text>
          <View style={{ flexDirection: 'row' }}>
            {TIP_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.label} style={{ flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: selectedTip === opt.value ? '#1B4332' : '#E5E7EB', backgroundColor: selectedTip === opt.value ? '#1B4332' : 'white' }} onPress={() => setTip(opt.value)}>
                <Text style={{ color: selectedTip === opt.value ? 'white' : '#1B4332', fontWeight: '500', fontSize: 13 }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24 }}>
          {[['Subtotal', subtotal().toFixed(2)], ['Delivery fee', DELIVERY_FEE.toFixed(2)], ['Tip', tip.toFixed(2)], ['HST (13%)', taxes.toFixed(2)]].map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#6B7280' }}>{label}</Text>
              <Text style={{ color: '#1B4332', fontWeight: '600' }}>${value}</Text>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderColor: '#F3F4F6', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 16 }}>Total</Text>
            <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 16 }}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <TouchableOpacity style={{ backgroundColor: '#1B4332', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={handlePlaceOrder} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Place Order — ${total.toFixed(2)}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
