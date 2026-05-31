import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        router.replace('/(tabs)/');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <Text style={{ fontWeight: '700', fontSize: 30, color: '#1B4332', marginBottom: 8 }}>Welcome back</Text>
        <Text style={{ color: '#40916C', marginBottom: 32, fontSize: 15 }}>Sign in to your HalalGo account</Text>

        <TextInput style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, fontSize: 15, color: '#1A1A2E' }} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
        <TextInput style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24, fontSize: 15, color: '#1A1A2E' }} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#9CA3AF" />

        <TouchableOpacity style={{ backgroundColor: '#1B4332', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={{ color: '#40916C', fontSize: 14 }}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
