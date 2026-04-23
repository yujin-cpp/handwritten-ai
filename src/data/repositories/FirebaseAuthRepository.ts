import { auth, db } from "../../firebase/firebaseConfig";
import { get, ref, set } from "firebase/database";
import { signOut } from "firebase/auth";
import { User } from "../../domain/entities/User";
import { IAuthRepository } from "../../domain/repositories/IAuthRepository";

export class FirebaseAuthRepository implements IAuthRepository {
  async getCurrentUser(): Promise<User | null> {
    const user = auth.currentUser;
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "Professor",
      photoURL: user.photoURL || undefined,
    };
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async getProfessorProfile(professorId: string): Promise<User | null> {
    const snapshot = await get(ref(db, `professors/${professorId}`));
    return snapshot.exists() ? snapshot.val() as User : null;
  }

  async createProfessorProfile(professorId: string, data: Partial<User>): Promise<void> {
    const professorRef = ref(db, `professors/${professorId}`);
    const snapshot = await get(professorRef);

    if (!snapshot.exists()) {
      await set(professorRef, {
        ...data,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

export const authRepository = new FirebaseAuthRepository();
