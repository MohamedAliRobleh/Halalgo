import { View, Text } from 'react-native';
import type { OrderStatus } from '@halalgo/types';

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'confirmed',  label: 'Order Confirmed',   emoji: '✅' },
  { status: 'preparing',  label: 'Preparing',          emoji: '👨‍🍳' },
  { status: 'picked_up',  label: 'Driver Picked Up',   emoji: '🛵' },
  { status: 'delivered',  label: 'Delivered',          emoji: '🎉' },
];

const STATUS_INDEX: Partial<Record<OrderStatus, number>> = {
  confirmed: 0, preparing: 1, ready: 1, picked_up: 2, delivered: 3,
};

export function OrderStatusStepper({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIndex = STATUS_INDEX[currentStatus] ?? 0;

  return (
    <View style={{ padding: 20 }}>
      {STEPS.map((step, i) => {
        const isDone   = i <= currentIndex;
        const isActive = i === currentIndex;
        return (
          <View key={step.status} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ alignItems: 'center', marginRight: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDone ? '#2D6A4F' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{isDone ? step.emoji : '○'}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={{ width: 2, height: 24, marginTop: 4, backgroundColor: isDone ? '#2D6A4F' : '#E5E7EB' }} />
              )}
            </View>
            <View style={{ flex: 1, paddingTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '400', color: isActive ? '#1B4332' : isDone ? '#2D6A4F' : '#9CA3AF' }}>
                {step.label}
              </Text>
              {isActive && <Text style={{ fontSize: 11, color: '#40916C', marginTop: 2 }}>In progress...</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
