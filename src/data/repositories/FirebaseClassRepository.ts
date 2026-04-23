import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "../../firebase/firebaseConfig";
import { ClassEntity } from "../../domain/entities/Class";
import { IClassRepository } from "../../domain/repositories/IClassRepository";

export class FirebaseClassRepository implements IClassRepository {
  async getClassesByProfessorId(professorId: string): Promise<ClassEntity[]> {
    const snapshot = await get(ref(db, `professors/${professorId}/classes`));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })) as ClassEntity[];
  }

  listenToClasses(professorId: string, callback: (classes: ClassEntity[]) => void): () => void {
    const classesRef = ref(db, `professors/${professorId}/classes`);
    return onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const classes = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as ClassEntity[];
        callback(classes);
      } else {
        callback([]);
      }
    });
  }

  listenToClassesRaw(professorId: string, callback: (data: any) => void): () => void {
    const classesRef = ref(db, `professors/${professorId}/classes`);
    return onValue(classesRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : {});
    });
  }

  async createClass(professorId: string, classData: Omit<ClassEntity, 'id' | 'createdAt'>): Promise<string> {
    const classesRef = ref(db, `professors/${professorId}/classes`);
    const newClassKey = push(classesRef).key;
    if (!newClassKey) throw new Error("Could not generate class ID");

    const classPath = `professors/${professorId}/classes/${newClassKey}`;
    await update(ref(db), {
      [classPath]: {
        ...classData,
        createdAt: new Date().toISOString(),
      },
    });

    return newClassKey;
  }

  async updateClass(professorId: string, classId: string, updates: Partial<ClassEntity>): Promise<void> {
    const classRef = ref(db, `professors/${professorId}/classes/${classId}`);
    await update(classRef, updates);
  }
}

export const classRepository = new FirebaseClassRepository();
