/**
 * Centralized Firebase Realtime Database path builders.
 * Prevents typos from hardcoded path strings scattered across the codebase.
 */
export const fbPaths = {
  professor: (uid: string) => `professors/${uid}`,
  classes: (uid: string) => `professors/${uid}/classes`,
  classItem: (uid: string, classId: string) => `professors/${uid}/classes/${classId}`,
  students: (uid: string, classId: string) => `professors/${uid}/classes/${classId}/students`,
  student: (uid: string, classId: string, studentId: string) =>
    `professors/${uid}/classes/${classId}/students/${studentId}`,
  activities: (uid: string, classId: string) => `professors/${uid}/classes/${classId}/activities`,
  activity: (uid: string, classId: string, activityId: string) =>
    `professors/${uid}/classes/${classId}/activities/${activityId}`,
  grade: (uid: string, classId: string, studentId: string, activityId: string) =>
    `professors/${uid}/classes/${classId}/students/${studentId}/activities/${activityId}`,
};
