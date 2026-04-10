import { Tabs } from "expo-router";
import { View, Text } from "react-native";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, fontWeight: "600", color: focused ? "#6366f1" : "#94a3b8" }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 64,
          backgroundColor: "#fff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#94a3b8",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="obras"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏗️" label="Obras" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bitacora"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📸" label="Bitácora" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notas"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📝" label="Notas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
