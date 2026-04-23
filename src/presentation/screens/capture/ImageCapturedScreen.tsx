import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const ImageCapturedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [activeIndex, setActiveIndex] = useState(0);
  const imageWidth = Dimensions.get("window").width - 96; // 24 screen padding + 24 card padding on both sides


  const imageUris: string[] = params.imageUris ? JSON.parse(P(params.imageUris)) : [P(params.imageUri)];
  const validImageUris = imageUris.filter((uri): uri is string => typeof uri === "string" && uri.trim().length > 0);

  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const imageUri = P(params.imageUri);
  const returnTo = P(params.returnTo);
  const originName = P(params.name, "Class");
  const originSection = P(params.section, "Section");
  const originColor = P(params.color, colors.primary);
  const originTitle = P(params.title, "Activity");

  const goBackToOrigin = () => {
    if (returnTo === "quiz-score" && classId && activityId) {
      router.replace({
        pathname: "/(tabs)/classes/quiz-score",
        params: { classId, activityId, name: originName, section: originSection, color: originColor, title: originTitle },
      });
      return;
    }
    safeGoBack(router, '/(tabs)/capture');
  };

  const handleProceed = () => {
    if (!imageUri) {
      showAlert("Error", "No image data found.");
      return;
    }
    if (!classId || !activityId || !studentId || classId === "0" || activityId === "0") {
      showAlert("Missing Data", "Class or Student information was lost. Please go back and select again.");
      return;
    }
    router.push({
      pathname: "/(tabs)/capture/processing",
      params: {
        imageUri, imageUris: JSON.stringify(imageUris), classId, activityId, studentId, background: "1", returnTo,
        name: originName, section: originSection, color: originColor, title: originTitle,
      },
    });
  };

  const handleAddPage = () => {
    // Navigate back to camera, passing existing images so next capture appends
    router.push({
      pathname: "/(tabs)/capture/photo-taking",
      params: {
        classId, activityId, studentId, returnTo,
        name: originName, section: originSection, color: originColor, title: originTitle,
        existingUris: JSON.stringify(validImageUris),
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0EA47A", "#017EBA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={goBackToOrigin} style={styles.backBtn}>
          <Feather name="x" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Scan</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Feather name="file-text" size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Captured Sheet</Text>
            {validImageUris.length > 1 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{validImageUris.length} pages</Text>
              </View>
            )}
          </View>

          {validImageUris.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.imageScroll}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                  setActiveIndex(index);
                }}
              >
                {validImageUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={[styles.imageWrap, { width: imageWidth }]}>
                    <Image source={{ uri }} style={styles.mainImage} resizeMode="cover" />
                    {validImageUris.length > 1 && (
                      <View style={styles.pageOverlay}>
                        <Text style={styles.pageOverlayText}>{index + 1} / {validImageUris.length}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              {validImageUris.length > 1 && (
                <View style={styles.dotsRow}>
                  {validImageUris.map((_, i) => <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />)}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImage}>
              <Feather name="image" size={48} color={colors.grayLight} />
              <Text style={styles.noImageText}>No Image Captured</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.infoText}>
            Tap Continue to start AI validation. If clear, grading runs in background and the app auto-moves to the next student after 5 seconds.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.retakeBtn} onPress={() => safeGoBack(router, '/(tabs)/capture')}>
          <Text style={styles.retakeBtnText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPageBtn} onPress={handleAddPage}>
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={styles.addPageBtnText}>Add Page</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={handleProceed}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Feather name="arrow-right" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: "row", alignItems: "center", ...shadows.medium },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold, flex: 1, textAlign: 'center' },
  content: { padding: 24, paddingBottom: 200 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.soft, marginBottom: 24 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + "15", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text, flex: 1 },
  badge: { backgroundColor: colors.primary + "15", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.primary },
  imageScroll: { borderRadius: 16, overflow: "hidden", backgroundColor: colors.grayLight },
  imageWrap: { height: 400, justifyContent: "center", alignItems: "center" },
  mainImage: { width: "100%", height: "100%" },
  pageOverlay: { position: "absolute", bottom: 16, right: 16, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  pageOverlayText: { color: colors.white, fontSize: 12, fontFamily: typography.fontFamily.bold },
  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grayLight },
  dotActive: { width: 24, backgroundColor: colors.primary },
  noImage: { height: 400, backgroundColor: colors.grayLight, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  noImageText: { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 16, fontSize: 15 },
  infoCard: { backgroundColor: colors.primary + "10", borderRadius: 24, padding: 20, flexDirection: "row", gap: 16 },
  infoText: { flex: 1, color: colors.primary, fontFamily: typography.fontFamily.medium, fontSize: 14, lineHeight: 22 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, backgroundColor: colors.background, gap: 10 },
  retakeBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.grayLight, alignItems: "center", justifyContent: "center" },
  retakeBtnText: { color: colors.textSecondary, fontSize: 14, fontFamily: typography.fontFamily.bold },
  addPageBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: colors.primary + "08" },
  addPageBtnText: { color: colors.primary, fontSize: 14, fontFamily: typography.fontFamily.bold },
  continueBtn: { flex: 1.2, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, ...shadows.soft },
  continueBtnText: { color: colors.white, fontSize: 14, fontFamily: typography.fontFamily.bold },
});
