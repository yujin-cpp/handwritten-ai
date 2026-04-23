import { get, onValue, push, ref, remove, update } from "firebase/database";
import { db } from "../../firebase/firebaseConfig";
import { IActivityRepository, ActivityEntity } from "../../domain/repositories/IActivityRepository";

export class FirebaseActivityRepository implements IActivityRepository {
  listenToActivities(professorId: string, classId: string, callback: (activities: ActivityEntity[]) => void): () => void {
    const activitiesRef = ref(db, `professors/${professorId}/classes/${classId}/activities`);
    return onValue(activitiesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as ActivityEntity[];
        
        // Sort by newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      } else {
        callback([]);
      }
    });
  }

  async addActivity(professorId: string, classId: string, title: string): Promise<void> {
    const activitiesRef = ref(db, `professors/${professorId}/classes/${classId}/activities`);
    await push(activitiesRef, {
      title,
      examSettings: {
        totalScore: 0,
        professorInstructions: "",
        objectiveTypes: {
          multipleChoice: { enabled: true, items: 0 },
          trueFalse: { enabled: false, items: 0 },
          identification: { enabled: false, items: 0 },
        },
        updatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    });
  }

  async updateActivity(professorId: string, classId: string, activityId: string, newTitle: string): Promise<void> {
    const activityRef = ref(db, `professors/${professorId}/classes/${classId}/activities/${activityId}`);
    await update(activityRef, {
      title: newTitle,
    });
  }

  async deleteActivity(professorId: string, classId: string, activityId: string): Promise<void> {
    const activityRef = ref(db, `professors/${professorId}/classes/${classId}/activities/${activityId}`);
    await remove(activityRef);
  }

  async getActivities(professorId: string, classId: string): Promise<ActivityEntity[]> {
    const activitiesRef = ref(db, `professors/${professorId}/classes/${classId}/activities`);
    const snapshot = await get(activitiesRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as ActivityEntity[];
    }
    return [];
  }
}

export const activityRepository = new FirebaseActivityRepository();
