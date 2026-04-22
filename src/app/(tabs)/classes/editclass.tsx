import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { GlassCard } from "../../../components/GlassCard";
import { PageMotion } from "../../../components/PageMotion";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../../firebase/firebaseConfig";
import { updateClass } from "../../../services/class.service";
import { showAlert } from "../../../utils/alert";

const YEARS = ["A.Y. 2025 - 2026", "A.Y. 2026 - 2027", "A.Y. 2027 - 2028"];
const SWATCHES = [
  "#9B4DCA", "#D63384", "#7B8CDE", "#059669",
  "#B8A820", "#A855F7", "#0EA5E9", "#65A30D",
  "#E11D48", "#7C3AED", "#C026D3", "#EA580C",
  "#16A34A", "#0284C7", "#8B5CF6", "#DB2777",
];

export default function EditClass() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const getParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value || "";

  const classId = getParam(params.classId);
  const [name, setName] = useState(getParam(params.name));
  const [section, setSection] = useState(getParam(params.section));
  const [year, setYear] = useState(getParam(params.academicYear) || YEARS[0]);
  const [theme, setTheme] = useState(getParam(params.color) || SWATCHES[0]);

  const [themeModal, setThemeModal] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSave() {
    if (!name || !section) {
      showAlert("Missing Info", "Please fill in class name and section.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || !classId) {
      showAlert("Error", "User or Class not found.");
      return;
    }

    try {
      setLoading(true);
      await updateClass(uid, classId, {
        className: name,
        section: section,
        semester: year,
        themeColor: theme
      });
      router.back();
    } catch {
      showAlert("Error", "Failed to update class.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#0EA47A", "#017EBA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Class</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageMotion delay={50}>
        <GlassCard>
          <View style={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Introduction to AI"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Section / Block</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BSCS 4A"
              value={section}
              onChangeText={setSection}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Year</Text>
            <Pressable style={styles.selectInput} onPress={() => setYearOpen(!yearOpen)}>
              <Text style={{ color: year ? "#333" : "#999", fontWeight: '500' }}>{year}</Text>
              <Feather name={yearOpen ? "chevron-up" : "chevron-down"} size={18} color="#666" />
            </Pressable>

            {yearOpen && (
              <View style={styles.yearDropdown}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearOption, year === y && styles.yearOptionSelected]}
                    onPress={() => { setYear(y); setYearOpen(false); }}
                  >
                    <Text style={[styles.yearOptionText, year === y && { color: '#00b679', fontWeight: '700' }]}>{y}</Text>
                    {year === y && <Feather name="check" size={16} color="#00b679" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          </View>
        </GlassCard>
        </PageMotion>

        <PageMotion delay={100}>
        <GlassCard style={{ marginTop: 20 }}>
          <View style={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.label}>Class Theme Color</Text>

          <View style={styles.swatchRow}>
            {SWATCHES.slice(0, 4).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.swatch, { backgroundColor: s }]}
                onPress={() => setTheme(s)}
              >
                {theme === s && <Feather name="check" size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.moreColorsBtn} onPress={() => setThemeModal(true)}>
              <Feather name="plus" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          </View>
        </GlassCard>
        </PageMotion>

        <TouchableOpacity
          style={[styles.saveBtnAction, loading && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveTextAction}>Save Changes</Text>
              <Feather name="check-circle" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={themeModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "transparent" }}>
          <LinearGradient
            colors={["#0EA47A", "#017EBA"]}
            style={[styles.header, { paddingTop: insets.top + 20 }]}
          >
            <TouchableOpacity onPress={() => setThemeModal(false)} style={styles.backBtn}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Theme</Text>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.themeGrid}>
            {SWATCHES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.themeSwatch, { backgroundColor: s }]}
                onPress={() => { setTheme(s); setThemeModal(false); }}
              >
                {theme === s && <Feather name="check" size={24} color="#fff" />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setThemeModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },
  header: { paddingHorizontal: 18, paddingBottom: 45, flexDirection: "row", alignItems: "center" },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 20, flex: 1 },
  content: { padding: 20, paddingBottom: 150 },
  card: { backgroundColor: "rgba(255, 255, 255, 0.92)", borderRadius: 20, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#333",
  },
  selectInput: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearDropdown: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  yearOption: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  yearOptionSelected: { backgroundColor: '#f0fdf4' },
  yearOptionText: { fontSize: 14, color: '#444' },
  swatchRow: { flexDirection: "row", gap: 12, marginTop: 5, alignItems: "center" },
  swatch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  moreColorsBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  saveBtnAction: {
    marginTop: 35,
    backgroundColor: "#00b679",
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#00b679",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  saveTextAction: { color: "#fff", fontWeight: "700", fontSize: 16 },
  themeGrid: { padding: 25, flexDirection: "row", flexWrap: "wrap", gap: 15, justifyContent: "space-between" },
  themeSwatch: { width: "22%", aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 5, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  modalFooter: { padding: 20, backgroundColor: "rgba(255, 255, 255, 0.85)", borderTopWidth: 1, borderTopColor: '#eee' },
  modalCloseBtn: { paddingVertical: 15, alignItems: 'center' },
  modalCloseText: { color: "#ff3b30", fontWeight: "600", fontSize: 16 },
});
