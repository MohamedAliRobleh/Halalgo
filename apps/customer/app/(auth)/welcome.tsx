import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const SLIDES = [
  { title: '100% Halal Certified', subtitle: 'Every restaurant verified with official halal certification.', emoji: '🌙', bg: '#1B4332' },
  { title: 'Fast Delivery Across Canada', subtitle: 'From Ottawa to Vancouver — your halal meal arrives in 30 minutes.', emoji: '🚀', bg: '#40916C' },
  { title: 'Track Your Order Live', subtitle: 'Follow your driver on the map in real time.', emoji: '📍', bg: '#F4A261' },
];

export default function WelcomeScreen() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current]!;

  return (
    <View style={{ flex: 1, backgroundColor: slide.bg }}>
      <Animated.View key={current} entering={FadeInRight} exiting={FadeOutLeft} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 80 }}>{slide.emoji}</Text>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 28, textAlign: 'center', marginTop: 24 }}>{slide.title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 24 }}>{slide.subtitle}</Text>
      </Animated.View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 16 }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{ height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: i === current ? 'white' : 'rgba(255,255,255,0.4)', width: i === current ? 24 : 8 }} />
        ))}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 48 }}>
        {current < SLIDES.length - 1 ? (
          <TouchableOpacity style={{ backgroundColor: 'white', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={() => setCurrent(c => c + 1)}>
            <Text style={{ color: '#1B4332', fontWeight: '600', fontSize: 15 }}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={{ backgroundColor: 'white', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={{ color: '#1B4332', fontWeight: '600', fontSize: 15 }}>Get Started</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => router.replace('/(auth)/sign-in')}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
