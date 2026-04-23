import { get, onValue, ref, remove, set, update } from "firebase/database";
import { db } from "../../firebase/firebaseConfig";
import { IStudentRepository, StudentEntity } from "../../domain/repositories/IStudentRepository";

export class FirebaseStudentRepository implements IStudentRepository {
  listenToStudents(professorId: string, classId: string, callback: (students: StudentEntity[]) => void): () => void {
    const studentsRef = ref(db, `professors/${professorId}/classes/${classId}/students`);
    return onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const studentList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as StudentEntity[];
        callback(studentList);
      } else {
        callback([]);
      }
    });
  }

  async addStudent(professorId: string, classId: string, studentData: { name: string; studentId: string }): Promise<void> {
    const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentData.studentId}`);
    await set(studentRef, {
      name: studentData.name,
      studentId: studentData.studentId,
      addedAt: new Date().toISOString(),
    });
  }

  async updateStudent(professorId: string, classId: string, studentKey: string, updates: Partial<StudentEntity>): Promise<void> {
    const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentKey}`);
    await update(studentRef, updates);
  }

  async deleteStudent(professorId: string, classId: string, studentKey: string): Promise<void> {
    const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentKey}`);
    await remove(studentRef);
  }

  async getStudentsInClass(professorId: string, classId: string): Promise<{ id: string; name: string }[]> {
    const studentsRef = ref(db, `professors/${professorId}/classes/${classId}/students`);
    const snapshot = await get(studentsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data)
        .map((key) => ({
          id: key,
          name: data[key].name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }

  async getUngradedStudents(professorId: string, classId: string, activityId: string): Promise<{ id: string; name: string }[]> {
    const studentsRef = ref(db, `professors/${professorId}/classes/${classId}/students`);
    const snapshot = await get(studentsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data)
        .filter((key) => {
          const student = data[key];
          const activity = student.activities?.[activityId];
          return !activity || (activity.status !== "graded" && activity.score === undefined);
        })
        .map((key) => ({
          id: key,
          name: data[key].name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }
}

export const studentRepository = new FirebaseStudentRepository();
