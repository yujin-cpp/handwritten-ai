import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { GlassCard } from "./GlassCard";

type LiquidInputProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
};

export function LiquidInput({ label, icon, style, ...props }: LiquidInputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <GlassCard borderRadius={18}>
        <View style={styles.field}>
          {icon ? <Feather name={icon} size={18} color="rgba(214,225,240,0.82)" style={styles.icon} /> : null}
          <TextInput
            {...props}
            placeholderTextColor="rgba(214,225,240,0.48)"
            style={[styles.input, style]}
          />
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    color: "rgba(214,225,240,0.7)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  field: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
    paddingVertical: 16,
  },
});
