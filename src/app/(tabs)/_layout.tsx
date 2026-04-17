import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { UI_COLORS } from "../../constants/DesignTokens";

export default function TabsLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: UI_COLORS.appBackground },
        tabBarActiveTintColor: UI_COLORS.primary,
        tabBarInactiveTintColor: "#7a838f",
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: isWeb ? 14 : 12,
          borderRadius: 18,
          paddingBottom: isWeb ? 10 : 8,
          paddingTop: isWeb ? 10 : 8,
          height: isWeb ? 74 : 68,
          borderTopWidth: 0,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#e8edf4",
          shadowColor: "#000",
          shadowOpacity: 0.09,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: "700",
          marginBottom: isWeb ? 0 : 2,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="classes"
        options={{
          title: "Classes",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior to handle custom navigation
            e.preventDefault();
            navigation.navigate("classes", { screen: "index" });
          },
        })}
      />

      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color, size }) => (
            <Feather name="camera" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
