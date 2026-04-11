import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

const P = (value: string | string[] | undefined, fallback = "") =>
  Array.isArray(value) ? value[0] : (value ?? fallback);

export default function PhotoTaking() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");

  const className = P(params.className, "Selected Class");
  const activityName = P(params.activityName, "Selected Activity");
  const studentName = P(params.studentName, "Selected Student");

  const existingImageUris = useMemo(
    () => parseImageUrisParam(params.imageUris),
    [params.imageUris]
  );

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const goToImageCaptured = (uris: string[]) => {
    router.push({
      pathname: "/(tabs)/capture/image-captured",
      params: {
        imageUris: serializeImageUrisParam(uris),
        classId: params.classId,
        activityId: params.activityId,
        studentId: params.studentId,
        className,
        activityName,
        studentName,
      },
    });
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      if (photo?.uri) {
        goToImageCaptured([...existingImageUris, photo.uri]);
      }
    } catch (err) {
      console.log("Error taking photo:", err);
      showAlert("Error", "Failed to take photo.");
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      showAlert(
        "Permission Required",
        "We need access to your gallery to upload exams."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      orderedSelection: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      goToImageCaptured([
        ...existingImageUris,
        ...result.assets.map((asset) => asset.uri),
      ]);
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
        <Feather name="camera-off" size={60} color="#ccc" style={{ marginBottom: 20 }} />
        <Text style={styles.permissionMessage}>
          Camera access is required to scan and grade exam papers.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Capture Answer Pages</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activityName} • {studentName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}
        >
          <Feather name="refresh-cw" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setIsReady(true)}
      />

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <View style={styles.overlayInfo}>
          <Text style={styles.hintText}>Align one paper page inside the frame</Text>
          <Text style={styles.pageCounter}>
            {existingImageUris.length} page{existingImageUris.length === 1 ? "" : "s"} collected
          </Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.sideBtn} onPress={handlePickFromGallery}>
          <Feather name="image" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutterOuter, !isReady && { opacity: 0.5 }]}
          disabled={!isReady}
          onPress={handleTakePicture}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => {
            if (existingImageUris.length === 0) {
              showAlert("No Pages Yet", "Capture at least one page before reviewing.");
              return;
            }
            goToImageCaptured(existingImageUris);
          }}
        >
          <Feather name="check" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.contextBar, { paddingBottom: insets.bottom + 14 }]}>
        <Text style={styles.contextText} numberOfLines={1}>
          {className}
        </Text>
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
    backgroundColor: "rgba(0,0,0,0.32)",
    paddingBottom: 15,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTextWrap: { flex: 1, paddingHorizontal: 10 },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  camera: { flex: 1 },

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
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 20,
    borderStyle: "dashed",
  },
  overlayInfo: {
    position: "absolute",
    bottom: 172,
    alignItems: "center",
    gap: 8,
  },
  hintText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    fontWeight: "600",
  },
  pageCounter: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "rgba(5, 150, 105, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 62,
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
  contextBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.86)",
    paddingTop: 10,
    paddingHorizontal: 24,
  },
  contextText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },

  permissionBtn: {
    backgroundColor: "#00b679",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 10,
  },
  permissionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  permissionMessage: {
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
