import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleGradeAnother = () => {
    router.dismissAll();
    router.replace("/(tabs)/capture");
  };

  const handleGoToScores = () => {
    router.dismissAll();
    router.replace("/(tabs)/classes/quiz-score");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#00b679", "#009e60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.headerTitle}>AI Scorer</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={50} color="#fff" />
        </View>

        <Text style={styles.mainText}>Grade Saved!</Text>
        <Text style={styles.subText}>
          The score has been recorded successfully.{"\n"}The AI is now processing the breakdown.
        </Text>
      </View>

      <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + 30 }]}>
        <TouchableOpacity
          style={styles.gradeAnotherBtn}
          onPress={handleGradeAnother}
        >
          <Feather name="maximize" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.gradeAnotherText}>Grade Another Student</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={handleGoToScores}>
          <Text style={styles.backText}>View Class Scores</Text>
          <Feather name="chevron-right" size={18} color="#00b679" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 25,
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
    marginBottom: 60,
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
    backgroundColor: "#fff",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: "#00b679",
  },
  backText: {
    color: "#00b679",
    fontWeight: "700",
    fontSize: 16,
  },
});
