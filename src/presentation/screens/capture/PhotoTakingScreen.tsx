import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "../../theme";
import { showAlert } from "../../../utils/alert";
import { safeGoBack } from "../../../utils/navigation";

const P = (v: string | string[] | undefined, fb = "") => Array.isArray(v) ? v[0] : (v ?? fb);

export const PhotoTakingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const returnTo = P(params.returnTo);
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const originName = P(params.name, "Class");
  const originSection = P(params.section, "Section");
  const originColor = P(params.color, colors.primary);
  const originTitle = P(params.title, "Activity");

  // Multi-page: read existing captured URIs from previous pages
  const existingUris: string[] = params.existingUris ? JSON.parse(P(params.existingUris, "[]")) : [];

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

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

  const goToImageCaptured = (uri: string) => {
    const allUris = [...existingUris, uri];
    router.push({
      pathname: "/(tabs)/capture/image-captured",
      params: {
        imageUri: uri, imageUris: JSON.stringify(allUris), classId, activityId, studentId, returnTo,
        name: originName, section: originSection, color: originColor, title: originTitle,
      },
    });
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false, skipProcessing: true });
      if (photo?.uri) goToImageCaptured(photo.uri);
    } catch (err) {
      console.log("Error taking photo:", err);
      showAlert("Error", "Failed to take photo.");
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permission Required", "We need access to your gallery to upload exams.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsMultipleSelection: true });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (result.assets.length === 1) {
        goToImageCaptured(result.assets[0].uri);
      } else {
        // Multiple images selected — go directly to review with all URIs
        const allUris = [...existingUris, ...result.assets.map((a) => a.uri)];
        router.push({
          pathname: "/(tabs)/capture/image-captured",
          params: {
            imageUri: result.assets[0].uri, imageUris: JSON.stringify(allUris), classId, activityId, studentId, returnTo,
            name: originName, section: originSection, color: originColor, title: originTitle,
          },
        });
      }
    }
  };

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Feather name="camera-off" size={64} color={colors.grayLight} style={{ marginBottom: 24 }} />
        <Text style={styles.permissionText}>Camera access is required to scan and grade exam papers.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={goBackToOrigin} style={styles.iconBtn}>
          <Feather name="x" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Position Paper</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setFacing(f => (f === "back" ? "front" : "back"))}>
          <Feather name="refresh-cw" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing={facing} onCameraReady={() => setIsReady(true)} />

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hintText}>Align the exam paper within the frame</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={styles.sideBtn} onPress={handlePickFromGallery}>
          <Feather name="image" size={28} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.shutterOuter, !isReady && { opacity: 0.5 }]} disabled={!isReady} onPress={handleTakePicture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ width: 64 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white, padding: 40 },
  permissionText: { color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: 16, textAlign: "center", marginBottom: 32, lineHeight: 24 },
  permissionBtn: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16 },
  permissionBtnText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 16 },
  container: { flex: 1, backgroundColor: "#000" },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 24, paddingBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 22 },
  headerTitle: { color: colors.white, fontSize: 18, fontFamily: typography.fontFamily.bold },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", pointerEvents: "none" },
  scanFrame: { width: "75%", aspectRatio: 0.65, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)", borderRadius: 16, borderStyle: "dashed" },
  hintText: { position: "absolute", bottom: 240, textAlign: "center", color: colors.white, fontSize: 15, fontFamily: typography.fontFamily.bold, backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, overflow: "hidden" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 32, paddingHorizontal: 40, backgroundColor: "rgba(0,0,0,0.8)" },
  shutterOuter: { width: 88, height: 88, borderRadius: 44, borderWidth: 6, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white },
  sideBtn: { width: 64, height: 64, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 32 },
});
