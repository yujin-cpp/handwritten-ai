import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const SavedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const color = P(params.color, colors.primary);
  const title = P(params.title, "Activity");

  const handleGradeAnother = () => {
    router.dismissAll();
    router.replace({ pathname: "/(tabs)/capture", params: { classId, activityId, name: className, section, color, title } });
  };

  const handleGoToScores = () => {
    if (!classId || !activityId) return;
    router.dismissAll();
    router.replace({ pathname: "/(tabs)/classes/quiz-score", params: { classId, activityId, name: className, section, color, title, fromCapture: "1" } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0EA47A", "#017EBA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>AI Scorer</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={56} color={colors.white} />
        </View>

        <Text style={styles.mainText}>Grade Saved!</Text>
        <Text style={styles.subText}>The score has been recorded successfully.{"\n"}The AI is now processing the breakdown.</Text>
      </ScrollView>

      <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={styles.gradeAnotherBtn} onPress={handleGradeAnother}>
          <Feather name="maximize" size={20} color={colors.white} style={{ marginRight: 12 }} />
          <Text style={styles.gradeAnotherText}>Grade Another Student</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={handleGoToScores}>
          <Text style={styles.backText}>View Class Scores</Text>
          <Feather name="chevron-right" size={20} color={colors.primary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", ...shadows.medium },
  headerTitle: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 40, minHeight: 400 },
  checkCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 32, ...shadows.medium },
  mainText: { textAlign: "center", fontSize: 32, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 16 },
  subText: { textAlign: "center", color: colors.textSecondary, fontSize: 16, fontFamily: typography.fontFamily.medium, lineHeight: 24 },
  bottomWrapper: { paddingHorizontal: 24, gap: 16 },
  gradeAnotherBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", ...shadows.soft },
  gradeAnotherText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  backBtn: { backgroundColor: colors.white, paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", borderWidth: 2, borderColor: colors.primary },
  backText: { color: colors.primary, fontFamily: typography.fontFamily.bold, fontSize: 16 },
});
