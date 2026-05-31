import { View, Text } from 'react-native';

export function HalalBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D6A4F20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: '#2D6A4F', fontSize: 11, fontWeight: '600' }}>✓ Halal</Text>
    </View>
  );
}
