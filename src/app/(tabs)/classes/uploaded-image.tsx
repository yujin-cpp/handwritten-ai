import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function UploadedImageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const headerColor = P(params.color, "#00b679");
  const student = P(params.student, "Student");
  const section = P(params.section, "");
  const title = P(params.title, "Exam Submission");

  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);

  const images: string[] = useMemo(() => {
    if (params.imageUri) return [P(params.imageUri)];
    const raw = P(params.images, "[]");
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as string[];
      return [];
    } catch {
      return [];
    }
  }, [params.imageUri, params.images]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSmall}>{section || "Submission Review"}</Text>
          <Text style={styles.headerBig} numberOfLines={1}>{student}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metaCard}>
          <View style={styles.metaIconBox}>
            <Feather name="user" size={24} color={headerColor} />
          </View>
          <View style={styles.metaInfo}>
            <Text style={styles.metaLabel}>EXAM TITLE</Text>
            <Text style={styles.metaVal}>{title}</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>CAPTURED PAGES</Text>
          <View style={[styles.badge, { backgroundColor: headerColor + '15' }]}>
            <Text style={[styles.badgeText, { color: headerColor }]}>{images.length}</Text>
          </View>
        </View>

        {images.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="image" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No images available for this record.</Text>
          </View>
        ) : (
          <View style={styles.imageGrid}>
            {images.map((uri, idx) => (
              <TouchableOpacity
                key={`${uri}-${idx}`}
                activeOpacity={0.9}
                onPress={() => setFullScreenUri(uri)}
                style={styles.imageCard}
              >
                <Image source={{ uri }} style={styles.pageImg} resizeMode="cover" />
                <View style={styles.pageOverlay}>
                  <View style={styles.pageBadge}>
                    <Text style={styles.pageBadgeText}>PAGE {idx + 1}</Text>
                  </View>
                  <View style={styles.expandIcon}>
                    <Feather name="maximize-2" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Detail Viewer Modal */}
      <Modal visible={!!fullScreenUri} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFullScreenUri(null)} />
          <TouchableOpacity
            style={[styles.modalClose, { top: insets.top + 10 }]}
            onPress={() => setFullScreenUri(null)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {fullScreenUri && (
            <Image
              source={{ uri: fullScreenUri }}
              style={styles.fullImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { paddingHorizontal: 20, paddingBottom: 25, flexDirection: "row", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10 },
  headerSmall: { color: "#fff", fontSize: 11, opacity: 0.8, fontWeight: '700', textTransform: 'uppercase' },
  headerBig: { color: "#fff", fontSize: 18, fontWeight: "800" },

  content: { padding: 20 },
  metaCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, marginBottom: 30 },
  metaIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  metaInfo: { flex: 1, marginLeft: 15 },
  metaLabel: { fontSize: 10, fontWeight: '800', color: '#bbb', letterSpacing: 1, marginBottom: 4 },
  metaVal: { fontSize: 16, fontWeight: '700', color: '#111' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#bbb', letterSpacing: 1 },
  badge: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '800' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#ccc', marginTop: 15, fontWeight: '500' },

  imageGrid: { gap: 20 },
  imageCard: { backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15 },
  pageImg: { width: '100%', height: 450, backgroundColor: '#eee' },
  pageOverlay: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'space-between', alignItems: 'flex-start' },
  pageBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pageBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  expandIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },

  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  fullImg: { width: width, height: height },
});
