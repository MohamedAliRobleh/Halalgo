import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 48 }}>❤️</Text>
      <Text style={{ fontWeight: '700', fontSize: 20, color: '#1B4332', marginTop: 16 }}>Your Favorites</Text>
      <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Save your favourite restaurants here</Text>
    </SafeAreaView>
  );
}
