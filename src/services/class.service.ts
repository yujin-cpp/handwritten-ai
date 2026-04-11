import { get, onValue, push, ref, remove, set, update } from "firebase/database";

import type {
  ActivityListItem,
  ActivityRecord,
  ClassInput,
  ClassMap,
  StudentInput,
  StudentListItem,
  StudentRecord,
} from "../domain/models/classroom";
import { dbPaths } from "../firebase/dbPaths";
import { db } from "../firebase/firebaseConfig";

export const createClass = async (
  professorId: string,
  classData: ClassInput
): Promise<string> => {
  try {
    const classesRef = ref(db, dbPaths.classes(professorId));
    const newClassKey = push(classesRef).key;

    if (!newClassKey) {
      throw new Error("Could not generate class ID");
    }

    await update(ref(db), {
      [dbPaths.class(professorId, newClassKey)]: {
        ...classData,
        createdAt: new Date().toISOString(),
      },
    });

    return newClassKey;
  } catch (error) {
    console.error("Error creating class:", error);
    throw error;
  }
};

export const getClasses = async (professorId: string): Promise<ClassMap> => {
  try {
    const snapshot = await get(ref(db, dbPaths.classes(professorId)));
    return snapshot.exists() ? (snapshot.val() as ClassMap) : {};
  } catch (error) {
    console.error("Error fetching classes:", error);
    return {};
  }
};

export const updateClass = async (
  professorId: string,
  classId: string,
  updates: Partial<ClassInput>
) => {
  try {
    const classRef = ref(db, dbPaths.class(professorId, classId));
    await update(classRef, updates);
  } catch (error) {
    console.error("Error updating class:", error);
    throw error;
  }
};

export const listenToClasses = (
  professorId: string,
  callback: (data: ClassMap) => void
) => {
  const classesRef = ref(db, dbPaths.classes(professorId));

  return onValue(classesRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as ClassMap) : {});
  });
};

export const listenToStudents = (
  professorId: string,
  classId: string,
  callback: (data: StudentListItem[]) => void
) => {
  const studentsRef = ref(db, dbPaths.students(professorId, classId));

  return onValue(studentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, StudentRecord>;
    const studentList = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));

    callback(studentList);
  });
};

export const addStudent = async (
  professorId: string,
  classId: string,
  studentData: StudentInput
) => {
  const studentRef = ref(
    db,
    dbPaths.student(professorId, classId, studentData.studentId)
  );

  await set(studentRef, {
    name: studentData.name,
    studentId: studentData.studentId,
    addedAt: new Date().toISOString(),
  });
};

export const updateStudent = async (
  professorId: string,
  classId: string,
  studentKey: string,
  updates: Partial<StudentInput>
) => {
  const studentRef = ref(db, dbPaths.student(professorId, classId, studentKey));
  await update(studentRef, updates);
};

export const deleteStudent = async (
  professorId: string,
  classId: string,
  studentKey: string
) => {
  const studentRef = ref(db, dbPaths.student(professorId, classId, studentKey));
  await remove(studentRef);
};

export const addActivity = async (
  professorId: string,
  classId: string,
  title: string
) => {
  const activitiesRef = ref(db, dbPaths.activities(professorId, classId));
  await push(activitiesRef, {
    title,
    createdAt: new Date().toISOString(),
  });
};

export const listenToActivities = (
  professorId: string,
  classId: string,
  callback: (data: ActivityListItem[]) => void
) => {
  const activitiesRef = ref(db, dbPaths.activities(professorId, classId));

  return onValue(activitiesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, ActivityRecord>;
    const list = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));

    list.sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    );

    callback(list);
  });
};

export const deleteActivity = async (
  professorId: string,
  classId: string,
  activityId: string
) => {
  const activityRef = ref(db, dbPaths.activity(professorId, classId, activityId));
  await remove(activityRef);
};

export const updateActivity = async (
  professorId: string,
  classId: string,
  activityId: string,
  newTitle: string
) => {
  const activityRef = ref(db, dbPaths.activity(professorId, classId, activityId));
  await update(activityRef, { title: newTitle });
};

export const getStudentsInClass = async (
  professorId: string,
  classId: string
): Promise<Array<Pick<StudentListItem, "id" | "name" | "activities">>> => {
  const studentsRef = ref(db, dbPaths.students(professorId, classId));
  const snapshot = await get(studentsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() as Record<string, StudentRecord>;

  return Object.keys(data)
    .map((key) => ({
      id: key,
      name: data[key].name,
      activities: data[key].activities,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getActivities = async (
  professorId: string,
  classId: string
): Promise<ActivityListItem[]> => {
  const activitiesRef = ref(db, dbPaths.activities(professorId, classId));
  const snapshot = await get(activitiesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val() as Record<string, ActivityRecord>;

  return Object.keys(data).map((key) => ({
    id: key,
    ...data[key],
  }));
};
