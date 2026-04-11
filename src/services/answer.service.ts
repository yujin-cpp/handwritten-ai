import { push, ref } from "firebase/database";

import { dbPaths } from "../firebase/dbPaths";
import { db } from "../firebase/firebaseConfig";

export const submitAnswer = async (
  professorId: string,
  classId: string,
  examId: string,
  answerData: Record<string, unknown>
) => {
  const answersRef = ref(db, dbPaths.answers(professorId, classId, examId));

  return push(answersRef, {
    ...answerData,
    uploadedAt: new Date().toISOString(),
  });
};
