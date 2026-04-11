import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, remove, update } from "firebase/database";
import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../../../firebase/firebaseConfig";
import { showAlert } from "../../../utils/alert";
import {
  normalizeLessonRefs,
  normalizeRubric,
  type EssayInstructionRecord,
} from "../../../utils/essayMaterials";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

type DeleteTarget = "instruction" | { type: "lesson"; index: number } | "rubric" | null;

export default function EssayView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const id = P(params.id, "");
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");

  const [instruction, setInstruction] = useState<EssayInstructionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid || !classId || !activityId || !id) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadInstruction() {
      try {
        const snapshot = await get(
          ref(
            db,
            `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions/${id}`
          )
        );

        if (!active) {
          return;
        }

        setInstruction(snapshot.exists() ? (snapshot.val() as EssayInstructionRecord) : null);
      } catch (error) {
        console.error("Failed to load essay instruction", error);
        showAlert("Error", "Unable to load the rubric details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInstruction();

    return () => {
      active = false;
    };
  }, [activityId, classId, id]);

  const lessonRefs = useMemo(() => normalizeLessonRefs(instruction), [instruction]);
  const rubric = useMemo(() => normalizeRubric(instruction), [instruction]);

  function handleOpenFile(url: string, name: string) {
    if (url && url.startsWith("http")) {
      Linking.openURL(url).catch(() => {
        showAlert("Error", "Could not open file link.");
      });
    } else {
      showAlert("No File", `No downloadable file found for "${name}".`);
    }
  }

  function openDelete(target: DeleteTarget) {
    setDeleteTarget(target);
    setConfirmVisible(true);
  }

  async function handleConfirmDelete() {
    const uid = auth.currentUser?.uid;

    if (!uid || !classId || !activityId || !id || !deleteTarget) {
      setConfirmVisible(false);
      return;
    }

    try {
      const instructionRef = ref(
        db,
        `professors/${uid}/classes/${classId}/activities/${activityId}/essayInstructions/${id}`
      );

      if (deleteTarget === "instruction") {
        await remove(instructionRef);
        router.replace({
          pathname: "/(tabs)/classes/essay",
          params: {
            classId,
            activityId,
            name: className,
            section,
            color: headerColor,
          },
        });
        return;
      }

      if (deleteTarget === "rubric") {
        await update(instructionRef, {
          rubric: null,
          rubrics: "No file attached",
          rubricsUrl: "",
          updatedAt: new Date().toISOString(),
        });
        setInstruction((current) =>
          current
            ? {
                ...current,
                rubric: null,
                rubrics: "No file attached",
                rubricsUrl: "",
                updatedAt: new Date().toISOString(),
              }
            : current
        );
        return;
      }

      if (typeof deleteTarget === "object" && deleteTarget.type === "lesson") {
        const nextLessons = lessonRefs.filter((_, index) => index !== deleteTarget.index);
        await update(instructionRef, {
          lessonRefs: nextLessons,
          lessonRef: nextLessons[0]?.name ?? "No file attached",
          lessonUrl: nextLessons[0]?.url ?? "",
          updatedAt: new Date().toISOString(),
        });
        setInstruction((current) =>
          current
            ? {
                ...current,
                lessonRefs: nextLessons,
                lessonRef: nextLessons[0]?.name ?? "No file attached",
                lessonUrl: nextLessons[0]?.url ?? "",
                updatedAt: new Date().toISOString(),
              }
            : current
        );
      }
    } catch (error) {
      console.error("Failed to update rubric material", error);
      showAlert("Error", "Unable to update the material links.");
    } finally {
      setConfirmVisible(false);
      setDeleteTarget(null);
    }
  }

  function openEditor() {
    router.push({
      pathname: "/(tabs)/classes/essay-edit",
      params: {
        instructionId: id,
        classId,
        activityId,
        name: className,
        section,
        color: headerColor,
      },
    });
  }

  const deleteTitle =
    deleteTarget === "instruction"
      ? "Delete Rubric?"
      : deleteTarget === "rubric"
      ? "Delete Rubric File?"
      : "Delete Lesson Reference?";
  const deleteMessage =
    deleteTarget === "instruction"
      ? "Are you sure you want to remove this grading instruction? This cannot be undone."
      : deleteTarget === "rubric"
      ? "This will remove the attached rubric file. You can add another one anytime."
      : "This will remove the selected lesson reference. You can add another file anytime.";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.header,
          { backgroundColor: headerColor, paddingTop: insets.top + 15 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>
            {className} • {section}
          </Text>
          <Text style={styles.headerBig} numberOfLines={1}>
            Review Rubric
          </Text>
        </View>
        <TouchableOpacity onPress={openEditor} style={styles.headerActionBtn}>
          <Feather name="edit-3" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openDelete("instruction")}
          style={styles.headerActionBtn}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading rubric details...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.label}>Instructions</Text>
                <Feather name="info" size={14} color="#ccc" />
              </View>
              <Text style={styles.titleText}>
                {instruction?.title || "Essay Rubric"}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.bodyText}>
                {instruction?.fullInstructions?.trim() ||
                  "No detailed instructions were added yet."}
              </Text>
            </View>

            <View style={[styles.card, { marginTop: 25 }]}>
              <View style={styles.materialHeader}>
                <Text style={styles.label}>Material Links</Text>
                <TouchableOpacity style={styles.inlineAction} onPress={openEditor}>
                  <Feather name="plus" size={15} color={headerColor} />
                  <Text style={[styles.inlineActionText, { color: headerColor }]}>
                    Add material link
                  </Text>
                </TouchableOpacity>
              </View>

              {lessonRefs.length === 0 ? (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={openEditor}>
                  <Feather name="book-open" size={18} color="#94a3b8" />
                  <Text style={styles.emptyAddText}>Add a lesson reference</Text>
                </TouchableOpacity>
              ) : (
                lessonRefs.map((lesson, index) => (
                  <View key={`${lesson.name}-${index}`} style={styles.materialItem}>
                    <TouchableOpacity
                      style={styles.fileLink}
                      onPress={() => handleOpenFile(lesson.url, lesson.name)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: "#f0f0ff" }]}>
                        <Feather name="book" size={20} color="#6c63ff" />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileLabel}>Lesson Reference</Text>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {lesson.name}
                        </Text>
                      </View>
                      <Feather name="external-link" size={16} color="#ccc" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteMaterialBtn}
                      onPress={() => openDelete({ type: "lesson", index })}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View style={[styles.divider, { marginVertical: 18 }]} />

              {rubric ? (
                <View style={styles.materialItem}>
                  <TouchableOpacity
                    style={styles.fileLink}
                    onPress={() => handleOpenFile(rubric.url, rubric.name)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: "#f0fdf4" }]}>
                      <Feather
                        name={rubric.source === "default" ? "star" : "list"}
                        size={20}
                        color="#00b679"
                      />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileLabel}>
                        {rubric.source === "default" ? "Default Rubric" : "Score Rubrics"}
                      </Text>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {rubric.name}
                      </Text>
                    </View>
                    <Feather name="external-link" size={16} color="#ccc" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteMaterialBtn}
                    onPress={() => openDelete("rubric")}
                  >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={openEditor}>
                  <Feather name="star" size={18} color="#94a3b8" />
                  <Text style={styles.emptyAddText}>Add a rubric file or use the default rubric</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setConfirmVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.warnIcon}>
              <Feather name="alert-triangle" size={32} color="#ff3b30" />
            </View>
            <Text style={styles.modalTitle}>{deleteTitle}</Text>
            <Text style={styles.modalSub}>{deleteMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleConfirmDelete}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  content: { padding: 20 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  loadingText: { color: "#64748b", fontSize: 15, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  materialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  inlineActionText: { fontSize: 12, fontWeight: "700" },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#bbb",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleText: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 15 },
  divider: { height: 1, backgroundColor: "#f0f0f0" },
  bodyText: { fontSize: 16, color: "#666", lineHeight: 26, marginTop: 15 },

  materialItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  fileLink: { flex: 1, flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fileName: { fontSize: 15, fontWeight: "700", color: "#333" },
  deleteMaterialBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff1f2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    backgroundColor: "#f8fafc",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 25,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  warnIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 12 },
  modalSub: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "800", fontSize: 15 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
