import { ref, push } from "firebase/database";
import { db } from "../../firebase/firebaseConfig";
import { IAnswerRepository } from "../../domain/repositories/IAnswerRepository";

export class FirebaseAnswerRepository implements IAnswerRepository {
  async submitAnswer(professorId: string, classId: string, examId: string, answerData: any): Promise<string> {
    const answersRef = ref(db, `professors/${professorId}/classes/${classId}/activities/${examId}/answers`);
    
    const newAnswerRef = await push(answersRef, {
      ...answerData,
      uploadedAt: new Date().toISOString()
    });

    return newAnswerRef.key as string;
  }
}

export const answerRepository = new FirebaseAnswerRepository();
