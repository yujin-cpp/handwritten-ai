import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_COLORS } from "../../constants/DesignTokens";
import { colors, typography, shadows } from "../../presentation/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const supportsBlur = Platform.OS === "ios" || Platform.OS === "web";
  const horizontalInset = Math.max(14, Math.min(width * 0.06, 28));
  const tabBarWidth = Math.min(width - horizontalInset * 2, 460);
  const FLOATING_WIDTH = 310;
  const floatingInset = Math.max(10, (width - FLOATING_WIDTH) / 2);
  const tabBarHeight = 60;
  const tabBarBottom = Math.max(insets.bottom + 10, 28);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBase} />
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: UI_COLORS.appBackground },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,
          tabBarBackground: () => (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderRadius: 15,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 15,
                shadowOffset: { width: 0, height: 5 },
                elevation: 10,
              }}
            />
          ),
          tabBarStyle: {
            position: "absolute",
            bottom: Math.max(insets.bottom + 10, 24),
            marginHorizontal: 24,
            height: 64,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontFamily: typography.fontFamily.semiBold,
            fontSize: 10,
            lineHeight: 12,
            marginBottom: isWeb ? 2 : 4,
          },
          tabBarItemStyle: {
            borderRadius: 18,
            marginHorizontal: 3,
            paddingTop: width < 380 ? 8 : 10,
            justifyContent: "center",
            alignItems: "center",
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
            tabBarStyle: { display: "none" },
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI_COLORS.appBackground,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI_COLORS.appBackground,
  },
});
