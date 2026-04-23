import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GlassCard } from "./GlassCard";

type LiquidButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
};

export function LiquidButton({
  title,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
}: LiquidButtonProps) {
  const config = BUTTONS[variant];

  return (
    <TouchableOpacity disabled={disabled || loading} activeOpacity={0.86} onPress={onPress}>
      <GlassCard color={config.surface} borderRadius={18} style={disabled ? styles.disabled : undefined}>
        <View style={[styles.button, config.outline && styles.outline]}>
          {loading ? (
            <ActivityIndicator color={config.text} />
          ) : (
            <>
              {icon ? <Feather name={icon} size={18} color={config.text} style={styles.icon} /> : null}
              <Text style={[styles.label, { color: config.text }]}>{title}</Text>
            </>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const BUTTONS = {
  primary: {
    surface: "rgba(49, 216, 164, 0.88)",
    text: "#03131e",
    outline: false,
  },
  secondary: {
    surface: "rgba(255,255,255,0.14)",
    text: "#f8fafc",
    outline: true,
  },
  danger: {
    surface: "rgba(255, 87, 87, 0.82)",
    text: "#ffffff",
    outline: false,
  },
} as const;

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  outline: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  icon: {
    marginRight: 10,
  },
  disabled: {
    opacity: 0.52,
  },
});
