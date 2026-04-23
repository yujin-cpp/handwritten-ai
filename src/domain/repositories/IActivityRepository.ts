export interface ExamSettings {
  totalScore: number;
  professorInstructions: string;
  objectiveTypes: {
    multipleChoice: { enabled: boolean; items: number };
    trueFalse: { enabled: boolean; items: number };
    identification: { enabled: boolean; items: number };
  };
  updatedAt: string;
}

export interface ActivityEntity {
  id: string;
  title: string;
  createdAt: string;
  examSettings?: ExamSettings;
}

export interface IActivityRepository {
  listenToActivities(professorId: string, classId: string, callback: (activities: ActivityEntity[]) => void): () => void;
  addActivity(professorId: string, classId: string, title: string): Promise<void>;
  updateActivity(professorId: string, classId: string, activityId: string, newTitle: string): Promise<void>;
  deleteActivity(professorId: string, classId: string, activityId: string): Promise<void>;
  getActivities(professorId: string, classId: string): Promise<ActivityEntity[]>;
}
