import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { safeGoBack } from "../../../utils/navigation";
import { getContrastColor } from "../../../utils/colorUtils";

const { width, height } = Dimensions.get("window");

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const UploadedImageScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const headerColor = P(params.color, colors.primary);
  const student = P(params.student, "Student");
  const section = P(params.section, "");
  const title = P(params.title, "Exam Submission");
  const transcription = P(params.transcription, "");
  const explanation = P(params.explanation, "");

  const [fullScreenUri, setFullScreenUri] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const images: string[] = useMemo(() => {
    if (params.imageUri) {
      const single = P(params.imageUri).trim();
      return single ? [single] : [];
    }

    const raw = P(params.images, "[]").trim();
    let decoded = raw;

    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }

    try {
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        return parsed.filter((uri) => typeof uri === "string" && uri.trim().length > 0) as string[];
      }
      return [];
    } catch {
      return [];
    }
  }, [params.imageUri, params.images]);

  const headerTextColor = getContrastColor(headerColor);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={headerTextColor} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSmall, { color: headerTextColor }]}>{section || "Submission Review"}</Text>
          <Text style={[styles.headerBig, { color: headerTextColor }]} numberOfLines={1}>{student}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
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
          <View style={[styles.badge, { backgroundColor: headerColor + "15" }]}>
            <Text style={[styles.badgeText, { color: headerColor }]}>{images.length}</Text>
          </View>
        </View>

        {images.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="image" size={48} color={colors.grayLight} />
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
                <Image
                  source={{ uri }}
                  style={styles.pageImg}
                  resizeMode="contain"
                  onError={() => setFailedImages((prev) => ({ ...prev, [uri]: true }))}
                />
                <View style={styles.pageOverlay}>
                  <View style={styles.pageBadge}>
                    <Text style={styles.pageBadgeText}>PAGE {idx + 1}</Text>
                  </View>
                  <View style={styles.expandIcon}>
                    <Feather name="maximize-2" size={16} color={colors.white} />
                  </View>
                </View>
                {failedImages[uri] ? (
                  <View style={styles.failedOverlay}>
                    <Feather name="alert-circle" size={20} color={colors.danger} />
                    <Text style={styles.failedOverlayText}>Failed to load proof image.</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(transcription.length > 0 || explanation.length > 0) && (
          <View style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <Feather name="cpu" size={20} color={headerColor} />
              <Text style={[styles.aiResultTitle, { color: headerColor }]}>AI Validation Result</Text>
            </View>
            
            {transcription.length > 0 && (
              <View style={styles.aiResultSection}>
                <Text style={styles.aiResultLabel}>Transcribed Text:</Text>
                <Text style={styles.aiResultContent}>{transcription}</Text>
              </View>
            )}

            {explanation.length > 0 && (
              <View style={styles.aiResultSection}>
                <Text style={styles.aiResultLabel}>Explanation & Logic:</Text>
                <Text style={styles.aiResultContent}>{explanation}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Detail Viewer Modal */}
      <Modal visible={!!fullScreenUri} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFullScreenUri(null)} />
          <TouchableOpacity style={[styles.modalClose, { top: insets.top + 20 }]} onPress={() => setFullScreenUri(null)}>
            <Feather name="x" size={24} color={colors.white} />
          </TouchableOpacity>
          {fullScreenUri && (
            <Image source={{ uri: fullScreenUri }} style={styles.fullImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", ...shadows.medium },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, paddingHorizontal: 10, alignItems: "center" },
  headerSmall: { color: colors.white, fontSize: 11, fontFamily: typography.fontFamily.bold, textTransform: "uppercase", opacity: 0.9 },
  headerBig: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  content: { padding: 24, paddingBottom: 150 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', ...shadows.soft },
  metaIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.grayLight, justifyContent: "center", alignItems: "center" },
  metaInfo: { flex: 1, marginLeft: 16 },
  metaLabel: { fontSize: 11, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, letterSpacing: 1, marginBottom: 4 },
  metaVal: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginTop: 32, marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, letterSpacing: 1 },
  badge: { marginLeft: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontFamily: typography.fontFamily.bold },
  emptyState: { alignItems: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 16 },
  imageGrid: { gap: 24 },
  imageCard: { backgroundColor: colors.white, borderRadius: 24, overflow: "hidden", ...shadows.medium },
  pageImg: { width: "100%", height: 450, backgroundColor: colors.grayLight },
  pageOverlay: { ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: "space-between", alignItems: "flex-start" },
  pageBadge: { backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  pageBadgeText: { color: colors.white, fontSize: 12, fontFamily: typography.fontFamily.bold },
  expandIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", alignSelf: "flex-end" },
  failedOverlay: { position: "absolute", left: 24, right: 24, bottom: 24, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  failedOverlayText: { flex: 1, color: colors.danger, fontSize: 13, fontFamily: typography.fontFamily.bold },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  modalClose: { position: "absolute", right: 24, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", zIndex: 10 },
  fullImg: { width: width, height: height },
  aiResultCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginTop: 24, marginBottom: 40, ...shadows.medium },
  aiResultHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  aiResultTitle: { fontSize: 16, fontFamily: typography.fontFamily.bold },
  aiResultSection: { marginTop: 12 },
  aiResultLabel: { fontSize: 13, fontFamily: typography.fontFamily.semiBold, color: colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  aiResultContent: { fontSize: 15, fontFamily: typography.fontFamily.medium, color: colors.text, lineHeight: 24, backgroundColor: colors.background, padding: 16, borderRadius: 12 }
});
