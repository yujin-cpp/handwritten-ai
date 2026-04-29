import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import { studentRepository } from "../../../data/repositories/FirebaseStudentRepository";
import { showAlert, showConfirm } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor, getIconBoxColors } from "../../../utils/colorUtils";

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

type Row = { id: string; name: string; studentId: string };
type SortKey = "NAME_ASC" | "NAME_DESC" | "ID_ASC" | "ID_DESC";
const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Name A-Z", value: "NAME_ASC" },
  { label: "Name Z-A", value: "NAME_DESC" },
  { label: "Student ID Asc", value: "ID_ASC" },
  { label: "Student ID Desc", value: "ID_DESC" },
];

export const MasterlistViewSectionScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const classId = P(params.classId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, colors.primary);

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("NAME_ASC");
  const [sortPickerOpen, setSortPickerOpen] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportDone, setExportDone] = useState<null | ".CSV" | ".PDF" | ".XLSX">(null);
  const [isExporting, setIsExporting] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentUniId, setStudentUniId] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (!uid || !classId) return;

    const unsubscribe = studentRepository.listenToStudents(uid, classId, (data) => {
      setRows(data);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, [classId, uid]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (!q) return true;
      return (r.name || "").toLowerCase().includes(q) || (r.studentId || "").toLowerCase().includes(q);
    });

    list = [...list];
    switch (sortKey) {
      case "NAME_ASC": list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "NAME_DESC": list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "ID_ASC": list.sort((a, b) => (a.studentId || "").localeCompare(b.studentId || "")); break;
      case "ID_DESC": list.sort((a, b) => (b.studentId || "").localeCompare(a.studentId || "")); break;
    }
    return list;
  }, [rows, query, sortKey]);

  const handleExport = async (format: ".CSV" | ".PDF" | ".XLSX") => {
    try {
      if (visibleRows.length === 0) {
        showAlert("No Data", "There are no students to export.");
        return;
      }
      setIsExporting(true);
      const fileName = `${className}_${section}_Roster`;

      if (format === ".CSV") {
        const header = "Name,Student ID\n";
        const csvRows = visibleRows.map(r => `"${r.name}","${r.studentId || ""}"`).join("\n");
        const csvContent = header + csvRows;

        if (Platform.OS === "web") {
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          console.warn('CSV Export not optimized for mobile sharing yet');
        }
        setExportDone(".CSV");
      } else if (format === ".PDF") {
        const html = `
          <html>
            <body style="font-family: sans-serif; padding: 40px;">
              <h1 style="text-align: center;">${className}</h1>
              <p style="text-align: center;">Section: ${section} | Student Roster</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">#</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Full Name</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left;">Student ID</th>
                  </tr>
                </thead>
                <tbody>
                  ${visibleRows.map((r, i) => `
                    <tr>
                      <td style="border: 1px solid #e2e8f0; padding: 10px;">${i + 1}</td>
                      <td style="border: 1px solid #e2e8f0; padding: 10px;">${r.name}</td>
                      <td style="border: 1px solid #e2e8f0; padding: 10px;">${r.studentId || ""}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </body>
          </html>
        `;
        const pdf = await Print.printToFileAsync({ html });
        if (Platform.OS === "web") {
          const link = document.createElement("a");
          link.href = pdf.uri;
          link.download = `${fileName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          await Sharing.shareAsync(pdf.uri);
        }
        setExportDone(".PDF");
      } else if (format === ".XLSX") {
        const data = visibleRows.map(r => ({ Name: r.name, "Student ID": r.studentId || "" }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Masterlist");
        if (Platform.OS === "web") {
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setExportDone(".XLSX");
      }
    } catch (error) {
      console.error("Export Error:", error);
      showAlert("Export Failed", "Could not generate the file.");
    } finally {
      setIsExporting(false);
      setExportOpen(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setStudentName("");
    setStudentUniId("");
    setModalVisible(true);
  };

  const handleOpenEdit = (student: Row) => {
    setIsEditing(true);
    setEditingId(student.id);
    setStudentName(student.name);
    setStudentUniId(student.studentId || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!studentName.trim() || !studentUniId.trim()) {
      showAlert("Missing Data", "Please fill in all student details.");
      return;
    }
    if (!uid || !classId) return;

    try {
      setSaveLoading(true);
      if (isEditing && editingId) {
        await studentRepository.updateStudent(uid, classId, editingId, { name: studentName, studentId: studentUniId });
      } else {
        await studentRepository.addStudent(uid, classId, { name: studentName, studentId: studentUniId });
      }
      setModalVisible(false);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm("Remove Student", "Are you sure you want to delete this student from the roster?", async () => {
      if (uid && classId) {
        try {
          await studentRepository.deleteStudent(uid, classId, id);
        } catch (error: any) {
          showAlert("Error", error.message);
        }
      }
    });
  };

  const headerTextColor = getContrastColor(headerColor);
  const { bg: iconBg, icon: iconFg } = getIconBoxColors(headerColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>{className}</Text>
          <Text style={[styles.headerBig, { color: headerTextColor }]} numberOfLines={1}>{section}</Text>
        </View>
        <TouchableOpacity onPress={() => setExportOpen(true)} style={styles.headerActionBtn}>
          <Feather name="download" size={20} color={headerTextColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.rosterHeader}>
          <View>
            <Text style={styles.rosterTitle}>Class Roster</Text>
            <View style={[styles.countBadge, { backgroundColor: iconBg }]}>
              <Text style={[styles.countText, { color: iconFg }]}>{rows.length} Students</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.addInlineBtn, { backgroundColor: headerColor }]} onPress={handleOpenAdd}>
            <Feather name="plus" size={18} color={colors.white} />
            <Text style={styles.addInlineText}>Add Student</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder="Filter names..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInp}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setSortPickerOpen(true)}>
            <Feather name="sliders" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headCell, { flex: 2 }]}>FULL NAME</Text>
            <Text style={[styles.headCell, { flex: 1.5 }]}>STUDENT ID</Text>
            <Text style={[styles.headCell, { width: 50 }]}></Text>
          </View>

          {dataLoading ? (
            <ActivityIndicator size="large" color={headerColor} style={{ padding: 50 }} />
          ) : visibleRows.length === 0 ? (
            <View style={styles.emptyTable}>
              <Feather name="users" size={40} color={colors.grayLight} />
              <Text style={styles.emptyTableText}>No students matched your filter.</Text>
            </View>
          ) : (
            visibleRows.map((r, idx) => (
              <View key={`${r.id || r.studentId || "student"}-${idx}`} style={[styles.row, idx === visibleRows.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.rowId}>{r.studentId || "N/A"}</Text>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity onPress={() => handleOpenEdit(r)} style={styles.actionIcon}>
                    <Feather name="edit-3" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(r.id)} style={styles.actionIcon}>
                    <Feather name="trash-2" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sort Modal */}
      <Modal visible={sortPickerOpen} transparent animationType="fade" onRequestClose={() => setSortPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSortPickerOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort Roster</Text>
            <View style={styles.sortList}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortItem, sortKey === opt.value && { backgroundColor: iconBg }]}
                  onPress={() => { setSortKey(opt.value); setSortPickerOpen(false); }}
                >
                  <Text style={[styles.sortItemText, sortKey === opt.value && { color: headerColor, fontFamily: typography.fontFamily.bold }]}>
                    {opt.label}
                  </Text>
                  {sortKey === opt.value && <Feather name="check" size={18} color={headerColor} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{isEditing ? "Edit Student" : "Add Student"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inpGroup}>
              <Text style={styles.inpLab}>Full Name</Text>
              <TextInput
                style={styles.inpBox}
                placeholder="Dela Cruz, Juan"
                placeholderTextColor={colors.textSecondary}
                value={studentName}
                onChangeText={setStudentName}
                autoFocus
              />
            </View>

            <View style={styles.inpGroup}>
              <Text style={styles.inpLab}>Student ID</Text>
              <TextInput
                style={styles.inpBox}
                placeholder="TUPM-24-XXXX"
                placeholderTextColor={colors.textSecondary}
                value={studentUniId}
                onChangeText={setStudentUniId}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: headerColor }, saveLoading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saveLoading}
            >
              {saveLoading ? <ActivityIndicator color={colors.white} /> : (
                <Text style={styles.modalActionText}>{isEditing ? "Update" : "Register"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={exportOpen} transparent animationType="fade" onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setExportOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Download Roster</Text>
              <TouchableOpacity onPress={() => setExportOpen(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodySub}>Select a file format to export the class list.</Text>

            {isExporting ? (
              <View style={{ padding: 30, alignItems: "center" }}>
                <ActivityIndicator size="large" color={headerColor} />
                <Text style={{ marginTop: 15, color: colors.textSecondary, fontFamily: typography.fontFamily.medium }}>Generating document...</Text>
              </View>
            ) : (
              <View style={styles.exportOptions}>
                {[".CSV", ".PDF", ".XLSX"].map((fmt) => (
                  <TouchableOpacity key={fmt} style={styles.exportOption} onPress={() => handleExport(fmt as any)}>
                    <View style={styles.exportIconBox}>
                      <Feather name="file" size={20} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.exportOptionText}>{fmt} Document</Text>
                    <Feather name="arrow-right" size={20} color={colors.grayLight} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Export Success */}
      <Modal visible={exportDone !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: "center", padding: 30 }]}>
            <View style={styles.successIconBox}>
              <Feather name="check" size={32} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>Export Success</Text>
            <Text style={styles.successSubtitle}>Your {exportDone} roster is ready.</Text>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: headerColor }]} onPress={() => setExportDone(null)}>
              <Text style={styles.doneBtnText}>Return to List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", ...shadows.medium },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: colors.white, fontSize: 11, fontFamily: typography.fontFamily.bold, textTransform: "uppercase", opacity: 0.9 },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  headerActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingBottom: 150 },
  rosterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  rosterTitle: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text },
  countBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 6, alignSelf: "flex-start" },
  countText: { fontSize: 12, fontFamily: typography.fontFamily.bold },
  addInlineBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 8, ...shadows.soft },
  addInlineText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 14 },
  toolbar: { flexDirection: "row", gap: 12, marginBottom: 24 },
  searchContainer: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 16, height: 56, ...shadows.soft },
  searchInp: { flex: 1, marginLeft: 12, fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text },
  filterBtn: { width: 56, height: 56, backgroundColor: colors.white, borderRadius: 16, justifyContent: "center", alignItems: "center", ...shadows.soft },
  tableSection: { backgroundColor: colors.white, borderRadius: 24, overflow: "hidden", ...shadows.medium },
  tableHeader: { flexDirection: "row", backgroundColor: colors.grayLight, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  headCell: { fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  rowName: { fontSize: 15, fontFamily: typography.fontFamily.bold, color: colors.text },
  rowId: { fontSize: 13, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  rowActions: { flexDirection: "row", gap: 8 },
  actionIcon: { padding: 8 },
  emptyTable: { alignItems: "center", padding: 60 },
  emptyTableText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.medium },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontFamily: typography.fontFamily.bold, color: colors.text },
  modalBodySub: { fontSize: 14, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginTop: -16, marginBottom: 24 },
  inpGroup: { marginBottom: 20 },
  inpLab: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: "uppercase", marginBottom: 8 },
  inpBox: { backgroundColor: colors.grayLight, padding: 16, borderRadius: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text },
  modalActionBtn: { paddingVertical: 18, borderRadius: 16, alignItems: "center", marginTop: 16, ...shadows.soft },
  modalActionText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  sortList: { gap: 12 },
  sortItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, borderRadius: 16 },
  sortItemText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text },
  exportOptions: { gap: 12 },
  exportOption: { flexDirection: "row", alignItems: "center", padding: 18, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.grayLight },
  exportIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.grayLight, justifyContent: "center", alignItems: "center" },
  exportOptionText: { flex: 1, marginLeft: 16, fontSize: 15, fontFamily: typography.fontFamily.bold, color: colors.text },
  successIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(0, 200, 151, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 8 },
  successSubtitle: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.textSecondary, marginBottom: 32 },
  doneBtn: { width: "100%", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  doneBtnText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
});
