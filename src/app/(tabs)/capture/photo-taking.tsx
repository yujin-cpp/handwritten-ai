import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "../../../utils/alert";
import {
  parseImageUrisParam,
  serializeImageUrisParam,
} from "../../../utils/captureSubmission";

const P = (v: string | string[] | undefined, fb = "") =>
  Array.isArray(v) ? v[0] : (v ?? fb);

export default function PhotoTaking() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const returnTo = P(params.returnTo);
  const classId = P(params.classId);
  const activityId = P(params.activityId);
  const studentId = P(params.studentId);
  const originName = P(params.name, "Class");
  const originSection = P(params.section, "Section");
  const originColor = P(params.color, "#00b679");
  const originTitle = P(params.title, "Activity");

  const goBackToOrigin = () => {
    if (returnTo === "quiz-score" && classId && activityId) {
      router.replace({
        pathname: "/(tabs)/classes/quiz-score",
        params: {
          classId,
          activityId,
          name: originName,
          section: originSection,
          color: originColor,
          title: originTitle,
        },
      });
      return;
    }

    router.back();
  };

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");

  // Ask for camera permission when screen loads
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // NAVIGATION: Go to Review Screen
  const goToImageCaptured = (uri: string) => {
    const existingImageUris = parseImageUrisParam(
      params.imageUris ?? params.imageUri,
    );

    router.push({
      pathname: "/(tabs)/capture/image-captured",
      params: {
        imageUris: serializeImageUrisParam([...existingImageUris, uri]),
        classId,
        activityId,
        studentId,
        returnTo,
        name: originName,
        section: originSection,
        color: originColor,
        title: originTitle,
      },
    });
  };

  // 1. Take a photo using the camera
  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      if (photo?.uri) {
        goToImageCaptured(photo.uri);
      }
    } catch (err) {
      console.log("Error taking photo:", err);
      showAlert("Error", "Failed to take photo.");
    }
  };

  // 2. Pick an image from the gallery
  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      showAlert(
        "Permission Required",
        "We need access to your gallery to upload exams.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      goToImageCaptured(result.assets[0].uri);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00b679" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Feather
          name="camera-off"
          size={60}
          color="#ccc"
          style={{ marginBottom: 20 }}
        />
        <Text
          style={{
            color: "#666",
            marginBottom: 20,
            textAlign: "center",
            paddingHorizontal: 40,
          }}
        >
          Camera access is required to scan and grade exam papers.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Over Camera */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={goBackToOrigin} style={styles.backBtn}>
          <Feather name="x" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Position Paper</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        >
          <Feather name="refresh-cw" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Real Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setIsReady(true)}
      />

      {/* Overlay Guidelines */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hintText}>
          Align the exam paper within the frame
        </Text>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={handlePickFromGallery}
        >
          <Feather name="image" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutterOuter, !isReady && { opacity: 0.5 }]}
          disabled={!isReady}
          onPress={handleTakePicture}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ width: 50 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingBottom: 15,
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },

  camera: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  scanFrame: {
    width: "85%",
    height: "65%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 20,
    borderStyle: "dashed",
  },
  hintText: {
    position: "absolute",
    bottom: 160,
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    fontWeight: "500",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 50,
    paddingTop: 30,
    paddingHorizontal: 40,
    backgroundColor: "black",
  },

  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },

  sideBtn: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 25,
  },

  permissionBtn: {
    backgroundColor: "#00b679",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 10,
  },
  permissionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
