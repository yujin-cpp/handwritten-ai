import { off, onValue, ref } from "firebase/database";

import { dbPaths } from "../firebase/dbPaths";
import { db } from "../firebase/firebaseConfig";

export const listenToExams = (
  professorId: string,
  classId: string,
  callback: (data: Record<string, unknown>) => void
) => {
  const examsRef = ref(db, dbPaths.exams(professorId, classId));

  onValue(examsRef, (snapshot) => {
    callback(snapshot.val() || {});
  });

  return () => off(examsRef);
};
