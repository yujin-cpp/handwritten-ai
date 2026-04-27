import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { showAlert } from "../../../utils/alert";
import { studentRepository } from "../../../data/repositories/FirebaseStudentRepository";
import { safeGoBack } from "../../../utils/navigation";

// Quick Firebase import for direct updates
import { ref, update } from "firebase/database";
import { db } from "../../../firebase/firebaseConfig";
import { getContrastColor } from "../../../utils/colorUtils";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";

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
  objectiveScoreLog?: string; // added ito for rendering the objective score logs in the UI
  essayScoreLog?: string; // added ito || ||     ||       ||   subjective score ||  ||   ||
};

type SortOption =
  | "none"
  | "name-asc"
  | "name-desc"
  | "score-asc"
  | "score-desc";

export const QuizScoreScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);
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

  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<Student | null>(null);

  const [sortOpen, setSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("none");

  const [missingOpen, setMissingOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{
    title: string;
    lines: string[];
  } | null>(null);
  useEffect(() => {
    if (!uid || !classId || !activityId) return;

    const unsubscribe = studentRepository.listenToStudents(
      uid,
      classId,
      (data) => {
        const parsedStudents: Student[] = data.map((studentData) => {
          const activityRecord = studentData.activities?.[activityId];
          const imageList = Array.isArray(activityRecord?.images)
            ? activityRecord.images.filter(isRemoteProofUrl)
            : isRemoteProofUrl(activityRecord?.latestImage)
              ? [activityRecord.latestImage]
              : isRemoteProofUrl(activityRecord?.imageUri)
                ? [activityRecord.imageUri]
                : [];

          return {
            id: studentData.id,
            name: studentData.name,
            score: activityRecord?.score,
            total: activityRecord?.total,
            images: imageList,
            status: activityRecord?.status || "pending",
            confidenceScore: activityRecord?.confidenceScore,
            legibility: activityRecord?.legibility,
            verificationLog: activityRecord?.verificationLog,
            transcribedText: activityRecord?.transcribedText,
            objectiveScoreLog: activityRecord?.objectiveScoreLog, // ← add
            essayScoreLog: activityRecord?.essayScoreLog, // ← add
          };
        });

        setStudents(parsedStudents);
        setLoading(false);
      },
    );

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
        transcription: student.transcribedText || "",
        explanation: student.verificationLog || "",
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
    if (!editTarget || !uid) return;
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

  async function handleExport(format: "CSV" | "XLSX" | "PDF") {
    try {
      setExportOpen(false);
      const rows = students.map((s) => ({
        Name: s.name,
        Score: typeof s.score === "number" ? s.score : "N/A",
        Total: s.total ?? "N/A",
        Status: s.status || "pending",
        Confidence: s.confidenceScore ? `${s.confidenceScore}%` : "N/A",
      }));

      if (format === "CSV") {
        const header = "Name,Score,Total,Status,Confidence\n";
        const csv =
          header +
          rows
            .map(
              (r) =>
                `"${r.Name}",${r.Score},${r.Total},${r.Status},${r.Confidence}`,
            )
            .join("\n");
        const fileUri =
          FileSystem.documentDirectory +
          `${className}_${activityTitle}_Scores.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export CSV",
        });
      } else if (format === "XLSX") {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scores");
        const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        const fileUri =
          FileSystem.documentDirectory +
          `${className}_${activityTitle}_Scores.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Export Excel",
        });
      } else if (format === "PDF") {
        const dateStr = new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const html = `
          <html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1F2937; }
            .header { text-align: center; margin-bottom: 32px; border-bottom: 3px solid ${headerColor}; padding-bottom: 20px; }
            .title { font-size: 22px; font-weight: 700; margin: 0; color: ${headerColor}; }
            .subtitle { font-size: 14px; color: #6B7280; margin-top: 6px; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; color: #6B7280; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: ${headerColor}; color: #fff; padding: 12px 16px; text-align: left; font-weight: 600; }
            td { padding: 10px 16px; border-bottom: 1px solid #E5E7EB; }
            tr:nth-child(even) { background: #F9FAFB; }
            .score { font-weight: 700; font-size: 15px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
            .graded { background: #DEF7EC; color: #00b679; }
            .pending { background: #FEF3C7; color: #f59e0b; }
            .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9CA3AF; }
          </style></head><body>
            <div class="header">
              <p class="title">${className} — ${section}</p>
              <p class="subtitle">${activityTitle} Score Report</p>
            </div>
            <div class="meta">
              <span>Generated: ${dateStr}</span>
              <span>Total Students: ${students.length}</span>
            </div>
            <table>
              <tr><th>#</th><th>Student Name</th><th>Score</th><th>Total</th><th>Status</th><th>Confidence</th></tr>
              ${rows
                .map(
                  (r, i) => `<tr>
                <td>${i + 1}</td>
                <td>${r.Name}</td>
                <td class="score">${r.Score}</td>
                <td>${r.Total}</td>
                <td><span class="badge ${r.Status === "graded" ? "graded" : "pending"}">${r.Status}</span></td>
                <td>${r.Confidence}</td>
              </tr>`,
                )
                .join("")}
            </table>
            <div class="footer">Handwritten AI — Automated Grading System</div>
          </body></html>`;
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Export PDF",
        });
      }
    } catch (e: any) {
      showAlert("Export Error", e.message || "Failed to export.");
    }
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

  const headerTextColor = getContrastColor(headerColor);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { backgroundColor: headerColor, paddingTop: insets.top + 20 },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (params.fromCapture === "1") {
              router.replace("/(tabs)" as any);
            } else {
              safeGoBack(router);
            }
          }}
          style={styles.backBtn}
        >
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>
            {className} • {section}
          </Text>
          <Text
            style={[styles.headerBig, { color: headerTextColor }]}
            numberOfLines={1}
          >
            {activityTitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setExportOpen(true)}
          style={styles.headerActionBtn}
        >
          <Feather name="download" size={20} color={headerTextColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Widgets */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#f0fdf4" }]}>
              <Feather name="award" size={24} color="#00b679" />
            </View>
            <Text style={styles.statVal}>{highest}</Text>
            <Text style={styles.statLab}>Highest Score</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "#fff7ed" }]}>
              <Feather name="clock" size={24} color="#f97316" />
            </View>
            <Text style={styles.statVal}>{missingCount}</Text>
            <Text style={styles.statLab}>Pending Grades</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.progressCard}
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
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.missingBadgeText}>
                {missingStudents.length} students missing scores
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.grayLight}
                style={{ marginLeft: "auto" }}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Filter by name..."
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInp}
            />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setSortOpen(true)}
          >
            <Feather name="sliders" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Student List Table */}
        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
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
              style={{ padding: 40 }}
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
                      <Feather name="camera" size={18} color={colors.primary} />
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
                    <Feather
                      name="image"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* ai score logs */}
                <View style={{ width: 50, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => openAIDetails(s)}
                    disabled={!s.objectiveScoreLog && !s.essayScoreLog}
                    style={{
                      opacity:
                        !s.objectiveScoreLog && !s.essayScoreLog ? 0.2 : 1,
                    }}
                  >
                    <Feather
                      name="bar-chart-2"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={{ width: 50, alignItems: "center" }}
                  onPress={() => openEdit(s)}
                >
                  <Feather
                    name="more-horizontal"
                    size={24}
                    color={colors.grayLight}
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
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
                        fontFamily: typography.fontFamily.bold,
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
                    <Feather name="check" size={20} color={headerColor} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Missing Scores Modal */}
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
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350, marginTop: 16 }}>
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
                    <Feather name="camera" size={20} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
                <Feather name="x" size={24} color={colors.textSecondary} />
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
                placeholderTextColor={colors.textSecondary}
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
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalActionText}>Update Student Score</Text>
              )}
            </TouchableOpacity>
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
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Stats Row */}
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
              {/* Objective Score Log */}
              {aiTarget?.objectiveScoreLog &&
                (() => {
                  const sections: { title: string; lines: string[] }[] = [];
                  let current: { title: string; lines: string[] } | null = null;

                  aiTarget.objectiveScoreLog.split("\n").forEach((line) => {
                    const isSection =
                      line.startsWith("[") && line.endsWith("]");
                    if (isSection) {
                      if (current) sections.push(current);
                      current = { title: line, lines: [] };
                    } else if (current) {
                      current.lines.push(line);
                    }
                  });
                  if (current) sections.push(current);

                  return (
                    <View style={styles.reportSection}>
                      <Text style={styles.reportSectionTitle}>
                        📋 Objective Score Log
                      </Text>

                      {/* Section Chips */}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        {sections.map((section, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => setSelectedSection(section)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: colors.primary + "20",
                              borderWidth: 1,
                              borderColor: colors.primary,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontFamily: typography.fontFamily.medium,
                                fontSize: 13,
                              }}
                            >
                              {section.title.replace(/[\[\]]/g, "")}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Section Detail Modal */}
                      <Modal
                        visible={!!selectedSection}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setSelectedSection(null)}
                      >
                        <View style={styles.modalOverlay}>
                          <Pressable
                            style={StyleSheet.absoluteFillObject}
                            onPress={() => setSelectedSection(null)}
                          />
                          <View
                            style={[styles.modalCard, { maxHeight: "70%" }]}
                          >
                            <View style={styles.modalHeaderRow}>
                              <Text style={styles.modalTitle}>
                                {selectedSection?.title.replace(/[\[\]]/g, "")}
                              </Text>
                              <TouchableOpacity
                                onPress={() => setSelectedSection(null)}
                              >
                                <Feather
                                  name="x"
                                  size={22}
                                  color={colors.textSecondary}
                                />
                              </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                              <View style={styles.reportBox}>
                                {selectedSection?.lines.map((line, i) => {
                                  const isTotal =
                                    line.startsWith("TOTAL") ||
                                    line.startsWith("SECTION SCORE");
                                  const isDivider =
                                    line.startsWith("===") || line === "---";
                                  return (
                                    <Text
                                      key={i}
                                      style={[
                                        styles.reportText,
                                        isTotal && {
                                          color: colors.primary,
                                          fontFamily:
                                            typography.fontFamily.bold,
                                        },
                                        isDivider && {
                                          color: colors.grayLight,
                                          letterSpacing: 2,
                                        },
                                      ]}
                                    >
                                      {line}
                                    </Text>
                                  );
                                })}
                              </View>
                            </ScrollView>
                          </View>
                        </View>
                      </Modal>
                    </View>
                  );
                })()}

              {/* Essay Score Log */}
              {aiTarget?.essayScoreLog && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>
                    ✍️ Essay Score Log
                  </Text>
                  <View style={styles.reportBox}>
                    {aiTarget.essayScoreLog.split("\n").map((line, i) => {
                      const isCriterion = line.includes("→");
                      const isTotal = line.startsWith("TOTAL");
                      const isQuestion = line.startsWith("Question:");
                      const isReason = line.startsWith("Reason:");
                      const isDivider = line === "---";
                      return (
                        <Text
                          key={i}
                          style={[
                            styles.reportText,
                            isCriterion && {
                              color: "#00b679",
                              fontFamily: typography.fontFamily.medium,
                            },
                            isTotal && {
                              color: colors.primary,
                              fontFamily: typography.fontFamily.bold,
                            },
                            isQuestion && {
                              color: colors.text,
                              fontFamily: typography.fontFamily.bold,
                              marginTop: 8,
                            },
                            isReason && { fontStyle: "italic" },
                            isDivider && { color: colors.grayLight },
                          ]}
                        >
                          {line}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
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
              <View>
                <Text style={styles.modalTitle}>Export Scores</Text>
                <Text style={styles.modalSub}>
                  {activityTitle} • {students.length} students
                </Text>
              </View>
              <TouchableOpacity onPress={() => setExportOpen(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExport("CSV")}
            >
              <View
                style={[styles.exportIconBox, { backgroundColor: "#dcfce7" }]}
              >
                <Feather name="file-text" size={24} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>CSV Spreadsheet</Text>
                <Text style={styles.exportOptionSub}>
                  Comma-separated, opens in Excel/Google Sheets
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.grayLight}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExport("XLSX")}
            >
              <View
                style={[styles.exportIconBox, { backgroundColor: "#dbeafe" }]}
              >
                <Feather name="grid" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>Excel Workbook</Text>
                <Text style={styles.exportOptionSub}>
                  Native .xlsx format with formatting
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.grayLight}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExport("PDF")}
            >
              <View
                style={[styles.exportIconBox, { backgroundColor: "#fee2e2" }]}
              >
                <Feather name="printer" size={24} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>PDF Report</Text>
                <Text style={styles.exportOptionSub}>
                  Print-ready score report with branding
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.grayLight}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.medium,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: {
    color: colors.white,
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    textTransform: "uppercase",
    opacity: 0.9,
  },
  headerBig: {
    color: colors.white,
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 24, paddingBottom: 150 },
  statsGrid: { flexDirection: "row", gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    ...shadows.soft,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statVal: {
    fontSize: 24,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  statLab: {
    fontSize: 13,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...shadows.soft,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  progressVal: {
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.grayLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  missingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  missingBadgeText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.bold,
    color: colors.danger,
  },
  toolbar: { flexDirection: "row", gap: 12, marginBottom: 24 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    ...shadows.soft,
  },
  searchInp: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  filterBtn: {
    width: 56,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.soft,
  },
  tableSection: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: "hidden",
    ...shadows.medium,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.grayLight,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  headCell: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  rowName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  rowScore: { fontSize: 18, fontFamily: typography.fontFamily.bold },
  miniBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: { fontSize: 10, fontFamily: typography.fontFamily.bold },
  captureBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(108,99,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  proofBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyMsg: {
    padding: 40,
    textAlign: "center",
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    ...shadows.medium,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  modalSub: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sortOptions: { marginTop: 16, gap: 8 },
  sortOpt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  sortOptText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  missRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  missInfo: { flex: 1 },
  missName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  missSub: {
    fontSize: 13,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: 4,
  },
  missIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(108,99,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  inpGroup: { marginBottom: 20 },
  inpLab: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inpBoxDisabled: {
    backgroundColor: colors.grayLight,
    padding: 16,
    borderRadius: 16,
  },
  inpBoxDisabledText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  inpBox: {
    backgroundColor: colors.grayLight,
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  modalActionBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    ...shadows.soft,
  },
  modalActionText: {
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
  },
  aiStatsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  aiStatItem: {
    flex: 1,
    backgroundColor: colors.grayLight,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  aiStatLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  aiStatValue: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  reportSection: { marginBottom: 24 },
  reportSectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: 12,
    alignItems: "center",
  },
  reportBox: {
    backgroundColor: colors.grayLight,
    padding: 16,
    borderRadius: 16,
  },
  reportText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  exportIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  exportOptionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  exportOptionSub: {
    fontSize: 13,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
