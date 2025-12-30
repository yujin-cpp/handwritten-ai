import { get, onValue, push, ref, remove, update } from "firebase/database";
import { db } from "../firebase/firebaseConfig";

// 1. Create a Class (Nested under Professor)
export const createClass = async (
  professorId: string, 
  classData: { className: string; section: string; semester: string; themeColor: string }
) => {
  try {
    // Reference to: professors/{uid}/classes
    const classesRef = ref(db, `professors/${professorId}/classes`);
    
    // Generate a new key
    const newClassKey = push(classesRef).key;
    if (!newClassKey) throw new Error("Could not generate class ID");

    // Path to specific class
    const classPath = `professors/${professorId}/classes/${newClassKey}`;

    // Update with data
    await update(ref(db), {
      [`${classPath}`]: {
        ...classData,
        createdAt: new Date().toISOString(),
      }
    });

    return newClassKey;
  } catch (error) {
    console.error("Error creating class:", error);
    throw error;
  }
};

// 2. Get Classes (Fetch from Professor's node)
export const getClasses = async (professorId: string) => {
  try {
    const snapshot = await get(ref(db, `professors/${professorId}/classes`));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error("Error fetching classes:", error);
    return {};
  }
};

export const updateClass = async (
  professorId: string,
  classId: string,
  updates: {
    className?: string;
    section?: string;
    semester?: string;
    themeColor?: string;
  }
) => {
  try {
    const classRef = ref(db, `professors/${professorId}/classes/${classId}`);
    await update(classRef, updates);
  } catch (error) {
    console.error("Error updating class:", error);
    throw error;
  }
};

export const listenToClasses = (professorId: string, callback: (data: any) => void) => {
  const classesRef = ref(db, `professors/${professorId}/classes`);
  
  // onValue fires every time the data changes in the DB
  const unsubscribe = onValue(classesRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });

  // Return the unsubscribe function so we can stop listening when the component unmounts
  return unsubscribe;
};

export const listenToStudents = (professorId: string, classId: string, callback: (data: any[]) => void) => {
  const studentsRef = ref(db, `professors/${professorId}/classes/${classId}/students`);
  
  const unsubscribe = onValue(studentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert Object { key: val } to Array [{ id: key, ...val }]
      const studentList = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(studentList);
    } else {
      callback([]);
    }
  });

  return unsubscribe;
};

// 🔹 ADD STUDENT
export const addStudent = async (professorId: string, classId: string, studentData: { name: string; studentId: string }) => {
  const studentsRef = ref(db, `professors/${professorId}/classes/${classId}/students`);
  await push(studentsRef, studentData);
};

// 🔹 UPDATE STUDENT
export const updateStudent = async (professorId: string, classId: string, studentKey: string, updates: { name?: string; studentId?: string }) => {
  const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentKey}`);
  await update(studentRef, updates);
};

// 🔹 DELETE STUDENT
export const deleteStudent = async (professorId: string, classId: string, studentKey: string) => {
  const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentKey}`);
  await remove(studentRef);
};