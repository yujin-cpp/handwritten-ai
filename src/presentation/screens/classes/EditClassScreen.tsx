import React, { useState } from "react";
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
  Dimensions,
  PanResponder,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { classRepository } from "../../../data/repositories/FirebaseClassRepository";
import { useAuthSession } from "../../../hooks/useAuthSession";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor } from "../../../utils/colorUtils";

const YEARS = ["A.Y. 2025 - 2026", "A.Y. 2026 - 2027", "A.Y. 2027 - 2028"];
const SWATCHES = [
  "#00C897", "#1CB38E", "#D096EF", "#A3CEFE", "#FCFF7E",
  "#A855F7", "#0EA5E9", "#65A30D", "#E11D48", "#7C3AED",
  "#C026D3", "#EA580C", "#16A34A", "#0284C7", "#8B5CF6", "#DB2777"
];

export const EditClassScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { uid } = useAuthSession();

  const getParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value || "";

  const classId = getParam(params.classId);
  const [name, setName] = useState(getParam(params.name));
  const [section, setSection] = useState(getParam(params.section));
  const [year, setYear] = useState(getParam(params.academicYear) || YEARS[0]);
  const [theme, setTheme] = useState(getParam(params.color) || SWATCHES[0]);

  const [themeModal, setThemeModal] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sliderWidth = Dimensions.get("window").width - 80;

  const colorSliderResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const h = Math.max(0, Math.min(360, (x / sliderWidth) * 360));
        setTheme(`hsl(${Math.round(h)}, 70%, 50%)`);
      },
      onPanResponderMove: (e, gestureState) => {
        let x = gestureState.moveX - 40; // Subtract padding Left
        x = Math.max(0, Math.min(sliderWidth, x));
        const h = (x / sliderWidth) * 360;
        setTheme(`hsl(${Math.round(h)}, 70%, 50%)`);
      },
    })
  ).current;

  const handleSave = async () => {
    if (!name || !section) {
      showAlert("Missing Info", "Please fill in class name and section.");
      return;
    }

    if (!uid || !classId) {
      showAlert("Error", "User or Class not found.");
      return;
    }

    try {
      setLoading(true);
      await classRepository.updateClass(uid, classId, {
        className: name,
        section: section,
        semester: year,
        themeColor: theme
      });
      safeGoBack(router);
    } catch {
      showAlert("Error", "Failed to update class.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Class</Text>
        <View style={{ width: 40 }} />
      </View>

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
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Section / Block</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BSCS 4A"
              value={section}
              onChangeText={setSection}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Year</Text>
            <Pressable style={styles.selectInput} onPress={() => setYearOpen(!yearOpen)}>
              <Text style={{ color: colors.text, fontFamily: typography.fontFamily.medium }}>{year}</Text>
              <Feather name={yearOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
            </Pressable>

            {yearOpen && (
              <View style={styles.yearDropdown}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearOption, year === y && styles.yearOptionSelected]}
                    onPress={() => { setYear(y); setYearOpen(false); }}
                  >
                    <Text style={[styles.yearOptionText, year === y && { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>{y}</Text>
                    {year === y && <Feather name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.label}>Class Theme Color</Text>

          <View style={styles.swatchRow}>
            {SWATCHES.slice(0, 5).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.swatch, { backgroundColor: s }]}
                onPress={() => setTheme(s)}
              >
                {theme === s && <Feather name="check" size={20} color={colors.white} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.moreColorsBtn} onPress={() => setThemeModal(true)}>
              <Feather name="plus" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtnAction, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.saveTextAction}>Save Changes</Text>
              <Feather name="check-circle" size={18} color={colors.white} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={themeModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.header, { paddingTop: insets.top + 20, borderBottomWidth: 1, borderBottomColor: colors.grayLight }]}>
            <TouchableOpacity onPress={() => setThemeModal(false)} style={styles.backBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Theme</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.themeGrid}>
            <View style={styles.previewBox}>
              <View style={[styles.previewColor, { backgroundColor: theme }]} />
              <Text style={styles.previewText}>Dynamic Color Preview</Text>
            </View>

            <View style={styles.sliderContainer} {...colorSliderResponder.panHandlers}>
              <LinearGradient
                colors={["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.colorSlider}
              />
              <Text style={styles.sliderHint}>Slide or tap to select a color</Text>
            </View>

            <Text style={styles.orText}>Or pick a preset:</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "flex-start" }}>
              {SWATCHES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.themeSwatch, { backgroundColor: s }]}
                  onPress={() => { setTheme(s); setThemeModal(false); }}
                >
                  {theme === s && <Feather name="check" size={24} color={colors.white} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={() => setThemeModal(false)}>
              <Text style={styles.doneBtnText}>Confirm Color</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: 18 },
  content: { padding: 20, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 24, marginBottom: 20, ...shadows.soft },
  sectionTitle: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.grayLight, borderWidth: 1, borderColor: colors.grayLight, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: typography.fontFamily.medium, color: colors.text },
  selectInput: { backgroundColor: colors.grayLight, borderWidth: 1, borderColor: colors.grayLight, borderRadius: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  yearDropdown: { marginTop: 8, backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden', ...shadows.medium },
  yearOption: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  yearOptionSelected: { backgroundColor: 'rgba(0, 200, 151, 0.1)' },
  yearOptionText: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text },
  swatchRow: { flexDirection: "row", gap: 12, marginTop: 5, alignItems: "center", flexWrap: "wrap" },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  moreColorsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.grayLight, alignItems: "center", justifyContent: "center" },
  saveBtnAction: { marginTop: 20, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: "center", justifyContent: 'center', ...shadows.soft },
  saveTextAction: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  themeGrid: { padding: 20, paddingBottom: 60 },
  themeSwatch: { width: "20%", aspectRatio: 1, borderRadius: 16, justifyContent: "center", alignItems: "center", ...shadows.soft },
  previewBox: { alignItems: "center", marginBottom: 32 },
  previewColor: { width: 100, height: 100, borderRadius: 50, ...shadows.medium, marginBottom: 16 },
  previewText: { fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  sliderContainer: { height: 40, justifyContent: "center", marginBottom: 40, paddingHorizontal: 20 },
  colorSlider: { height: 16, borderRadius: 8, width: "100%" },
  sliderHint: { position: "absolute", bottom: -24, left: 20, right: 20, textAlign: "center", fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily.medium },
  orText: { fontFamily: typography.fontFamily.bold, color: colors.text, marginBottom: 16, fontSize: 16 },
  doneBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: "center", marginTop: 40, ...shadows.soft },
  doneBtnText: { color: colors.white, fontSize: 16, fontFamily: typography.fontFamily.bold }
});
