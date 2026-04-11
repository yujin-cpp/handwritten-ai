import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VerificationNoticeCard } from "../../../components/auth/VerificationNoticeCard";
import { auth } from "../../../firebase/firebaseConfig";
import { useVerificationGate } from "../../../hooks/useVerificationGate";
import {
  addActivity,
  deleteActivity,
  listenToActivities
} from "../../../services/class.service";
import { showAlert } from "../../../utils/alert";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : v ?? fb;

type Activity = { id: string; title: string };

export default function ActivitiesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isVerified, requireVerified } = useVerificationGate();

  const classId = P(params.classId);
  const className = P(params.name, "Class");
  const section = P(params.section, "Section");
  const headerColor = P(params.color, "#00b679");

  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const anySelected = selected.size > 0;
  const displayItems = useMemo(() => items, [items]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    const unsubscribe = listenToActivities(uid, classId, (data) => {
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId]);

  function toggleEdit() {
    if (!isVerified) {
      void requireVerified();
      return;
    }
    if (editMode) setSelected(new Set());
    setEditMode((v) => !v);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAdd() {
    const allowed = await requireVerified();
    if (!allowed) {
      return;
    }

    const title = newTitle.trim();
    if (!title) return;

    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    try {
      setIsAdding(true);
      await addActivity(uid, classId, title);
      setNewTitle("");
      setAddOpen(false);
    } catch {
      showAlert("Error", "Failed to add activity.");
    } finally {
      setIsAdding(false);
    }
  }

  async function doDelete() {
    const allowed = await requireVerified();
    if (!allowed) {
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid || !classId) return;

    try {
      setIsDeleting(true);
      const deletePromises = Array.from(selected).map((id) =>
        deleteActivity(uid, classId, id)
      );

      await Promise.all(deletePromises);
      setSelected(new Set());
      setConfirmOpen(false);
      setEditMode(false);
    } catch {
      showAlert("Error", "Failed to delete activities.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{className}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>{section}</Text>
        </View>
        <TouchableOpacity onPress={toggleEdit} style={styles.editHeaderBtn}>
          <Feather name={editMode ? "check" : "trash-2"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        {!isVerified && <VerificationNoticeCard />}

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Activities</Text>
            <Text style={styles.subtitle}>{items.length} total items</Text>
          </View>

          {!editMode && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: headerColor }, !isVerified && { opacity: 0.6 }]}
              onPress={() => {
                if (!isVerified) {
                  void requireVerified();
                  return;
                }
                setAddOpen(true);
              }}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={headerColor} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {displayItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconBox}>
                  <Feather name="book-open" size={40} color="#ccc" />
                </View>
                <Text style={styles.emptyText}>No activities created yet.</Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    if (!isVerified) {
                      void requireVerified();
                      return;
                    }
                    setAddOpen(true);
                  }}
                >
                  <Text style={[styles.emptyAddText, { color: headerColor }]}>Add your first activity</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayItems.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (editMode) toggleSelect(a.id);
                    else {
                      void requireVerified(async () => {
                        router.push({
                          pathname: "/(tabs)/classes/activity-details",
                          params: { classId, activityId: a.id, name: className, section, color: headerColor, title: a.title },
                        });
                      });
                    }
                  }}
                  style={[styles.activityCard, selected.has(a.id) && styles.selectedCard]}
                >
                  <View style={styles.cardContent}>
                    {editMode ? (
                      <View style={[styles.checkCircle, selected.has(a.id) && { backgroundColor: '#ff3b30', borderColor: '#ff3b30' }]}>
                        {selected.has(a.id) && <Feather name="check" size={12} color="#fff" />}
                      </View>
                    ) : (
                      <View style={[styles.iconBox, { backgroundColor: headerColor + '10' }]}>
                        <Feather name="file-text" size={18} color={headerColor} />
                      </View>
                    )}
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityText, selected.has(a.id) && { color: '#ff3b30' }]} numberOfLines={1}>
                        {a.title}
                      </Text>
                      {!editMode && <Text style={styles.tapToView}>Tap to view details</Text>}
                    </View>
                  </View>
                  {!editMode && <Feather name="chevron-right" size={18} color="#ccc" />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {editMode && (
        <View style={[styles.deleteBarWrapper, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            disabled={!anySelected || isDeleting || !isVerified}
            onPress={() => setConfirmOpen(true)}
            style={[styles.deleteBar, (!anySelected || isDeleting || !isVerified) && { opacity: 0.5 }]}
          >
            <Feather name="trash-2" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.deleteText}>
              {isDeleting ? "Deleting..." : `Delete ${selected.size} Item${selected.size > 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleEdit} style={styles.cancelEditBtn}>
            <Text style={styles.cancelEditText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Modal */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAddOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Activity</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Activity Title</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Midterm Quiz 1"
                style={styles.modalInput}
                autoFocus
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSave, { backgroundColor: headerColor }, isAdding && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Text style={styles.modalSaveText}>Create Activity</Text>
                  <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', padding: 30 }]}>
            <View style={styles.warningIconBox}>
              <Feather name="alert-triangle" size={32} color="#ff3b30" />
            </View>
            <Text style={styles.confirmTitle}>Delete Activity?</Text>
            <Text style={styles.confirmBody}>
              This will permanently delete {selected.size} item{selected.size > 1 ? "s" : ""} and all associated grades.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.confirmCancelText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelete} onPress={doDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: "#fff", fontSize: 12, opacity: 0.8, fontWeight: '600', textTransform: 'uppercase' },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },
  editHeaderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  content: { padding: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 25 },
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 13, color: "#999", marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, elevation: 2 },
  addBtnText: { color: "#fff", fontWeight: "700", marginLeft: 6, fontSize: 14 },

  loadingBox: { marginTop: 100 },
  listContainer: { gap: 12 },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  selectedCard: { borderColor: '#ffccd0', backgroundColor: '#fff5f5' },
  cardContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  activityInfo: { flex: 1, marginLeft: 15 },
  activityText: { fontSize: 16, fontWeight: "700", color: "#1f1f1f" },
  tapToView: { fontSize: 12, color: '#aaa', marginTop: 2 },

  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 16, color: "#999", fontWeight: "500" },
  emptyAddBtn: { marginTop: 15 },
  emptyAddText: { fontWeight: "700", fontSize: 15 },

  deleteBarWrapper: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f0f0f0", elevation: 20 },
  deleteBar: { backgroundColor: "#ff3b30", paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: 'row', justifyContent: 'center', elevation: 4 },
  deleteText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelEditBtn: { marginTop: 15, alignItems: 'center' },
  cancelEditText: { color: '#666', fontWeight: '600', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 25 },
  modalCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  inputBox: { marginBottom: 25 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#666", marginBottom: 10, textTransform: 'uppercase' },
  modalInput: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 14, fontSize: 16, color: '#111', borderWidth: 1, borderColor: '#f0f0f0' },
  modalSave: { paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  warningIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 12 },
  confirmBody: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 30 },
  confirmActions: { flexDirection: "row", gap: 12 },
  confirmCancel: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#f0f0f0', alignItems: 'center' },
  confirmCancelText: { color: "#666", fontWeight: "700" },
  confirmDelete: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#ff3b30', alignItems: 'center' },
  confirmDeleteText: { color: "#fff", fontWeight: "700" },
});
