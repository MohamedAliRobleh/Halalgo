import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  async function handleSignOut(): Promise<void> {
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-5 pt-4">
      <Text className="font-poppins-bold text-primary text-2xl mb-6">Profile</Text>
      <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <Text className="font-inter-medium text-primary text-base">
          {user?.fullName ?? 'Driver'}
        </Text>
        <Text className="font-inter text-gray-500 text-sm mt-1">
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
      </View>
      <TouchableOpacity
        className="bg-error/10 border border-error rounded-2xl py-4 items-center mt-auto mb-8"
        onPress={handleSignOut}
      >
        <Text className="text-error font-inter-medium">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
