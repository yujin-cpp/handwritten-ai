import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { getPasswordRuleChecks } from "../../utils/passwordRules";

export function PasswordChecklist({ password }: { password: string }) {
  const rules = getPasswordRuleChecks(password);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Password Requirements</Text>
      {rules.map((rule) => (
        <View key={rule.id} style={styles.row}>
          <View style={[styles.iconWrap, rule.met && styles.iconWrapMet]}>
            <Feather
              name={rule.met ? "check" : "circle"}
              size={12}
              color={rule.met ? "#127a52" : "#9aa3af"}
            />
          </View>
          <Text style={[styles.label, rule.met && styles.labelMet]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconWrapMet: {
    backgroundColor: "#dcfce7",
  },
  label: {
    color: "#eef7f4",
    fontSize: 12,
    opacity: 0.88,
  },
  labelMet: {
    color: "#d7ffe9",
    fontWeight: "700",
  },
});
