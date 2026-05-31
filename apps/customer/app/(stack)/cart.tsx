import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCartStore } from '../../store/cart.store';

export default function CartScreen() {
  const { items, subtotal, updateQty, storeName } = useCartStore();
  const DELIVERY_FEE = 2.99;
  const taxes = subtotal() * 0.13;
  const total = subtotal() + DELIVERY_FEE + taxes;

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 20, marginTop: 16 }}>Your cart is empty</Text>
        <TouchableOpacity style={{ marginTop: 24 }} onPress={() => router.back()}>
          <Text style={{ color: '#40916C' }}>Browse restaurants</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}><Text style={{ fontSize: 24 }}>←</Text></TouchableOpacity>
        <Text style={{ fontWeight: '700', color: '#1B4332', fontSize: 20 }}>{storeName}</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {items.map((item) => (
          <View key={item.menuItemId} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '600', color: '#1B4332', flex: 1 }}>{item.name}</Text>
              <Text style={{ color: '#1B4332', fontWeight: '700' }}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <TouchableOpacity style={{ width: 32, height: 32, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => updateQty(item.menuItemId, item.quantity - 1)}>
                <Text style={{ color: '#1B4332', fontSize: 18, fontWeight: '700' }}>−</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 20, fontWeight: '600', color: '#1B4332' }}>{item.quantity}</Text>
              <TouchableOpacity style={{ width: 32, height: 32, backgroundColor: '#1B4332', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => updateQty(item.menuItemId, item.quantity + 1)}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24 }}>
          {[['Subtotal', subtotal().toFixed(2)], ['Delivery fee', DELIVERY_FEE.toFixed(2)], ['HST (13%)', taxes.toFixed(2)]].map(([label, value]) => (
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
        <TouchableOpacity style={{ backgroundColor: '#1B4332', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={() => router.push('/(stack)/checkout' as never)}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Proceed to Checkout — ${total.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
