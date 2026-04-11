export const dbPaths = {
  professor: (professorId: string) => `professors/${professorId}`,
  classes: (professorId: string) => `professors/${professorId}/classes`,
  class: (professorId: string, classId: string) =>
    `professors/${professorId}/classes/${classId}`,
  students: (professorId: string, classId: string) =>
    `professors/${professorId}/classes/${classId}/students`,
  student: (professorId: string, classId: string, studentId: string) =>
    `professors/${professorId}/classes/${classId}/students/${studentId}`,
  activities: (professorId: string, classId: string) =>
    `professors/${professorId}/classes/${classId}/activities`,
  activity: (professorId: string, classId: string, activityId: string) =>
    `professors/${professorId}/classes/${classId}/activities/${activityId}`,
  exams: (professorId: string, classId: string) =>
    `professors/${professorId}/classes/${classId}/exams`,
  exam: (professorId: string, classId: string, examId: string) =>
    `professors/${professorId}/classes/${classId}/exams/${examId}`,
  answers: (professorId: string, classId: string, examId: string) =>
    `professors/${professorId}/classes/${classId}/exams/${examId}/answers`,
  answer: (
    professorId: string,
    classId: string,
    examId: string,
    answerId: string
  ) => `professors/${professorId}/classes/${classId}/exams/${examId}/answers/${answerId}`,
  reports: (professorId: string, classId: string, examId: string) =>
    `professors/${professorId}/classes/${classId}/exams/${examId}/reports`,
};
