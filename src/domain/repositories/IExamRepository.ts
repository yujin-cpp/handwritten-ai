export interface ExamEntity {
  id: string;
  [key: string]: any;
}

export interface IExamRepository {
  listenToExams(professorId: string, classId: string, callback: (exams: any) => void): () => void;
}
