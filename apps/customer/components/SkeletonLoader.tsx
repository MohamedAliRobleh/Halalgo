import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
}

export function SkeletonLoader({ width, height, borderRadius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#E5E7EB' }, animStyle]}
    />
  );
}

export function StoreCardSkeleton() {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, marginRight: 16, overflow: 'hidden', width: 220 }}>
      <SkeletonLoader width={220} height={120} borderRadius={0} />
      <View style={{ padding: 12 }}>
        <SkeletonLoader width={140} height={14} />
        <View style={{ marginTop: 8 }}><SkeletonLoader width={100} height={12} /></View>
        <View style={{ marginTop: 8 }}><SkeletonLoader width={160} height={10} /></View>
      </View>
    </View>
  );
}
