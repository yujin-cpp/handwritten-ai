import React from "react";
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SharedProps = {
  children: React.ReactNode;
  padded?: boolean;
  withBottomNavSpace?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

type AppScreenProps =
  | ({ scroll?: true } & SharedProps & Omit<ScrollViewProps, "contentContainerStyle">)
  | ({ scroll: false } & SharedProps & ViewProps);

export function AppScreen(props: AppScreenProps) {
  const {
    children,
    padded = true,
    withBottomNavSpace = true,
    contentStyle,
    scroll = true,
    ...rest
  } = props as any;
  const insets = useSafeAreaInsets();

  const sharedPadding: ViewStyle = {
    paddingTop: insets.top + 14,
    paddingBottom: withBottomNavSpace ? insets.bottom + 116 : insets.bottom + 28,
    paddingHorizontal: padded ? 20 : 0,
  };

  if (scroll) {
    return (
      <ScrollView
        {...(rest as ScrollViewProps)}
        style={styles.base}
        contentContainerStyle={[styles.scrollContent, sharedPadding, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View {...(rest as ViewProps)} style={styles.base}>
      <View style={[styles.viewContent, sharedPadding, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
  },
  viewContent: {
    flex: 1,
  },
});
