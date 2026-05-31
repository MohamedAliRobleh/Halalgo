import { TouchableOpacity, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../store/cart.store';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

export function CartBar() {
  const { items, subtotal, totalItems } = useCartStore();
  if (items.length === 0) return null;

  return (
    <Animated.View
      entering={SlideInDown}
      exiting={SlideOutDown}
      style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}
    >
      <TouchableOpacity
        style={{ backgroundColor: '#1B4332', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }}
        onPress={() => router.push('/(stack)/cart' as never)}
        activeOpacity={0.9}
      >
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{totalItems()}</Text>
        </View>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>View Cart</Text>
        <Text style={{ color: 'white', fontSize: 13 }}>${subtotal().toFixed(2)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
