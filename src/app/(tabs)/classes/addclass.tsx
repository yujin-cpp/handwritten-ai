import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { createClass } from "../../../services/class.service";
import { showAlert } from "../../../utils/alert";

const YEARS = ["A.Y. 2025 - 2026", "A.Y. 2026 - 2027", "A.Y. 2027 - 2028"];
const SWATCHES = [
  "#BB73E0", "#EE89B0", "#AFC1FF", "#07C86F",
  "#F4F7C3", "#E9C7F0", "#CFF2FF", "#DFF0C7",
  "#FDE3E8", "#C39FE7", "#D9A9D5", "#F6D8B2",
  "#D7F2D9", "#BBE8FF", "#F7E5FF", "#FFD4E0",
];

export default function AddClass() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState(YEARS[0]);
  const [theme, setTheme] = useState<string>(SWATCHES[0]);
  const [themeModal, setThemeModal] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onCreate() {
    if (!name || !section) {
      showAlert("Missing Info", "Please fill in class name and section.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      showAlert("Error", "You must be logged in.");
      return;
    }

    try {
      setLoading(true);
      const newClassId = await createClass(uid, {
        className: name,
        section: section,
        semester: year,
        themeColor: theme,
      });

      router.replace({
        pathname: "/(tabs)/classes/classinformation",
        params: {
          classId: newClassId,
          name: name,
          section: section,
          color: theme,
          academicYear: year,
        },
      });

    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#00b679", "#009e60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Class</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Introduction to AI"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Section / Block</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BSCS 4A"
              value={section}
              onChangeText={setSection}
              placeholderTextColor="#999"
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

        <View style={[styles.card, { marginTop: 20 }]}>
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

        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.7 }]}
          onPress={onCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.createText}>Create Class</Text>
              <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={themeModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
          <LinearGradient
            colors={["#00b679", "#009e60"]}
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
  page: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { paddingHorizontal: 18, paddingBottom: 20, flexDirection: "row", alignItems: "center" },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 20, flex: 1 },

  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
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
    backgroundColor: '#fff',
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

  createBtn: {
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
  createText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  themeGrid: { padding: 25, flexDirection: "row", flexWrap: "wrap", gap: 15, justifyContent: "space-between" },
  themeSwatch: { width: "22%", aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 5, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },

  modalFooter: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  modalCloseBtn: { paddingVertical: 15, alignItems: 'center' },
  modalCloseText: { color: "#ff3b30", fontWeight: "600", fontSize: 16 },
});
