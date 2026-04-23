export interface AnswerEntity {
  id: string;
  uploadedAt: string;
  [key: string]: any;
}

export interface IAnswerRepository {
  submitAnswer(professorId: string, classId: string, examId: string, answerData: any): Promise<string>;
}
