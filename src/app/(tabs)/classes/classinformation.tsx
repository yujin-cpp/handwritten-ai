import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";

export default function ClassInformationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const getParam = (v: any) => (Array.isArray(v) ? v[0] : v);
  const currentClassId = getParam(params.classId);
  console.log("🔍 ALL PARAMS:", JSON.stringify(params));

  const [classData, setClassData] = useState({
    name: getParam(params.name) || "N/A",
    section: getParam(params.section) || "N/A",
    academicYear: getParam(params.academicYear) || "2025 - 2026",
    color: getParam(params.color) || "#01B468",
  });

  const [counts, setCounts] = useState({ students: 0, activities: 0 });

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid || !currentClassId) return;

        try {
          const classRef = ref(
            db,
            `professors/${uid}/classes/${currentClassId}`,
          );
          const snapshot = await get(classRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            setClassData({
              name: data.className || "N/A",
              section: data.section || "N/A",
              academicYear: data.semester || "2025 - 2026",
              color: data.themeColor || "#01B468",
            });

            const studentCount = data.students
              ? Object.keys(data.students).length
              : 0;
            const activityCount = data.activities
              ? Object.keys(data.activities).length
              : 0;
            setCounts({ students: studentCount, activities: activityCount });
          }
        } catch (error) {
          console.error("Error fetching class details:", error);
        }
      };

      fetchData();
    }, [currentClassId]),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header with Theme Color */}
      <View
        style={[
          styles.header,
          { backgroundColor: classData.color, paddingTop: insets.top + 15 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {classData.name}
        </Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/classes/editclass",
              params: {
                classId: currentClassId,
                name: classData.name,
                section: classData.section,
                color: classData.color,
                academicYear: classData.academicYear,
              },
            })
          }
        >
          <Feather name="edit-3" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="info" size={16} color={classData.color} />
            <Text style={[styles.cardTitle, { color: classData.color }]}>
              Class Details
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.infoLabel}>Academic Year</Text>
            <Text style={styles.infoValue}>{classData.academicYear}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.infoLabel}>Section</Text>
            <Text style={styles.infoValue}>{classData.section}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            console.log("🔍 Navigating with classId:", currentClassId);
            router.push({
              pathname: "/(tabs)/classes/masterlist",
              params: {
                classId: currentClassId,
                name: classData.name,
                section: classData.section,
                color: classData.color,
              },
            });
          }}
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: classData.color + "15" },
            ]}
          >
            <Feather name="users" size={20} color={classData.color} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Student Masterlist</Text>
            <Text style={styles.actionSubtitle}>
              Manage and view all students
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/classes/activities",
              params: {
                classId: currentClassId,
                name: classData.name,
                section: classData.section,
                color: classData.color,
                academicYear: classData.academicYear,
              },
            })
          }
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: classData.color + "15" },
            ]}
          >
            <Feather name="book-open" size={20} color={classData.color} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Class Activities</Text>
            <Text style={styles.actionSubtitle}>Track scores and gradings</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Summary Stats */}
        <Text style={styles.sectionHeading}>At a Glance</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: classData.color }]}>
              {counts.students}
            </Text>
            <Text style={styles.statLabel}>Students</Text>
            <View
              style={[styles.statBar, { backgroundColor: classData.color }]}
            />
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: classData.color }]}>
              {counts.activities}
            </Text>
            <Text style={styles.statLabel}>Activities</Text>
            <View
              style={[styles.statBar, { backgroundColor: classData.color }]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  editBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    flex: 1,
    textAlign: "center",
  },

  content: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 14, color: "#888", fontWeight: "500" },
  infoValue: { fontSize: 15, color: "#111", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f0f0f0" },

  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    marginTop: 30,
    marginBottom: 15,
    marginLeft: 5,
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionInfo: { flex: 1, marginLeft: 15 },
  actionTitle: { fontSize: 16, fontWeight: "700", color: "#222" },
  actionSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 15 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  statValue: { fontSize: 32, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#888", fontWeight: "600" },
  statBar: { width: 30, height: 4, borderRadius: 2, marginTop: 12 },
});
