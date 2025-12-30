// app/(tabs)/classes/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ClassItem = {
  id: string;
  name: string;
  section: string;
  color: string;
};

const INITIAL: ClassItem[] = [
  { id: "1", name: "BSCS-4B", section: "GEM14-M", color: "#BB73E0" },
  { id: "2", name: "BSIT-4A", section: "GEM14-M", color: "#EE89B0" },
  { id: "3", name: "BSECE-3A", section: "GEM14-M", color: "#AEBAF8" },
];

export default function ClassesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ClassItem[]>(INITIAL);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmVisible, setConfirmVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const anySelected = selected.size > 0;
  const selectedNames = useMemo(
    () => items.filter(i => selected.has(i.id)).map(i => i.name).join(", "),
    [selected, items]
  );

  function toggleEdit() {
    if (editMode) setSelected(new Set());
    setEditMode(!editMode);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDeleteConfirmed() {
    setItems(prev => prev.filter(i => !selected.has(i.id)));
    setSelected(new Set());
    setConfirmVisible(false);
    setEditMode(false);
  }

  return (
    <View style={styles.page}>
      {/* Header */}
      <LinearGradient colors={["#00b679", "#009e60"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20}]}>

        <Text style={styles.headerTitle}>Class List</Text>

        {editMode ? (
          <TouchableOpacity onPress={toggleEdit} style={[styles.pill, styles.pillDone]}>
            <Text style={[styles.pillText, { color: "#fff" }]}>Done</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={toggleEdit} style={styles.pill}>
            <Text style={styles.pillText}>Edit</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {items.map(item => (
          <Pressable
            key={item.id}
            style={[styles.card, { backgroundColor: item.color }]}
            onPress={() =>
              editMode
                ? toggleSelect(item.id)
                : router.push({
                    pathname: "/(tabs)/classes/classinformation",
                    params: {
                      name: item.name,
                      section: item.section,
                      color: item.color,
                    },
                  })
            }          >
            {editMode && (
              <View style={styles.selectCircle}>
                {selected.has(item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.className}>{item.name}</Text>
              <Text style={styles.section}>{item.section}</Text>
            </View>

            {!editMode && (
              <Ionicons name="chevron-forward" size={22} color="rgba(0,0,0,0.35)" />
            )}
          </Pressable>
        ))}

        {/* Add Class */}
        {!editMode && (
          <TouchableOpacity
            style={[styles.card, styles.addCard]}
            onPress={() => router.push("/(tabs)/classes/addclass")}
          >
            <Ionicons name="add-circle-outline" size={24} color="#0EA47A" />
            <Text style={styles.addText}>Add Class</Text>
          </TouchableOpacity>
        )}

        {/* Danger bar when selecting */}
        {editMode && (
          <TouchableOpacity
            disabled={!anySelected}
            style={[styles.deleteBar, !anySelected && { opacity: 0.5 }]}
            onPress={() => setConfirmVisible(true)}
          >
            <Text style={styles.deleteBarText}>Delete selected class</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Class?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to delete {selected.size === 1 ? selectedNames : "the selected classes"}?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDelete]}
                onPress={handleDeleteConfirmed}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CARD_RADIUS = 14;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  pillDone: { backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 0 },
  pillText: { fontWeight: "600", color: "#333" },

  content: { padding: 16, paddingBottom: 28 },

  card: {
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  className: { color: "#fff", fontWeight: "700" },
  section: { color: "#fff", opacity: 0.95, fontWeight: "600" },

  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  addCard: {
    backgroundColor: "#fff",
    borderWidth: 1.3,
    borderColor: "#0EA47A",
    justifyContent: "center",
  },
  addText: { marginLeft: 8, color: "#0EA47A", fontWeight: "700" },

  deleteBar: {
    marginTop: 8,
    backgroundColor: "#D32F2F",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteBarText: { color: "#fff", fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  modalSub: { color: "#666", marginBottom: 16 },

  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  modalCancel: { backgroundColor: "#eee" },
  modalCancelText: { color: "#333", fontWeight: "700" },
  modalDelete: { backgroundColor: "#D32F2F" },
  modalDeleteText: { color: "#fff", fontWeight: "700" },
});
