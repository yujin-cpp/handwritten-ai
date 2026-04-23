import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GlassCard } from "./GlassCard";

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightPress?: () => void;
};

export function AppHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
}: AppHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.85}>
            <GlassCard borderRadius={18}>
              <View style={styles.iconButton}>
                <Feather name="arrow-left" size={18} color="#f8fafc" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} activeOpacity={0.85}>
            <GlassCard borderRadius={18}>
              <View style={styles.iconButton}>
                <Feather name={rightIcon} size={18} color="#f8fafc" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: "rgba(214,225,240,0.7)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  title: {
    color: "#f8fafc",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: "rgba(214,225,240,0.82)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 340,
  },
});
