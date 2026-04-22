import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onValue, ref, update } from "firebase/database";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageMotion } from "../../../components/PageMotion";
import { GlassCard } from "../../../components/GlassCard";
import { db } from "../../../firebase/firebaseConfig";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

const isRemoteProofUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value);

type Student = {
  id: string;
  name: string;
  score?: number;
  total?: number;
  images?: string[];
  status?: string;
  confidenceScore?: number;
  legibility?: string;
  verificationLog?: string;
  transcribedText?: string;
};

type SortOption =
  | "none"
  | "name-asc"
  | "name-desc"
  | "score-asc"
  | "score-desc";

export default function QuizScore() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");
  const activityTitle = P(params.title, "Activity");

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [exportOpen, setExportOpen] = useState(false);
  const [exportDone, setExportDone] = useState<
    null | ".CSV" | ".PDF" | ".XLSX"
  >(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempScore, setTempScore] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // --- NEW: AI Details Modal ---
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<Student | null>(null);

  const [sortOpen, setSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("none");

  const [missingOpen, setMissingOpen] = useState(false);

  useEffect(() => {
    if (!uid || !classId || !activityId) return;

    const studentsRef = ref(
      db,
      `professors/${uid}/classes/${classId}/students`,
    );
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const data = snapshot.val();
      const parsedStudents: Student[] = Object.keys(data).map((key) => {
        const studentData = data[key];
        const activityRecord = studentData.activities?.[activityId];
        const imageList = Array.isArray(activityRecord?.images)
          ? activityRecord.images.filter((img: unknown) =>
              isRemoteProofUrl(img),
            )
          : isRemoteProofUrl(activityRecord?.latestImage)
            ? [activityRecord.latestImage]
            : isRemoteProofUrl(activityRecord?.imageUri)
              ? [activityRecord.imageUri]
              : [];

        return {
          id: key,
          name: studentData.name,
          score: activityRecord?.score,
          total: activityRecord?.total,
          images: imageList,
          status: activityRecord?.status || "pending",
          confidenceScore: activityRecord?.confidenceScore,
          legibility: activityRecord?.legibility,
          verificationLog: activityRecord?.verificationLog,
          transcribedText: activityRecord?.transcribedText,
        };
      });

      setStudents(parsedStudents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activityId, classId, uid]);

  const missingStudents = useMemo(
    () =>
      students.filter((s) => s.score === undefined && s.status !== "grading"),
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = students;
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));

    const sorted = [...list];
    switch (sortOption) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "score-asc":
        sorted.sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
        break;
      case "score-desc":
        sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
        break;
    }
    return sorted;
  }, [students, query, sortOption]);

  const scoresOnly = students
    .map((s) => s.score)
    .filter((s) => s !== undefined) as number[];
  const highest = scoresOnly.length > 0 ? Math.max(...scoresOnly) : 0;
  const totalStudents = students.length;
  const completed = scoresOnly.length;
  const missingCount = totalStudents - completed;

  function openCameraFor(student: Student) {
    router.push({
      pathname: "/(tabs)/capture",
      params: {
        classId,
        activityId,
        studentId: student.id,
        returnTo: "quiz-score",
        name: className,
        section,
        color: headerColor,
        title: activityTitle,
      },
    });
    setMissingOpen(false);
  }

  function openViewImages(student: Student) {
    if (!student.images || student.images.length === 0) {
      showAlert("No Proof", "No images uploaded for this student.");
      return;
    }
    router.push({
      pathname: "/(tabs)/classes/uploaded-image",
      params: {
        images: encodeURIComponent(JSON.stringify(student.images)),
        student: student.name,
        section: section,
        title: activityTitle,
        color: headerColor,
      },
    });
  }

  function openEdit(student: Student) {
    setEditTarget(student);
    setTempName(student.name);
    setTempScore(
      typeof student.score === "number" ? String(student.score) : "",
    );
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!uid) return;

    setSaving(true);
    try {
      const parsed = parseInt(tempScore, 10);
      const nextScore = isNaN(parsed) ? null : parsed;
      const gradePath = `professors/${uid}/classes/${classId}/students/${editTarget.id}/activities/${activityId}`;
      await update(ref(db, gradePath), {
        score: nextScore,
        status: nextScore !== null ? "graded" : "pending",
      });
      setEditOpen(false);
    } catch {
      showAlert("Error", "Failed to update score.");
    } finally {
      setSaving(false);
    }
  }

  function openAIDetails(student: Student) {
    setAiTarget(student);
    setAiDetailsOpen(true);
  }

  const sortLabel = (() => {
    switch (sortOption) {
      case "name-asc":
        return "Name A-Z";
      case "name-desc":
        return "Name Z-A";
      case "score-asc":
        return "Score Low-High";
      case "score-desc":
        return "Score High-Low";
      default:
        return "Sort By";
    }
  })();

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
            {activityTitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setExportOpen(true)}
          style={styles.headerActionBtn}
        >
          <Feather name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Widgets */}
        <PageMotion delay={40} style={styles.statsGrid}>
          <GlassCard style={{ flex: 1 }}>
            <View style={{ padding: 20 }}>
              <View style={[styles.statIconBox, { backgroundColor: "#f0fdf4" }]}>
                <Feather name="award" size={20} color="#00b679" />
              </View>
              <Text style={styles.statVal}>{highest}</Text>
              <Text style={styles.statLab}>Highest Score</Text>
            </View>
          </GlassCard>

          <GlassCard style={{ flex: 1 }}>
            <View style={{ padding: 20 }}>
              <View style={[styles.statIconBox, { backgroundColor: "#fff7ed" }]}>
                <Feather name="clock" size={20} color="#f97316" />
              </View>
              <Text style={styles.statVal}>{missingCount}</Text>
              <Text style={styles.statLab}>Pending Grades</Text>
            </View>
          </GlassCard>
        </PageMotion>

        <PageMotion delay={95}>
          <GlassCard style={{ marginBottom: 25 }}>
            <TouchableOpacity
              style={{ padding: 20 }}
              onPress={() => setMissingOpen(true)}
              disabled={missingStudents.length === 0}
            >
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Grading Progress</Text>
              <Text style={styles.progressVal}>
                {completed} / {totalStudents}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: headerColor,
                    width: totalStudents
                      ? `${(completed / totalStudents) * 100}%`
                      : "0%",
                  },
                ]}
              />
            </View>
            {missingStudents.length > 0 && (
              <View style={styles.missingBadge}>
                <Feather name="alert-circle" size={14} color="#ff3b30" />
                <Text style={styles.missingBadgeText}>
                  {missingStudents.length} students missing scores
                </Text>
                <Feather
                  name="chevron-right"
                  size={14}
                  color="#ccc"
                  style={{ marginLeft: "auto" }}
                />
              </View>
            )}
          </TouchableOpacity>
          </GlassCard>
        </PageMotion>

        {/* Toolbar */}
        <PageMotion delay={130}>
          <GlassCard style={{ marginBottom: 20 }}>
            <View style={{ padding: 15, flexDirection: 'row', gap: 12 }}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color="#999" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Filter by name..."
              placeholderTextColor="#bbb"
              style={styles.searchInp}
            />
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setSortOpen(true)}
          >
            <Feather name="sliders" size={16} color="#444" />
            <Text style={styles.filterText}>{sortLabel}</Text>
          </TouchableOpacity>
            </View>
          </GlassCard>
        </PageMotion>

        {/* Student List Table */}
        <PageMotion delay={180}>
          <GlassCard>
          <View style={styles.listHeader}>
            <Text style={[styles.headCell, { flex: 2 }]}>STUDENT NAME</Text>
            <Text style={[styles.headCell, { flex: 1, textAlign: "center" }]}>
              SCORE
            </Text>
            <Text style={[styles.headCell, { flex: 1, textAlign: "center" }]}>
              PROOF
            </Text>
            <Text style={[styles.headCell, { width: 50 }]}></Text>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={headerColor}
              style={{ marginTop: 40 }}
            />
          ) : filtered.length === 0 ? (
            <Text style={styles.emptyMsg}>
              {query.trim()
                ? `No results found for '${query}'`
                : "No students found"}
            </Text>
          ) : (
            filtered.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.listRow,
                  idx === filtered.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {s.name}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: "center" }}>
                  {typeof s.score === "number" ? (
                    <TouchableOpacity
                      onPress={() => openAIDetails(s)}
                      style={{ alignItems: "center" }}
                    >
                      <Text style={[styles.rowScore, { color: headerColor }]}>
                        {s.score}
                      </Text>
                      {s.confidenceScore !== undefined && (
                        <View
                          style={[
                            styles.miniBadge,
                            {
                              backgroundColor:
                                s.confidenceScore > 80 ? "#f0fdf4" : "#fff7ed",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.miniBadgeText,
                              {
                                color:
                                  s.confidenceScore > 80
                                    ? "#00b679"
                                    : "#f97316",
                              },
                            ]}
                          >
                            {s.confidenceScore}%
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : s.status === "grading" ? (
                    <ActivityIndicator size="small" color={headerColor} />
                  ) : (
                    <TouchableOpacity
                      onPress={() => openCameraFor(s)}
                      style={styles.captureBtn}
                    >
                      <Feather name="camera" size={16} color="#6c63ff" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flex: 1, alignItems: "center" }}>
                  <TouchableOpacity
                    disabled={!s.images || s.images.length === 0}
                    onPress={() => openViewImages(s)}
                    style={[
                      styles.proofBtn,
                      (!s.images || s.images.length === 0) && { opacity: 0.2 },
                    ]}
                  >
                    <Feather name="image" size={18} color="#444" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={{ width: 50, alignItems: "center" }}
                  onPress={() => openEdit(s)}
                >
                  <Feather name="more-horizontal" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>
            ))
          )}
          </GlassCard>
        </PageMotion>
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSortOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort Students</Text>
            <View style={styles.sortOptions}>
              {(
                [
                  "none",
                  "name-asc",
                  "name-desc",
                  "score-asc",
                  "score-desc",
                ] as SortOption[]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    setSortOption(opt);
                    setSortOpen(false);
                  }}
                  style={[
                    styles.sortOpt,
                    sortOption === opt && {
                      backgroundColor: headerColor + "10",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortOptText,
                      sortOption === opt && {
                        color: headerColor,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {opt === "none"
                      ? "Default Order"
                      : opt === "name-asc"
                        ? "Name A-Z"
                        : opt === "name-desc"
                          ? "Name Z-A"
                          : opt === "score-asc"
                            ? "Lowest First"
                            : "Highest First"}
                  </Text>
                  {sortOption === opt && (
                    <Feather name="check" size={16} color={headerColor} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={exportOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExportOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setExportOpen(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Export Data</Text>
              <TouchableOpacity onPress={() => setExportOpen(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Select a format to download the score sheet.
            </Text>

            <View style={styles.exportList}>
              {[".CSV", ".PDF", ".XLSX"].map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  style={styles.exportItem}
                  onPress={() => {
                    setExportOpen(false);
                    setTimeout(() => setExportDone(fmt as any), 200);
                  }}
                >
                  <Feather name="file" size={18} color="#666" />
                  <Text style={styles.exportItemText}>{fmt} Document</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Done */}
      <Modal visible={exportDone !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, { alignItems: "center", padding: 30 }]}
          >
            <View style={[styles.successIcon, { backgroundColor: "#f0fdf4" }]}>
              <Feather name="check" size={32} color="#00b679" />
            </View>
            <Text style={styles.successTitle}>Export Complete</Text>
            <Text style={styles.successSub}>
              Your {exportDone} file has been generated.
            </Text>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: "#00b679" }]}
              onPress={() => setExportDone(null)}
            >
              <Text style={styles.modalActionText}>View File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Score Modal */}
      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setEditOpen(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Manage Score</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.inpGroup}>
              <Text style={styles.inpLab}>Student Name</Text>
              <View style={styles.inpBoxDisabled}>
                <Text style={styles.inpBoxDisabledText}>{tempName}</Text>
              </View>
            </View>

            <View style={styles.inpGroup}>
              <Text style={styles.inpLab}>Score</Text>
              <TextInput
                value={tempScore}
                onChangeText={setTempScore}
                keyboardType="number-pad"
                placeholder="0"
                style={styles.inpBox}
                autoFocus
                placeholderTextColor="#bbb"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modalActionBtn,
                { backgroundColor: headerColor },
                saving && { opacity: 0.7 },
              ]}
              onPress={saveEdit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalActionText}>Update Student Score</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Missing Modal */}
      <Modal
        visible={missingOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMissingOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setMissingOpen(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Missing Scores</Text>
              <TouchableOpacity onPress={() => setMissingOpen(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350, marginTop: 10 }}>
              {missingStudents.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.missRow}
                  onPress={() => openCameraFor(s)}
                >
                  <View style={styles.missInfo}>
                    <Text style={styles.missName}>{s.name}</Text>
                    <Text style={styles.missSub}>Pending grading</Text>
                  </View>
                  <View style={styles.missIcon}>
                    <Feather name="camera" size={16} color="#6c63ff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI DETAILS MODAL */}
      <Modal
        visible={aiDetailsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAiDetailsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setAiDetailsOpen(false)}
          />
          <View style={[styles.modalCard, { maxHeight: "80%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Grading Report</Text>
                <Text style={styles.modalSub}>{aiTarget?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setAiDetailsOpen(false)}>
                <Feather name="x" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.aiStatsRow}>
                <View style={styles.aiStatItem}>
                  <Text style={styles.aiStatLabel}>CONFIDENCE</Text>
                  <Text
                    style={[
                      styles.aiStatValue,
                      {
                        color:
                          (aiTarget?.confidenceScore || 0) > 80
                            ? "#00b679"
                            : "#f97316",
                      },
                    ]}
                  >
                    {aiTarget?.confidenceScore}%
                  </Text>
                </View>
                <View style={styles.aiStatItem}>
                  <Text style={styles.aiStatLabel}>LEGIBILITY</Text>
                  <Text style={styles.aiStatValue}>
                    {aiTarget?.legibility || "N/A"}
                  </Text>
                </View>
                <View style={styles.aiStatItem}>
                  <Text style={styles.aiStatLabel}>SCORE</Text>
                  <Text style={[styles.aiStatValue, { color: headerColor }]}>
                    {aiTarget?.score}/{aiTarget?.total ?? "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>
                  <Feather name="activity" size={14} color="#666" />{" "}
                  Verification Log
                </Text>
                <View style={styles.reportBox}>
                  <Text style={styles.reportText}>
                    {aiTarget?.verificationLog ||
                      "No verification data available."}
                  </Text>
                </View>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>
                  <Feather name="file-text" size={14} color="#666" />{" "}
                  Transcription
                </Text>
                <View
                  style={[styles.reportBox, { backgroundColor: "#fdfdfd" }]}
                >
                  <Text style={[styles.reportText, { fontStyle: "italic" }]}>
                    {aiTarget?.transcribedText || "No transcription available."}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalActionBtn,
                { backgroundColor: headerColor, marginTop: 20 },
              ]}
              onPress={() => setAiDetailsOpen(false)}
            >
              <Text style={styles.modalActionText}>Close Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 45,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: {
    color: "#fff",
    fontSize: 11,
    opacity: 0.8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  content: { padding: 20, paddingBottom: 150 },
  statsGrid: { flexDirection: "row", gap: 15, marginBottom: 20 },
  statWidget: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#edf1f6",
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statVal: { fontSize: 24, fontWeight: "800", color: "#111" },
  statLab: { fontSize: 12, color: "#999", marginTop: 2, fontWeight: "600" },

  progressCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    marginBottom: 25,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  progressTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  progressVal: { fontSize: 18, fontWeight: "800", color: "#111" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  missingBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "#fff8f8",
    padding: 8,
    borderRadius: 10,
  },
  missingBadgeText: {
    fontSize: 12,
    color: "#ff3b30",
    fontWeight: "700",
    marginLeft: 8,
  },

  toolbar: { flexDirection: "row", gap: 10, marginBottom: 20 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 48,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  searchInp: { flex: 1, marginLeft: 10, fontSize: 14, color: "#111" },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 15,
    borderRadius: 14,
    height: 48,
    elevation: 1,
  },
  filterText: { marginLeft: 8, fontSize: 13, fontWeight: "700", color: "#444" },

  listSection: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: "#edf1f6",
  },
  listHeader: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headCell: {
    fontSize: 10,
    fontWeight: "800",
    color: "#bbb",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8",
  },
  rowName: { fontSize: 14, fontWeight: "700", color: "#333" },
  rowScore: { fontSize: 16, fontWeight: "800" },
  captureBtn: { backgroundColor: "#f0f0ff", padding: 8, borderRadius: 8 },
  proofBtn: { padding: 8 },
  emptyMsg: { textAlign: "center", padding: 40, color: "#999", fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 25,
  },
  modalCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  modalSub: { fontSize: 14, color: "#888", marginTop: 8, marginBottom: 20 },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  inpGroup: { marginBottom: 20 },
  inpLab: {
    fontSize: 11,
    fontWeight: "800",
    color: "#bbb",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inpBox: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 14,
    fontSize: 16,
    color: "#111",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  inpBoxDisabled: { backgroundColor: "#f0f0f0", padding: 15, borderRadius: 14 },
  inpBoxDisabledText: { fontSize: 15, color: "#999", fontWeight: "600" },
  modalActionBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  modalActionText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  sortOptions: { marginTop: 10 },
  sortOpt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
    marginBottom: 5,
  },
  sortOptText: { fontSize: 15, color: "#444", fontWeight: "600" },

  exportList: { gap: 10 },
  exportItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  exportItemText: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
  },

  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
  },

  missRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    marginBottom: 10,
  },
  missInfo: { flex: 1 },
  missName: { fontSize: 15, fontWeight: "700", color: "#111" },
  missSub: { fontSize: 12, color: "#999", marginTop: 2 },
  missIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f0ff",
    justifyContent: "center",
    alignItems: "center",
  },

  // --- NEW AI STYLES ---
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  aiStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8faf9",
    borderRadius: 16,
    padding: 15,
    marginBottom: 25,
  },
  aiStatItem: {
    alignItems: "center",
    flex: 1,
  },
  aiStatLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aiStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#333",
  },
  reportSection: {
    marginBottom: 20,
  },
  reportSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  reportBox: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reportText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
});
