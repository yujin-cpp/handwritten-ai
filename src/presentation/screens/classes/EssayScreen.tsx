import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor, getIconBoxColors } from "../../../utils/colorUtils";

// Quick Firebase imports for settings
import { onValue, ref } from "firebase/database";
import { db } from "../../../firebase/firebaseConfig";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

type Instruction = {
  id: string;
  title: string;
  lessonRef: string;
  rubrics: string;
};

export const EssayScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);

  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !classId || !activityId) return;

    const instructionsRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions`);
    const unsubscribe = onValue(instructionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setInstructions([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const list = Object.keys(data).map((key) => ({
        id: key,
        title: data[key].title,
        lessonRef: data[key].lessonRef,
        rubrics: data[key].rubrics,
      }));
      setInstructions(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activityId, classId, uid]);

  const headerTextColor = getContrastColor(headerColor);
  const { bg: iconBg, icon: iconFg } = getIconBoxColors(headerColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>{className} • {section}</Text>
          <Text style={[styles.headerBig, { color: headerTextColor }]} numberOfLines={1}>Essay Rubrics</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Grading Method</Text>
          <Text style={styles.sectionTitle}>Subjective Rubrics</Text>
          <Text style={styles.sectionDesc}>
            Define specific criteria and lesson references for essay questions. Our AI will grade based on these instructions.
          </Text>
        </View>

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeader}>ACTIVE INSTRUCTIONS</Text>
            <View style={[styles.badge, { backgroundColor: iconBg }]}>
              <Text style={[styles.badgeText, { color: iconFg }]}>{instructions.length}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={headerColor} style={{ marginTop: 40 }} />
          ) : instructions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconBox, { backgroundColor: iconBg }]}>
                <Feather name="file-text" size={40} color={iconFg} />
              </View>
              <Text style={styles.emptyText}>No rubrics configured yet.</Text>
            </View>
          ) : (
            <View style={styles.instructionList}>
              {instructions.map((inst) => (
                <TouchableOpacity
                  key={inst.id}
                  activeOpacity={0.8}
                  style={styles.instCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/classes/essay-view",
                      params: {
                        id: inst.id, name: className, section, color: headerColor, title: inst.title,
                        lessonRef: inst.lessonRef, rubrics: inst.rubrics, classId, activityId,
                      },
                    })
                  }
                >
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <Feather name="book-open" size={20} color={iconFg} />
                  </View>
                  <View style={styles.instInfo}>
                    <Text style={styles.instTitle} numberOfLines={1}>{inst.title}</Text>
                    <Text style={styles.instSub} numberOfLines={1}>Ref: {inst.lessonRef}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.grayLight} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.addBtn}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/classes/essay-edit",
              params: { name: className, section, color: headerColor, classId, activityId },
            })
          }
        >
          <View style={[styles.addIconBox, { backgroundColor: headerColor }]}>
            <Feather name="plus" size={24} color={colors.white} />
          </View>
          <Text style={styles.addBtnText}>Add New Instruction</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", ...shadows.medium },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10, alignItems: "center" },
  headerSmall: { color: colors.white, fontSize: 11, fontFamily: typography.fontFamily.bold, textTransform: "uppercase", opacity: 0.9 },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  content: { padding: 24, paddingBottom: 150 },
  infoSection: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8 },
  sectionTitle: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 12 },
  sectionDesc: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, lineHeight: 24 },
  listSection: { marginBottom: 32 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  listHeader: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, letterSpacing: 1 },
  badge: { marginLeft: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontFamily: typography.fontFamily.bold },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  instructionList: { gap: 16 },
  instCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', ...shadows.soft },
  iconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  instInfo: { flex: 1, marginLeft: 16 },
  instTitle: { fontSize: 17, fontFamily: typography.fontFamily.bold, color: colors.text },
  instSub: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 4 },
  addBtn: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 24, padding: 32, borderWidth: 2, borderColor: colors.grayLight, borderStyle: 'dashed' },
  addIconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  addBtnText: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text },
});
