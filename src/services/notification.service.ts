import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

let notificationsConfigured = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ensureNotificationAccess = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("exam-processing", {
      name: "Exam Processing",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#0EA47A",
    });
  }

  return true;
};

export const configureLocalNotifications = async (): Promise<void> => {
  if (notificationsConfigured) {
    return;
  }

  try {
    await ensureNotificationAccess();
  } finally {
    notificationsConfigured = true;
  }
};

export const notifyExamProcessingComplete = async (payload: {
  studentName?: string;
  activityTitle?: string;
  score?: number;
  total?: number;
}) => {
  if (!(await ensureNotificationAccess())) {
    return;
  }

  const studentName = payload.studentName?.trim() || "Student";
  const activityTitle = payload.activityTitle?.trim() || "Activity";
  const scoreText =
    Number.isFinite(payload.score) && Number.isFinite(payload.total)
      ? ` (${payload.score}/${payload.total})`
      : "";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Exam Processing Complete",
      body: `${studentName} - ${activityTitle}${scoreText}`,
      sound: true,
      data: { type: "exam-processing-complete" },
    },
    trigger: null,
  });
};

export const notifyExamProcessingFailed = async (payload: {
  studentName?: string;
  activityTitle?: string;
}) => {
  if (!(await ensureNotificationAccess())) {
    return;
  }

  const studentName = payload.studentName?.trim() || "Student";
  const activityTitle = payload.activityTitle?.trim() || "Activity";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Exam Processing Failed",
      body: `${studentName} - ${activityTitle}. Please retry processing.`,
      sound: true,
      data: { type: "exam-processing-failed" },
    },
    trigger: null,
  });
};