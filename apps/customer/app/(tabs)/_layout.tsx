import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1B4332', tabBarInactiveTintColor: '#9CA3AF', tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F3F4F6', height: 88, paddingBottom: 24 } }}>
      <Tabs.Screen name="index"     options={{ title: 'Home',      tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tabs.Screen name="groceries" options={{ title: 'Groceries', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛒</Text> }} />
      <Tabs.Screen name="orders"    options={{ title: 'Orders',    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text> }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❤️</Text> }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile',   tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tabs>
  );
}
