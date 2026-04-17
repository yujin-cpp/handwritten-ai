import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import { showAlert, showConfirm } from "../../../utils/alert";

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { auth } from "../../../firebase/firebaseConfig";
import {
  addStudent,
  deleteStudent,
  listenToStudents,
  updateStudent
} from "../../../services/class.service";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : v ?? fb;

type Row = {
  id: string;
  name: string;
  studentId: string;
};

type SortKey = "NAME_ASC" | "NAME_DESC" | "ID_ASC" | "ID_DESC";

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Name A-Z", value: "NAME_ASC" },
  { label: "Name Z-A", value: "NAME_DESC" },
  { label: "Student ID Asc", value: "ID_ASC" },
  { label: "Student ID Desc", value: "ID_DESC" },
];

export default function MasterlistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const classId = P(params.classId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");

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
    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    const unsubscribe = listenToStudents(uid, classId, (data) => {
      setRows(data);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, [classId]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.studentId || "").toLowerCase().includes(q)
      );
    });

    list = [...list];
    switch (sortKey) {
      case "NAME_ASC": list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "NAME_DESC": list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "ID_ASC": list.sort((a, b) => a.studentId.localeCompare(b.studentId)); break;
      case "ID_DESC": list.sort((a, b) => b.studentId.localeCompare(a.studentId)); break;
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
        const csvRows = visibleRows.map(r => `"${r.name}","${r.studentId}"`).join("\n");
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
                      <td style="border: 1px solid #e2e8f0; padding: 10px;">${r.studentId}</td>
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
        const data = visibleRows.map(r => ({ Name: r.name, "Student ID": r.studentId }));
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
    setStudentUniId(student.studentId);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!studentName.trim() || !studentUniId.trim()) {
      showAlert("Missing Data", "Please fill in all student details.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    try {
      setSaveLoading(true);
      if (isEditing && editingId) {
        await updateStudent(uid, classId, editingId, { name: studentName, studentId: studentUniId });
      } else {
        await addStudent(uid, classId, { name: studentName, studentId: studentUniId });
      }
      setModalVisible(false);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      "Remove Student",
      "Are you sure you want to delete this student from the roster?",
      async () => {
        const uid = auth.currentUser?.uid;
        if (uid && classId) {
          try {
            await deleteStudent(uid, classId, id);
          } catch (error: any) {
            showAlert("Error", error.message);
          }
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>{section}</Text>
        </View>
        <TouchableOpacity onPress={() => setExportOpen(true)} style={styles.headerActionBtn}>
          <Feather name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.rosterHeader}>
          <View style={styles.rosterTitleBox}>
            <Text style={styles.rosterTitle}>Class Roster</Text>
            <View style={[styles.countBadge, { backgroundColor: headerColor + '15' }]}>
              <Text style={[styles.countText, { color: headerColor }]}>{rows.length} Students</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.addInlineBtn, { backgroundColor: headerColor }]} onPress={handleOpenAdd}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addInlineText}>Add Student</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color="#999" />
            <TextInput
              placeholder="Filter names..."
              placeholderTextColor="#bbb"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInp}
            />
          </View>

          <TouchableOpacity style={styles.filterBtn} onPress={() => setSortPickerOpen(true)}>
            <Feather name="sliders" size={16} color="#444" />
          </TouchableOpacity>
        </View>

        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headCell, { flex: 2 }]}>FULL NAME</Text>
            <Text style={[styles.headCell, { flex: 1.5 }]}>STUDENT ID</Text>
            <Text style={[styles.headCell, { width: 50 }]}></Text>
          </View>

          {dataLoading ? (
            <ActivityIndicator size="large" color={headerColor} style={{ marginTop: 50 }} />
          ) : visibleRows.length === 0 ? (
            <View style={styles.emptyTable}>
              <Feather name="users" size={40} color="#eee" />
              <Text style={styles.emptyTableText}>No students matched your filter.</Text>
            </View>
          ) : (
            visibleRows.map((r, idx) => (
              <View key={r.id} style={[styles.row, idx === visibleRows.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.rowId}>{r.studentId}</Text>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity onPress={() => handleOpenEdit(r)} style={styles.actionIcon}>
                    <Feather name="edit-3" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(r.id)} style={styles.actionIcon}>
                    <Feather name="trash-2" size={16} color="#ff3b30" />
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
                  style={[styles.sortItem, sortKey === opt.value && { backgroundColor: headerColor + '10' }]}
                  onPress={() => { setSortKey(opt.value); setSortPickerOpen(false); }}
                >
                  <Text style={[styles.sortItemText, sortKey === opt.value && { color: headerColor, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {sortKey === opt.value && <Feather name="check" size={16} color={headerColor} />}
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
              <Text style={styles.modalTitle}>{isEditing ? "Edit Student Details" : "Add New Student"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.inpGroup}>
              <Text style={styles.inpLab}>Full Name</Text>
              <TextInput
                style={styles.inpBox}
                placeholder="Dela Cruz, Juan"
                placeholderTextColor="#bbb"
                value={studentName}
                onChangeText={setStudentName}
                autoFocus
              />
            </View>

            <View style={styles.inpGroup}>
              <Text style={styles.inpLab}>Student Identification ID</Text>
              <TextInput
                style={styles.inpBox}
                placeholder="TUPM-24-XXXX"
                placeholderTextColor="#bbb"
                value={studentUniId}
                onChangeText={setStudentUniId}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: headerColor }, saveLoading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saveLoading}
            >
              {saveLoading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.modalActionText}>{isEditing ? "Update Student" : "Register Student"}</Text>
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
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodySub}>Select a file format to export the class list.</Text>

            {isExporting ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={headerColor} />
                <Text style={{ marginTop: 15, color: '#666' }}>Generating document...</Text>
              </View>
            ) : (
              <View style={styles.exportOptions}>
                {[".CSV", ".PDF", ".XLSX"].map((fmt) => (
                  <TouchableOpacity key={fmt} style={styles.exportOption} onPress={() => handleExport(fmt as any)}>
                    <View style={styles.exportIconBox}>
                      <Feather name="file" size={18} color="#666" />
                    </View>
                    <Text style={styles.exportOptionText}>{fmt} Document</Text>
                    <Feather name="arrow-right" size={16} color="#eee" />
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
          <View style={[styles.modalCard, { alignItems: 'center', padding: 30 }]}>
            <View style={styles.successIconBox}>
              <Feather name="check" size={32} color="#00b679" />
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  header: { paddingHorizontal: 20, paddingBottom: 25, flexDirection: "row", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: "#fff", fontSize: 11, opacity: 0.8, fontWeight: '700', textTransform: 'uppercase' },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  content: { padding: 20 },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  rosterTitleBox: {},
  rosterTitle: { fontSize: 24, fontWeight: '800', color: '#111' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 5, alignSelf: 'flex-start' },
  countText: { fontSize: 11, fontWeight: '800' },
  addInlineBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, gap: 8 },
  addInlineText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  toolbar: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 15, height: 50, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03 },
  searchInp: { flex: 1, marginLeft: 10, fontSize: 14, color: '#111' },
  filterBtn: { width: 50, height: 50, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 1 },

  tableSection: { backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#fafafa', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headCell: { fontSize: 10, fontWeight: '800', color: '#bbb', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  rowName: { fontSize: 15, fontWeight: '700', color: '#333' },
  rowId: { fontSize: 13, color: '#999', fontWeight: '500' },
  rowActions: { flexDirection: 'row', gap: 5 },
  actionIcon: { padding: 8 },
  emptyTable: { alignItems: 'center', padding: 50 },
  emptyTableText: { fontSize: 15, color: '#ccc', marginTop: 15, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 25 },
  modalCard: { backgroundColor: "#fff", borderRadius: 28, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  modalBodySub: { fontSize: 14, color: '#888', marginTop: -15, marginBottom: 20 },

  inpGroup: { marginBottom: 20 },
  inpLab: { fontSize: 11, fontWeight: '800', color: '#bbb', textTransform: 'uppercase', marginBottom: 8 },
  inpBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 16, fontSize: 16, color: '#111', borderWidth: 1, borderColor: '#f0f0f0' },
  modalActionBtn: { paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  modalActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  sortList: { gap: 8 },
  sortItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16 },
  sortItemText: { fontSize: 15, color: '#444', fontWeight: '600' },

  exportOptions: { gap: 12 },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#f9f9f9', borderRadius: 18, borderWidth: 1, borderColor: '#f0f0f0' },
  exportIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  exportOptionText: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '700', color: '#444' },

  successIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: '#888', marginBottom: 30 },
  doneBtn: { width: '100%', paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});