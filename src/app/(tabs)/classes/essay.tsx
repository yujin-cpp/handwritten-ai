import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onValue, push, ref, remove, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

type Instruction = {
  id: string;
  title: string;
  lessonRef: string;
  rubrics: string;
};

export default function EssayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");

  const deletedId = P(params.deletedId, "");
  const newTitle = P(params.newTitle, "");
  const newLessonRef = P(params.newLessonRef, "");
  const newRubrics = P(params.newRubrics, "");

  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
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
  }, [classId, activityId]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId || !activityId) return;

    const syncChanges = async () => {
      if (newTitle) {
        try {
          const instructionsRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions`);
          const newRef = push(instructionsRef);
          await set(newRef, {
            title: newTitle,
            lessonRef: newLessonRef || "No lesson attached",
            rubrics: newRubrics || "No rubrics attached",
          });
          router.setParams({ newId: "", newTitle: "", newLessonRef: "", newRubrics: "" });
        } catch (e) {
          console.error("Failed to add instruction", e);
        }
      }

      if (deletedId) {
        try {
          const itemRef = ref(db, `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions/${deletedId}`);
          await remove(itemRef);
          router.setParams({ deletedId: "" });
        } catch (e) {
          console.error("Failed to delete instruction", e);
        }
      }
    };

    syncChanges();
  }, [newTitle, deletedId, classId, activityId, newLessonRef, newRubrics, router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className} • {section}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>Essay Rubrics</Text>
        </View>
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
            <View style={[styles.badge, { backgroundColor: headerColor + '15' }]}>
              <Text style={[styles.badgeText, { color: headerColor }]}>{instructions.length}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={headerColor} style={{ marginTop: 40 }} />
          ) : instructions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Feather name="file-text" size={40} color="#ddd" />
              </View>
              <Text style={styles.emptyText}>No rubrics configured yet.</Text>
            </View>
          ) : (
            <View style={styles.instructionList}>
              {instructions.map((inst) => (
                <TouchableOpacity
                  key={inst.id}
                  activeOpacity={0.7}
                  style={styles.instCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/classes/essay-view",
                      params: {
                        id: inst.id,
                        name: className,
                        section,
                        color: headerColor,
                        title: inst.title,
                        lessonRef: inst.lessonRef,
                        rubrics: inst.rubrics,
                        classId,
                        activityId,
                      },
                    })
                  }
                >
                  <View style={[styles.iconBox, { backgroundColor: headerColor + '10' }]}>
                    <Feather name="book-open" size={20} color={headerColor} />
                  </View>
                  <View style={styles.instInfo}>
                    <Text style={styles.instTitle} numberOfLines={1}>{inst.title}</Text>
                    <Text style={styles.instSub} numberOfLines={1}>Ref: {inst.lessonRef}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/classes/essay-edit",
              params: {
                name: className,
                section,
                color: headerColor,
                classId,
                activityId,
              },
            })
          }
        >
          <View style={[styles.addIconBox, { backgroundColor: headerColor }]}>
            <Feather name="plus" size={24} color="#fff" />
          </View>
          <Text style={styles.addBtnText}>Add New Instruction</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { paddingHorizontal: 20, paddingBottom: 25, flexDirection: "row", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: "#fff", fontSize: 11, opacity: 0.8, fontWeight: '700', textTransform: 'uppercase' },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },

  content: { padding: 20 },
  infoSection: { marginBottom: 30, paddingHorizontal: 5 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#bbb', textTransform: 'uppercase', marginBottom: 8 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 12 },
  sectionDesc: { fontSize: 15, color: '#666', lineHeight: 22 },

  listSection: { paddingHorizontal: 5, marginBottom: 30 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  listHeader: { fontSize: 12, fontWeight: '800', color: '#bbb', letterSpacing: 1 },
  badge: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '800' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, marginBottom: 15 },
  emptyText: { fontSize: 15, color: '#bbb', fontWeight: '500' },

  instructionList: { gap: 12 },
  instCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  instInfo: { flex: 1, marginLeft: 15 },
  instTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  instSub: { fontSize: 13, color: '#999', marginTop: 2 },

  addBtn: {
    alignItems: 'center',
    marginTop: 10,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  addIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#111' },
});
