import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontWeight: '700', fontSize: 24, color: '#1B4332', marginBottom: 24 }}>Profile</Text>

        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontWeight: '600', color: '#1B4332', fontSize: 18 }}>{user?.fullName ?? 'Guest'}</Text>
          <Text style={{ color: '#6B7280', marginTop: 4 }}>{user?.primaryEmailAddress?.emailAddress}</Text>
        </View>

        {[
          { label: '📍 My Addresses',   onPress: () => router.push('/(stack)/addresses' as never) },
          { label: '📦 Order History',  onPress: () => router.push('/(tabs)/orders' as never) },
        ].map(({ label, onPress }) => (
          <TouchableOpacity key={label} style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={onPress}>
            <Text style={{ color: '#1B4332', fontSize: 15 }}>{label}</Text>
            <Text style={{ color: '#9CA3AF' }}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={{ marginTop: 24, backgroundColor: '#FEE2E2', borderRadius: 16, padding: 16, alignItems: 'center' }} onPress={() => signOut()}>
          <Text style={{ color: '#E63946', fontWeight: '600' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
