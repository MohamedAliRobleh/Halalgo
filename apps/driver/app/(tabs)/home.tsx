import { View, Text, Switch, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { api } from '../../lib/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface JobOffer {
  orderId:           string;
  storeAddress:      string;
  customerAddress:   string;
  distanceKm:        number;
  estimatedEarnings: number;
}

const OFFER_TIMEOUT_S = 30;

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline]     = useState(false);
  const [jobOffer, setJobOffer]     = useState<JobOffer | null>(null);
  const [countdown, setCountdown]   = useState(OFFER_TIMEOUT_S);
  const countdownRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    let interval: ReturnType<typeof setInterval>;

    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      interval = setInterval(async () => {
        const loc = await Location.getCurrentPositionAsync({});
        api.patch('/api/drivers/location', {
          latitude:      loc.coords.latitude,
          longitude:     loc.coords.longitude,
          activeOrderId: null,
        }).catch(console.error);
      }, 5000);
    });

    return () => clearInterval(interval);
  }, [isOnline]);

  useWebSocket('driver_jobs', useCallback((data) => {
    const msg = data as { type: string; offer?: JobOffer };
    if (msg.type === 'job_offer' && msg.offer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setJobOffer(msg.offer);
      setCountdown(OFFER_TIMEOUT_S);

      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current!);
            setJobOffer(null);
            return OFFER_TIMEOUT_S;
          }
          return c - 1;
        });
      }, 1000);
    }
  }, []));

  async function handleToggle(value: boolean): Promise<void> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOnline(value);
    await api.patch('/api/drivers/availability', { isAvailable: value });
  }

  async function handleAccept(): Promise<void> {
    if (!jobOffer) return;
    clearInterval(countdownRef.current!);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await api.post(`/api/drivers/jobs/${jobOffer.orderId}/accept`);
    setJobOffer(null);
  }

  async function handleDecline(): Promise<void> {
    if (!jobOffer) return;
    clearInterval(countdownRef.current!);
    await api.post(`/api/drivers/jobs/${jobOffer.orderId}/decline`);
    setJobOffer(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Modal visible={!!jobOffer} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-poppins-bold text-primary text-xl">New Delivery!</Text>
              <View className="bg-accent rounded-full w-12 h-12 items-center justify-center">
                <Text className="font-mono text-white font-bold text-lg">{countdown}</Text>
              </View>
            </View>
            <View className="bg-gray-50 rounded-2xl p-4 mb-4">
              <Text className="font-inter text-gray-500 text-xs mb-1">PICKUP</Text>
              <Text className="font-inter-medium text-primary">{jobOffer?.storeAddress}</Text>
              <Text className="font-inter text-gray-500 text-xs mb-1 mt-3">DROP OFF</Text>
              <Text className="font-inter-medium text-primary">{jobOffer?.customerAddress}</Text>
            </View>
            <View className="flex-row justify-between mb-6">
              <Text className="font-inter text-gray-500">Distance: {jobOffer?.distanceKm.toFixed(1)} km</Text>
              <Text className="font-mono text-success font-bold text-lg">
                ${jobOffer?.estimatedEarnings.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity
                className="flex-1 bg-error/10 border border-error rounded-2xl py-4 items-center mr-3"
                onPress={handleDecline}
              >
                <Text className="text-error font-inter-medium">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-success rounded-2xl py-4 items-center"
                onPress={handleAccept}
              >
                <Text className="text-white font-inter-medium">Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-1 px-5 pt-6 items-center justify-center">
        <Animated.View
          entering={FadeIn}
          className={`w-48 h-48 rounded-full items-center justify-center ${isOnline ? 'bg-success' : 'bg-gray-200'}`}
        >
          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            trackColor={{ false: 'transparent', true: 'transparent' }}
            thumbColor="transparent"
            style={{ transform: [{ scaleX: 3 }, { scaleY: 3 }] }}
          />
          <Text className="font-poppins-bold text-white text-lg mt-2 absolute">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </Animated.View>
        <Text className="font-inter text-gray-500 text-center mt-8">
          {isOnline
            ? 'You are online. Waiting for delivery requests...'
            : 'Tap the button to go online and start receiving orders.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}
