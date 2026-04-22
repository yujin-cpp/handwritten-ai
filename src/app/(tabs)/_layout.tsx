import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_COLORS, UI_GLASS } from "../../constants/DesignTokens";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const supportsBlur = Platform.OS === "ios" || Platform.OS === "web";
  const horizontalInset = Math.max(14, Math.min(width * 0.06, 28));
  const tabBarWidth = Math.min(width - horizontalInset * 2, 460);
  const tabBarHeight = width < 380 ? 60 : 66;
  const tabBarBottom = Math.max(insets.bottom + 12, isWeb ? 20 : 16);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBase} />
      <View style={{ position: "absolute", top: 250, left: -100, backgroundColor: "rgba(14, 164, 122, 0.12)", width: 350, height: 350, borderRadius: 200 }} />
      <View style={{ position: "absolute", top: 400, right: -150, backgroundColor: "rgba(0, 121, 178, 0.08)", width: 400, height: 400, borderRadius: 200 }} />
      <View style={{ position: "absolute", top: 600, left: 50, backgroundColor: "rgba(243, 156, 18, 0.06)", width: 300, height: 300, borderRadius: 200 }} />
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: UI_COLORS.appBackground },
        tabBarActiveTintColor: UI_COLORS.primary,
        tabBarInactiveTintColor: "rgba(31, 41, 55, 0.78)",
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <View style={{ flex: 1, borderRadius: 34, overflow: 'hidden' }}>
            {supportsBlur ? (
              <BlurView intensity={isWeb ? UI_GLASS.blurWeb : UI_GLASS.blurNative} style={StyleSheet.absoluteFill} tint="light" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: UI_GLASS.backgroundFallback }]} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: UI_GLASS.background }]} />
            <LinearGradient
              colors={[UI_GLASS.highlight, "rgba(255,255,255,0.14)", "rgba(255,255,255,0.02)"]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 0.8 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(15,23,42,0.08)", "rgba(15,23,42,0.01)", "rgba(255,255,255,0)"]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.tabBarInnerStroke} />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          alignSelf: "center",
          width: tabBarWidth,
          left: "50%",
          marginLeft: -(tabBarWidth / 2),
          right: undefined,
          bottom: tabBarBottom,
          borderRadius: 34,
          height: tabBarHeight,
          borderWidth: 1.5,
          borderTopColor: UI_GLASS.border,
          borderLeftColor: UI_GLASS.border,
          borderRightColor: UI_GLASS.borderSoft,
          borderBottomColor: UI_GLASS.borderSoft,
          backgroundColor: supportsBlur ? "rgba(255, 255, 255, 0.24)" : UI_GLASS.backgroundFallback,
          shadowColor: UI_GLASS.shadow,
          shadowOpacity: 1,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 12,
          fontWeight: "800",
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
  tabBarInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: UI_GLASS.glow,
  },
});
