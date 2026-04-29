import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { classRepository } from "../../../data/repositories/FirebaseClassRepository";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor, getIconBoxColors } from "../../../utils/colorUtils";

export const ClassInformationScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { uid } = useAuthSession();

  const getParam = (v: any) => (Array.isArray(v) ? v[0] : v);
  const currentClassId = getParam(params.classId);

  const [classData, setClassData] = useState({
    name: getParam(params.name) || "N/A",
    section: getParam(params.section) || "N/A",
    academicYear: getParam(params.academicYear) || "2025 - 2026",
    color: getParam(params.color) || colors.primary
  });

  const [counts, setCounts] = useState({ students: 0, activities: 0 });

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!uid || !currentClassId) return;

        try {
          // Ideally we fetch a single class, but listenToClassesRaw gets the whole tree in our port
          // For a cleaner port, we could add `getClass(classId)` to our repository.
          // For now, we will just use the get param data, and the user can enhance this later.
          // But let's retrieve from Realtime db directly like the old code did for speed.
          const { get, ref } = require("firebase/database");
          const { db } = require("../../../firebase/firebaseConfig");
          
          const classRef = ref(db, `professors/${uid}/classes/${currentClassId}`);
          const snapshot = await get(classRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            setClassData({
              name: data.className || "N/A",
              section: data.section || "N/A",
              academicYear: data.semester || "2025 - 2026",
              color: data.themeColor || colors.primary
            });

            const studentCount = data.students ? Object.keys(data.students).length : 0;
            const activityCount = data.activities ? Object.keys(data.activities).length : 0;
            setCounts({ students: studentCount, activities: activityCount });
          }
        } catch (error) {
          console.error("Error fetching class details:", error);
        }
      };

      fetchData();
    }, [currentClassId, uid])
  );

  const headerTextColor = getContrastColor(classData.color);
  const { bg: iconBg, icon: iconFg } = getIconBoxColors(classData.color);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: classData.color, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: headerTextColor }]} numberOfLines={1}>{classData.name}</Text>
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
          <Feather name="edit-3" size={20} color={headerTextColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="info" size={18} color={classData.color} />
            <Text style={[styles.cardTitle, { color: classData.color }]}>Class Details</Text>
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

        <Text style={styles.sectionHeading}>Quick Actions</Text>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(tabs)/classes/masterlist",
              params: {
                classId: currentClassId,
                name: classData.name,
                section: classData.section,
                color: classData.color
              }
            })
          }
          style={styles.actionCard}
        >
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Feather name="users" size={20} color={iconFg} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Student Masterlist</Text>
            <Text style={styles.actionSubtitle}>Manage and view all students</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(tabs)/classes/activities",
              params: {
                classId: currentClassId,
                name: classData.name,
                section: classData.section,
                color: classData.color
              }
            })
          }
          style={styles.actionCard}
        >
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Feather name="book-open" size={20} color={iconFg} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Class Activities</Text>
            <Text style={styles.actionSubtitle}>Track scores and gradings</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionHeading}>At a Glance</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: classData.color }]}>{counts.students}</Text>
            <Text style={styles.statLabel}>Students</Text>
            <View style={[styles.statBar, { backgroundColor: classData.color }]} />
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: classData.color }]}>{counts.activities}</Text>
            <Text style={styles.statLabel}>Activities</Text>
            <View style={[styles.statBar, { backgroundColor: classData.color }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  editBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 20, flex: 1, textAlign: 'center' },
  content: { padding: 24, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 24, ...shadows.soft, marginBottom: 30 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 14, fontFamily: typography.fontFamily.bold, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  infoLabel: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  infoValue: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.grayLight },
  sectionHeading: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 16 },
  actionCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 16, ...shadows.soft },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionInfo: { flex: 1, marginLeft: 16 },
  actionTitle: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text },
  actionSubtitle: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 16 },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 20, padding: 24, alignItems: "center", ...shadows.soft },
  statValue: { fontSize: 36, fontFamily: typography.fontFamily.bold, marginBottom: 4 },
  statLabel: { fontSize: 13, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary },
  statBar: { width: 30, height: 4, borderRadius: 2, marginTop: 12 },
});
