import { off, onValue, ref } from "firebase/database";
import { db } from "../../firebase/firebaseConfig";
import { IExamRepository } from "../../domain/repositories/IExamRepository";

export class FirebaseExamRepository implements IExamRepository {
  listenToExams(professorId: string, classId: string, callback: (data: any) => void): () => void {
    const examsRef = ref(db, `professors/${professorId}/classes/${classId}/activities`); // Note: earlier code used activities for exams
    
    onValue(examsRef, (snapshot) => {
      callback(snapshot.val() || {});
    });

    return () => off(examsRef);
  }
}

export const examRepository = new FirebaseExamRepository();
