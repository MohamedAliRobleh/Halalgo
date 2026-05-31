import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [pending, setPending]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSignUp(): Promise<void> {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const parts = name.trim().split(' ');
      await signUp.create({ firstName: parts[0] ?? name, lastName: parts.slice(1).join(' ') || undefined, emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPending(true);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(): Promise<void> {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 26, color: '#1B4332', marginBottom: 8 }}>Verify your email</Text>
          <Text style={{ color: '#6B7280', marginBottom: 32 }}>Enter the code sent to {email}</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24, fontSize: 24, color: '#1A1A2E', textAlign: 'center', letterSpacing: 8 }} placeholder="000000" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholderTextColor="#9CA3AF" />
          <TouchableOpacity style={{ backgroundColor: '#1B4332', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Verify</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <Text style={{ fontWeight: '700', fontSize: 30, color: '#1B4332', marginBottom: 8 }}>Create account</Text>
        <Text style={{ color: '#40916C', marginBottom: 32, fontSize: 15 }}>Join HalalGo today</Text>

        {([['Full Name', name, setName, 'words', 'default'], ['Email', email, setEmail, 'none', 'email-address']] as const).map(([label, value, setter, cap, kb]) => (
          <TextInput key={label} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, fontSize: 15, color: '#1A1A2E' }} placeholder={label} value={value} onChangeText={setter} autoCapitalize={cap} keyboardType={kb} placeholderTextColor="#9CA3AF" />
        ))}
        <TextInput style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24, fontSize: 15, color: '#1A1A2E' }} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#9CA3AF" />

        <TouchableOpacity style={{ backgroundColor: '#1B4332', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={{ color: '#40916C', fontSize: 14 }}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
