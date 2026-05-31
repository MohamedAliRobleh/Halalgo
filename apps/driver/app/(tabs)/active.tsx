import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { api } from '../../lib/api';

type DeliveryStep = 'navigate_to_store' | 'confirm_pickup' | 'navigate_to_customer' | 'complete';

export default function ActiveDeliveryScreen() {
  const [step, setStep] = useState<DeliveryStep>('navigate_to_store');

  const STEPS: { key: DeliveryStep; label: string; action: string; nextStep: DeliveryStep | null }[] = [
    { key: 'navigate_to_store',    label: '🏪 Navigate to Restaurant', action: "I've arrived at restaurant", nextStep: 'confirm_pickup' },
    { key: 'confirm_pickup',       label: '📦 Confirm Pickup',          action: 'Picked up order',            nextStep: 'navigate_to_customer' },
    { key: 'navigate_to_customer', label: '🏠 Navigate to Customer',   action: 'Delivered to customer',      nextStep: 'complete' },
    { key: 'complete',             label: '✅ Delivery Complete',        action: '',                           nextStep: null },
  ];

  const currentStep = STEPS.find((s) => s.key === step)!;

  async function handleAction(): Promise<void> {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (step === 'confirm_pickup') {
      await api.patch('/api/orders/active/status', { status: 'picked_up', changedByRole: 'driver' });
    }
    if (step === 'navigate_to_customer') {
      await api.patch('/api/orders/active/status', { status: 'delivered', changedByRole: 'driver' });
    }
    if (currentStep.nextStep) setStep(currentStep.nextStep);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Text className="font-poppins-bold text-primary text-2xl px-5 pt-4 mb-4">Active Delivery</Text>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ height: 250, marginHorizontal: 20, borderRadius: 16 }}
        initialRegion={{ latitude: 45.4215, longitude: -75.6972, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      />
      <View className="flex-1 px-5 pt-6">
        <Text className="font-poppins-bold text-primary text-xl mb-2">{currentStep.label}</Text>
        {step !== 'complete' ? (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center mt-auto mb-4"
            onPress={handleAction}
          >
            <Text className="text-white font-inter-medium text-base">{currentStep.action}</Text>
          </TouchableOpacity>
        ) : (
          <View className="items-center mt-8">
            <Text className="text-5xl mb-4">🎉</Text>
            <Text className="font-poppins-bold text-success text-xl">Delivery Complete!</Text>
            <Text className="font-inter text-gray-500 text-center mt-2">
              Great job! Return to home to accept more deliveries.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
