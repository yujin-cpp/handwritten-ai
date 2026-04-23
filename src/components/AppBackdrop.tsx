import React from "react";
import { StyleSheet, View } from "react-native";

type AppBackdropProps = {
  variant?: "default" | "auth" | "tabs";
};

export function AppBackdrop({ variant = "default" }: AppBackdropProps) {
  return <View pointerEvents="none" style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fafafa",
    zIndex: -1,
  },
});
