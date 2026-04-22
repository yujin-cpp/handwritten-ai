import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SavedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const getParam = (value: string | string[] | undefined, fallback = "") =>
    Array.isArray(value) ? value[0] : (value ?? fallback);

  const classId = getParam(params.classId);
  const activityId = getParam(params.activityId);
  const className = getParam(params.name, "Class");
  const section = getParam(params.section, "Section");
  const color = getParam(params.color, "#00b679");
  const title = getParam(params.title, "Activity");

  const handleGradeAnother = () => {
    router.dismissAll();
    router.replace({
      pathname: "/(tabs)/capture",
      params: {
        classId,
        activityId,
        name: className,
        section,
        color,
        title,
      },
    });
  };

  const handleGoToScores = () => {
    if (!classId || !activityId) return;
    router.dismissAll();
    router.replace({
      pathname: "/(tabs)/classes/quiz-score",
      params: {
        classId,
        activityId,
        name: className,
        section,
        color,
        title,
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0EA47A", "#017EBA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.headerTitle}>AI Scorer</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <PageMotion delay={50} style={{ alignItems: 'center', width: '100%' }}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={50} color="#fff" />
          </View>

          <Text style={styles.mainText}>Grade Saved!</Text>
          <Text style={styles.subText}>
            The score has been recorded successfully.{"\n"}The AI is now
            processing the breakdown.
          </Text>
        </PageMotion>
      </ScrollView>

      <View
        style={[styles.bottomWrapper, { paddingBottom: insets.bottom + 104 }]}
      >
        <PageMotion delay={100}>
          <TouchableOpacity
            style={styles.gradeAnotherBtn}
            onPress={handleGradeAnother}
          >
            <Feather
              name="maximize"
              size={20}
              color="#fff"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.gradeAnotherText}>Grade Another Student</Text>
          </TouchableOpacity>
        </PageMotion>

        <PageMotion delay={150}>
          <TouchableOpacity style={styles.backBtn} onPress={handleGoToScores}>
            <Text style={styles.backText}>View Class Scores</Text>
            <Feather
              name="chevron-right"
              size={18}
              color="#00b679"
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>
        </PageMotion>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
    marginBottom: 60,
    minHeight: 360,
  },

  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#00b679",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    elevation: 8,
    shadowColor: "#00b679",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },

  mainText: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },
  subText: {
    textAlign: "center",
    color: "#777",
    fontSize: 16,
    lineHeight: 24,
  },

  bottomWrapper: {
    paddingHorizontal: 25,
    gap: 15,
  },

  gradeAnotherBtn: {
    backgroundColor: "#00b679",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#00b679",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradeAnotherText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  backBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#00b679",
    opacity: 1,
  },
  backText: {
    color: "#00b679",
    fontWeight: "700",
    fontSize: 16,
  },
});
