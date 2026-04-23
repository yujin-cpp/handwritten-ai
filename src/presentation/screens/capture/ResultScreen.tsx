import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, update } from "firebase/database";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { auth, db } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";
import { getGradingResult } from "../../../utils/gradingStore";

const P = (v: any, fb: string) => (Array.isArray(v) ? v[0] : v || fb);

export const ResultScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const score = P(params.score, "0");
  const total = P(params.total, "0");
  const { essayScoreLog, feedback } = getGradingResult();
  const { classId, activityId, studentId } = params;

  const sanitizeForFirebase = (str: string) => {
    if (!str) return str;
    return str.replace(/\./g, ",").replace(/\#/g, "-").replace(/\$/g, "-").replace(/\//g, "-").replace(/\[/g, "(").replace(/\]/g, ")");
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId || !studentId) {
      showAlert("Error", "Missing data. Cannot save score.");
      return;
    }

    setSaving(true);
    try {
      await update(ref(db, `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`), {
        score: parseInt(score),
        total: parseInt(total),
        feedback: sanitizeForFirebase(feedback),
        essayScoreLog: sanitizeForFirebase(essayScoreLog),
        gradedAt: new Date().toISOString(),
        status: "graded",
      });

      router.push({
        pathname: "/(tabs)/capture/saved",
        params: { score, total, classId, activityId, studentId, name: params.name, section: params.section, color: params.color, title: params.title },
      });
    } catch (error) {
      console.error("Save failed:", error);
      showAlert("Save Error", "Could not save the grade. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0EA47A", "#017EBA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Grading Analysis</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={48} color={colors.white} />
          </View>
          <Text style={styles.title}>Scoring Complete</Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>{score}</Text>
            <View style={styles.scoreSeparator} />
            <Text style={styles.totalText}>{total}</Text>
          </View>
          <Text style={styles.pointsLabel}>Points Earned</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="message-square" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>AI Feedback</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        </View>

        {essayScoreLog ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="list" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Essay Score Log</Text>
            </View>
            <View style={styles.card}>
              {essayScoreLog.split("\n").map((line: string, index: number) => {
                const isCriterion = line.includes("→");
                const isTotal = line.startsWith("TOTAL");
                const isHeader = line.startsWith("ESSAY SCORE LOG") || line.startsWith("Rubric Criteria");
                const isQuestion = line.startsWith("Question:");
                const isReason = line.startsWith("Reason:");
                return (
                  <Text
                    key={index}
                    style={[
                      styles.logText,
                      isCriterion && styles.logCriterion,
                      isTotal && styles.logTotal,
                      isHeader && styles.logHeader,
                      isQuestion && styles.logQuestion,
                      isReason && styles.logReason,
                    ]}
                  >
                    {line}
                  </Text>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.infoSection}>
          <Feather name="user" size={16} color={colors.textSecondary} />
          <Text style={styles.infoLabel}>Student ID:</Text>
          <Text style={styles.infoValue}>{studentId}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.8 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (
            <>
              <Text style={styles.saveText}>Confirm & Save Grade</Text>
              <Feather name="database" size={20} color={colors.white} style={{ marginLeft: 12 }} />
            </>
          )}
        </TouchableOpacity>

        {!saving && (
          <TouchableOpacity style={styles.retakeBtn} onPress={() => router.replace({ pathname: "/(tabs)/capture", params: { classId: params.classId, activityId: params.activityId, name: params.name, section: params.section, color: params.color, title: params.title } })}>
            <Text style={styles.retakeLabel}>Discard & Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", ...shadows.medium },
  headerTitle: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  content: { padding: 24, paddingBottom: 150 },
  scoreCard: { backgroundColor: colors.white, borderRadius: 24, padding: 32, alignItems: "center", marginBottom: 24, ...shadows.soft },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", marginBottom: 24, ...shadows.medium },
  title: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 24 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  scoreText: { fontSize: 64, fontFamily: typography.fontFamily.bold, color: colors.primary },
  scoreSeparator: { width: 2, height: 48, backgroundColor: colors.grayLight, marginHorizontal: 20, transform: [{ rotate: "20deg" }] },
  totalText: { fontSize: 40, fontFamily: typography.fontFamily.bold, color: colors.textSecondary },
  pointsLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginLeft: 8 },
  sectionTitle: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text, marginLeft: 12 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.soft },
  feedbackText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text, lineHeight: 24 },
  logText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, lineHeight: 24 },
  logCriterion: { fontFamily: typography.fontFamily.bold, color: colors.text },
  logTotal: { fontFamily: typography.fontFamily.bold, color: colors.primary, marginTop: 12 },
  logHeader: { fontFamily: typography.fontFamily.bold, color: colors.text },
  logQuestion: { fontFamily: typography.fontFamily.bold, color: colors.textSecondary },
  logReason: { fontStyle: "italic", color: colors.textSecondary, fontSize: 13 },
  infoSection: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.grayLight, paddingVertical: 16, borderRadius: 16 },
  infoLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, marginLeft: 8, marginRight: 8 },
  infoValue: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: colors.text },
  bottomArea: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 20, backgroundColor: colors.background },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", ...shadows.soft },
  saveText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  retakeBtn: { marginTop: 16, paddingVertical: 16, alignItems: "center" },
  retakeLabel: { color: colors.danger, fontSize: 15, fontFamily: typography.fontFamily.bold },
});
