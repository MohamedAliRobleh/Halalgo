import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSignIn(): Promise<void> {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/dashboard');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="font-poppins-bold text-3xl text-primary mb-2">Restaurant Portal</Text>
      <Text className="text-secondary font-inter mb-8">Sign in to manage your restaurant</Text>
      <TextInput
        className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-4 font-inter text-primary"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#9CA3AF"
      />
      <TextInput
        className="border border-gray-200 rounded-2xl px-4 py-3.5 mb-6 font-inter text-primary"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#9CA3AF"
      />
      <TouchableOpacity
        className="bg-primary rounded-2xl py-4 items-center"
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <Text className="text-white font-inter-medium text-base">Sign In</Text>
        }
      </TouchableOpacity>
    </View>
  );
}
