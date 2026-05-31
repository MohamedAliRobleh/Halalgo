import { Tabs } from 'expo-router';
import { Home, Navigation, DollarSign, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B4332',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          height: 88,
          paddingBottom: 24,
        },
        tabBarLabelStyle: { fontFamily: 'Inter-Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="active"
        options={{ title: 'Active', tabBarIcon: ({ color }) => <Navigation size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: 'Earnings', tabBarIcon: ({ color }) => <DollarSign size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
