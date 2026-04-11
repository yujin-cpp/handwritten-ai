import { get, ref, set } from "firebase/database";

import type { ProfessorProfile } from "../domain/models/professor";
import { dbPaths } from "../firebase/dbPaths";
import { db } from "../firebase/firebaseConfig";

export const createProfessor = async (
  professorId: string,
  data: Omit<ProfessorProfile, "createdAt">
) => {
  const professorRef = ref(db, dbPaths.professor(professorId));
  const snapshot = await get(professorRef);

  if (!snapshot.exists()) {
    return set(professorRef, {
      ...data,
      createdAt: new Date().toISOString(),
    });
  }

  return;
};

export const getProfessorProfile = async (
  professorId: string
): Promise<ProfessorProfile | null> => {
  const snapshot = await get(ref(db, dbPaths.professor(professorId)));
  return snapshot.exists() ? (snapshot.val() as ProfessorProfile) : null;
};
