export interface StudentEntity {
  id: string; // The specific TUPM ID or key
  studentId: string;
  name: string;
  addedAt: string;
  activities?: any; // For nested activity scores
}

export interface IStudentRepository {
  listenToStudents(professorId: string, classId: string, callback: (students: StudentEntity[]) => void): () => void;
  addStudent(professorId: string, classId: string, studentData: { name: string; studentId: string }): Promise<void>;
  updateStudent(professorId: string, classId: string, studentKey: string, updates: Partial<StudentEntity>): Promise<void>;
  deleteStudent(professorId: string, classId: string, studentKey: string): Promise<void>;
  getStudentsInClass(professorId: string, classId: string): Promise<{ id: string; name: string }[]>;
}
