import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SECTIONS = ["BSCS-4B", "BSIT-4A", "BSECE-3A"];
const ACTIVITIES = ["Quiz No.1", "Quiz No.2", "Long Quiz No.1"];
const NAMES = [
  "Capuz, Prince Aaron",
  "Buenaflor, Sean Kurt",
  "Domingo, Princess Jade",
  "Elle, Clarise Mae",
  "Togonon, Francesca",
];

type PickerType = "section" | "activity" | "name" | null;

// helper for expo-router params
const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : v ?? fb;

export default function Capture() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // pull initial values from params (if called from quiz-score)
  const initialSection = P(params.section, SECTIONS[0]);
  const initialActivity = P(params.activity, ACTIVITIES[0]);
  const initialName = P(params.name, NAMES[0]);

  const [section, setSection] = useState(initialSection);
  const [activity, setActivity] = useState(initialActivity);
  const [name, setName] = useState(initialName);

  // if any param is passed, start in "confirmed" mode (read-only)
  const [confirmed, setConfirmed] = useState(
    !!params.section || !!params.activity || !!params.name
  );

  // popup picker state
  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [pickerY, setPickerY] = useState(0);

  // selected / uploaded image
  const [imageUri, setImageUri] = useState<string | null>(null);

  const isPickerOpen = pickerType !== null;

  const currentOptions =
    pickerType === "section"
      ? SECTIONS
      : pickerType === "activity"
      ? ACTIVITIES
      : pickerType === "name"
      ? NAMES
      : [];

  const currentValue =
    pickerType === "section"
      ? section
      : pickerType === "activity"
      ? activity
      : pickerType === "name"
      ? name
      : "";

  function handleSelectOption(value: string) {
    if (pickerType === "section") setSection(value);
    if (pickerType === "activity") setActivity(value);
    if (pickerType === "name") setName(value);
    setPickerType(null);
  }

  // ---- open gallery + pick photo ----
  const handlePickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri); // show in the camera box
    }
  };

  return (
    <View style={styles.page}>
      {/* HEADER */}
      <LinearGradient colors={["#00b679", "#009e60"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}  style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>AI scorer</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* FIELDS – editable (step 1) vs read-only (step 2) */}
        {!confirmed ? (
          <>
            {/* SECTION */}
            <Text style={styles.label}>Section:</Text>
            <Pressable
              style={styles.dropdownBtn}
              onPress={(e) => {
                setPickerY(e.nativeEvent.pageY);
                setPickerType("section");
              }}
            >
              <Text>{section}</Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>

            {/* ACTIVITY */}
            <Text style={styles.label}>Activity:</Text>
            <Pressable
              style={styles.dropdownBtn}
              onPress={(e) => {
                setPickerY(e.nativeEvent.pageY);
                setPickerType("activity");
              }}
            >
              <Text>{activity}</Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>

            {/* NAME */}
            <Text style={styles.label}>Name:</Text>
            <Pressable
              style={styles.dropdownBtn}
              onPress={(e) => {
                setPickerY(e.nativeEvent.pageY);
                setPickerType("name");
              }}
            >
              <Text>{name}</Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>
          </>
        ) : (
          <>
            {/* READ-ONLY TEXTS */}
            <View style={styles.readRow}>
              <Text style={styles.readLabel}>Section: </Text>
              <Text style={styles.readValue}>{section}</Text>
            </View>
            <View style={styles.readRow}>
              <Text style={styles.readLabel}>Activity: </Text>
              <Text style={styles.readValue}>{activity}</Text>
            </View>
            <View style={styles.readRow}>
              <Text style={styles.readLabel}>Name: </Text>
              <Text style={styles.readValue}>{name}</Text>
            </View>
          </>
        )}

        {/* CAMERA / IMAGE BOX */}
        <View style={[styles.cameraBox, confirmed && styles.cameraBoxFocused]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Ionicons name="camera-outline" size={120} color="#444" />
          )}
        </View>

        {/* NEXT BUTTON – only on step 1 */}
        {!confirmed && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => setConfirmed(true)}
          >
            <Text style={styles.nextText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#01B468" />
          </TouchableOpacity>
        )}

        {/* ACTION BUTTONS – only on step 2 */}
        {confirmed && (
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(tabs)/capture/photo-taking")}
            >
              <Text style={styles.actionText}>Take a picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickImage}
            >
              <Text style={styles.uploadText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* POPUP PICKER MODAL */}
      <Modal
        visible={isPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setPickerType(null)}
          />
          <View style={[styles.popup, { top: pickerY + 10 }]}>
            {currentOptions.map((opt) => {
              const selected = opt === currentValue;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleSelectOption(opt)}
                  style={[
                    styles.popupItem,
                    selected && styles.popupItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.popupItemText,
                      selected && styles.popupItemTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fff",
  },
  
  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 25,
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 },
 
  content: {
    padding: 18,
    paddingBottom: 80,
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: "700",
    color: "#0c6b45",
  },
  dropdownBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },

  // read-only labels
  readRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  readLabel: {
    fontWeight: "700",
    color: "#000",
  },
  readValue: {
    fontWeight: "500",
    color: "#605353",
  },

  cameraBox: {
    marginTop: 25,
    width: "100%",
    height: 240,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cameraBoxFocused: {
    borderWidth: 2,
    borderColor: "#01B468",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  nextBtn: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#01B468",
    paddingVertical: 14,
    borderRadius: 10,
  },
  nextText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },

  actionBtn: {
    borderWidth: 1,
    borderColor: "#01B468",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  actionText: {
    color: "#000",
    fontWeight: "700",
  },
  uploadBtn: {
    backgroundColor: "#CCFFE1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadText: {
    color: "#000",
    fontWeight: "700",
  },

  // popup modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  popup: {
    position: "absolute",
    left: 24,
    right: 24,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  popupItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  popupItemSelected: {
    backgroundColor: "#01B468",
  },
  popupItemText: {
    fontSize: 14,
    color: "#333",
  },
  popupItemTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
});
