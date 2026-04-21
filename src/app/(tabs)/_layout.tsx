import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { BlurView } from 'expo-blur';
import { UI_COLORS } from "../../constants/DesignTokens";

export default function TabsLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: UI_COLORS.appBackground },
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <BlurView intensity={isWeb ? 100 : 70} style={StyleSheet.absoluteFill} tint="light" />
        ),
        tabBarStyle: {
          position: "absolute",
          left: "15%",
          right: "15%",
          bottom: isWeb ? 20 : 25,
          borderRadius: 35,
          height: 60,
          borderTopWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.6)",
          backgroundColor: isWeb ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
          overflow: "hidden", 
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 12,
          fontWeight: "800",
          marginBottom: isWeb ? 2 : 4,
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
          tabBarIcon: ({ color }) => (
            <Feather name="home" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="classes"
        options={{
          title: "Classes",
          tabBarIcon: ({ color }) => (
            <Feather name="book" color={color} size={22} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("classes", { screen: "index" });
          },
        })}
      />

      <Tabs.Screen
        name="capture"
        options={{
          href: null,
          title: "Capture",
          tabBarIcon: ({ color }) => (
            <Feather name="camera" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" color={color} size={22} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Feather name="user" color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
