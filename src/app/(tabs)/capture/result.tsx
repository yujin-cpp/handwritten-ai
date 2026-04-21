import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, update } from "firebase/database";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";
import { getGradingResult } from "../../../utils/gradingStore";

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const getParam = (p: any, fb: string) => (Array.isArray(p) ? p[0] : p || fb);

  const score = getParam(params.score, "0");
  const total = getParam(params.total, "100");
  const { objectiveScoreLog, essayScoreLog, feedback } = getGradingResult();
  console.log(" objectiveScoreLog:", objectiveScoreLog);

  console.log(" essayScoreLog:", essayScoreLog);
  console.log("feedback:", feedback);

  const { classId, activityId, studentId } = params;

  const sanitizeForFirebase = (str: string) => {
    if (!str) return str;
    return str
      .replace(/\./g, ",") // replace dots
      .replace(/\#/g, "-") // replace #
      .replace(/\$/g, "-") // replace $
      .replace(/\//g, "-") // replace /
      .replace(/\[/g, "(") // replace [
      .replace(/\]/g, ")"); // replace ]
  };
  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId || !studentId) {
      showAlert("Error", "Missing data. Cannot save score.");
      return;
    }

    setSaving(true);
    try {
      const gradePath = `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`;
      const gradeRef = ref(db, gradePath);

      await update(gradeRef, {
        score: parseInt(score),
        total: parseInt(total),
        feedback: sanitizeForFirebase(feedback),
        objectiveScoreLog: sanitizeForFirebase(objectiveScoreLog),
        essayScoreLog: sanitizeForFirebase(essayScoreLog),
        gradedAt: new Date().toISOString(),
        status: "graded",
      });

      router.push({
        pathname: "/(tabs)/capture/saved",
        params: {
          score,
          total,
          classId,
          activityId,
          studentId,
          name: params.name,
          section: params.section,
          color: params.color,
          title: params.title,
        },
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
      <LinearGradient
        colors={["#0EA47A", "#017EBA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.headerTitle}>Grading Analysis</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.centerContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scoreCard}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>Scoring Complete</Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>{score}</Text>
            <View style={styles.scoreSeparator} />
            <Text style={styles.totalText}>{total}</Text>
          </View>
          <Text style={styles.pointsLabel}>Points Earned</Text>
        </View>

        <View style={styles.feedbackSection}>
          <View style={styles.sectionHeader}>
            <Feather name="message-square" size={18} color="#00b679" />
            <Text style={styles.sectionTitle}>AI Feedback</Text>
          </View>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        </View>

        {objectiveScoreLog
          ? (() => {
              const lines = objectiveScoreLog.split("\n");
              const totalLine =
                lines.find(
                  (l) => l.startsWith("TOTAL") || l.startsWith("FINAL"),
                ) ?? "";

              return (
                <View style={styles.feedbackSection}>
                  <View style={styles.sectionHeader}>
                    <Feather name="check-square" size={18} color="#00b679" />
                    <Text style={styles.sectionTitle}>Objective Score Log</Text>
                  </View>
                  {/* Total score banner */}
                  {totalLine ? (
                    <View style={styles.totalBanner}>
                      <Text style={styles.totalBannerText}>{totalLine}</Text>
                    </View>
                  ) : (
                    // Fallback: compute total from Points lines
                    <View style={styles.totalBanner}>
                      <Text style={styles.totalBannerText}>
                        TOTAL OBJECTIVE SCORE:{" "}
                        {lines
                          .filter((l) => l.startsWith("Points:"))
                          .reduce((sum, l) => {
                            const match = l.match(/Points:\s*(\d+)/);
                            return sum + (match ? parseInt(match[1]) : 0);
                          }, 0)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.feedbackCard}>
                    {lines
                      .filter(
                        (line) =>
                          !line.startsWith("TOTAL") &&
                          !line.startsWith("FINAL") &&
                          !line.startsWith("OBJECTIVE SCORE LOG"),
                      )
                      .map((line: string, index: number) => {
                        const isQuestion = line.startsWith("Question:");
                        const isCorrect = line.startsWith("Points: 1");
                        const isWrong = line.startsWith("Points: 0");
                        const isDivider = line.trim() === "---";
                        const isEmpty = line.trim() === "";

                        if (isDivider)
                          return (
                            <View
                              key={index}
                              style={{
                                height: 1,
                                backgroundColor: "#f0f0f0",
                                marginVertical: 8,
                              }}
                            />
                          );

                        if (isEmpty)
                          return <View key={index} style={{ height: 4 }} />;

                        return (
                          <Text
                            key={index}
                            style={[
                              styles.feedbackText,
                              isQuestion && {
                                fontWeight: "600",
                                color: "#555",
                                fontStyle: "normal",
                              },
                              isCorrect && {
                                color: "#00b679",
                                fontWeight: "600",
                                fontStyle: "normal",
                              },
                              isWrong && {
                                color: "#ff3b30",
                                fontWeight: "600",
                                fontStyle: "normal",
                              },
                            ]}
                          >
                            {line}
                          </Text>
                        );
                      })}
                  </View>
                </View>
              );
            })()
          : null}

        {essayScoreLog
          ? (() => {
              const lines = essayScoreLog.split("\n");
              const totalLine =
                lines.find(
                  (l) => l.startsWith("TOTAL") || l.startsWith("FINAL"),
                ) ?? "";

              return (
                <View style={styles.feedbackSection}>
                  <View style={styles.sectionHeader}>
                    <Feather name="list" size={18} color="#00b679" />
                    <Text style={styles.sectionTitle}>Essay Score Log</Text>
                  </View>

                  {/* Total score banner */}
                  {totalLine ? (
                    <View style={styles.totalBanner}>
                      <Text style={styles.totalBannerText}>{totalLine}</Text>
                    </View>
                  ) : (
                    // Fallback: compute total from Final Score lines
                    <View style={styles.totalBanner}>
                      <Text style={styles.totalBannerText}>
                        TOTAL ESSAY SCORE:{" "}
                        {lines
                          .filter((l) => l.startsWith("Final Score:"))
                          .reduce((sum, l) => {
                            const match = l.match(/=\s*(\d+)/);
                            return sum + (match ? parseInt(match[1]) : 0);
                          }, 0)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.feedbackCard}>
                    {lines
                      .filter(
                        (line) =>
                          !line.startsWith("TOTAL") &&
                          !line.startsWith("FINAL") &&
                          !line.startsWith("ESSAY SCORE LOG"),
                      )
                      .map((line: string, index: number) => {
                        const isCriterion = line.includes("→");
                        const isHeader = line.startsWith("Rubric Criteria");
                        const isQuestion = line.startsWith("Question:");
                        const isReason = line.startsWith("Reason:");
                        const isFinalScore = line.startsWith("Final Score:");
                        const isDivider = line.trim() === "---";
                        const isEmpty = line.trim() === "";

                        if (isDivider)
                          return (
                            <View
                              key={index}
                              style={{
                                height: 1,
                                backgroundColor: "#f0f0f0",
                                marginVertical: 8,
                              }}
                            />
                          );

                        if (isEmpty)
                          return <View key={index} style={{ height: 4 }} />;

                        return (
                          <Text
                            key={index}
                            style={[
                              styles.feedbackText,
                              isCriterion && {
                                fontWeight: "700",
                                fontStyle: "normal",
                                color: "#111",
                              },
                              isHeader && {
                                fontWeight: "700",
                                color: "#333",
                                fontStyle: "normal",
                              },
                              isQuestion && {
                                fontWeight: "600",
                                color: "#555",
                                fontStyle: "normal",
                              },
                              isReason && {
                                fontStyle: "italic",
                                color: "#777",
                                fontSize: 13,
                              },
                              isFinalScore && {
                                fontWeight: "700",
                                color: "#00b679",
                                fontStyle: "normal",
                              },
                            ]}
                          >
                            {line}
                          </Text>
                        );
                      })}
                  </View>
                </View>
              );
            })()
          : null}

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="user" size={14} color="#888" />
            <Text style={styles.infoLabel}>Student ID:</Text>
            <Text style={styles.infoValue}>{studentId}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.8 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveText}>Confirm & Save Grade</Text>
              <Feather
                name="database"
                size={18}
                color="#fff"
                style={{ marginLeft: 10 }}
              />
            </>
          )}
        </TouchableOpacity>

        {!saving && (
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => router.replace("/(tabs)/capture")}
          >
            <Text style={styles.retakeLabel}>Discard & Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

  centerContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 200,
  },

  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    marginBottom: 25,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#00b679",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#00b679",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  scoreText: {
    fontSize: 56,
    fontWeight: "800",
    color: "#00b679",
  },
  scoreSeparator: {
    width: 2,
    height: 40,
    backgroundColor: "#eee",
    marginHorizontal: 15,
    transform: [{ rotate: "20deg" }],
  },
  totalText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#999",
  },
  pointsLabel: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  feedbackSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
  },
  feedbackCard: {
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  feedbackText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 24,
    fontStyle: "italic",
  },

  infoSection: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginLeft: 6,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },

  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  saveBtn: {
    backgroundColor: "#00b679",
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#00b679",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  retakeBtn: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: "center",
  },
  retakeLabel: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "600",
  },

  totalBanner: {
    backgroundColor: "#e6f9f2",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#00b679",
  },
  totalBannerText: {
    color: "#00b679",
    fontWeight: "800",
    fontSize: 15,
  },
});
