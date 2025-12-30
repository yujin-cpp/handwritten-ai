import { get, onValue, push, ref, remove, set, update } from "firebase/database";
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
// 🔹 ADD STUDENT (Fixed to match your DB structure)
export const addStudent = async (
  professorId: string, 
  classId: string, 
  studentData: { name: string; studentId: string }
) => {
  // 1. Create a reference specifically to the Student ID
  // Path: professors/{uid}/classes/{classId}/students/{TUPM-xx-xxxx}
  const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentData.studentId}`);
  
  // 2. Use 'set' to lock the data to that ID
  await set(studentRef, {
    name: studentData.name,
    studentId: studentData.studentId,
    addedAt: new Date().toISOString(), // Matches the format in your JSON export
  });
};

// 🔹 UPDATE STUDENT
export const updateStudent = async (professorId: string, classId: string, studentKey: string, updates: { name?: string; studentId?: string }) => {
  const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentKey}`);
  await update(studentRef, updates);
};

// 🔹 DELETE STUDENT
export const deleteStudent = async (professorId: string, classId: string, studentKey: string) => {
  // Correct path: professors/{uid}/classes/{classId}/students/{studentKey}
  const studentRef = ref(db, `professors/${professorId}/classes/${classId}/students/${studentKey}`);
  await remove(studentRef);
};

// 🔹 ADD ACTIVITY
export const addActivity = async (professorId: string, classId: string, title: string) => {
  const activitiesRef = ref(db, `professors/${professorId}/classes/${classId}/activities`);
  await push(activitiesRef, {
    title,
    createdAt: new Date().toISOString(),
  });
};

// 🔹 LISTEN TO ACTIVITIES
export const listenToActivities = (professorId: string, classId: string, callback: (data: any[]) => void) => {
  const activitiesRef = ref(db, `professors/${professorId}/classes/${classId}/activities`);
  
  const unsubscribe = onValue(activitiesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert Object { key: { title: "..." } } -> Array [{ id: key, title: "..." }]
      const list = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      // Sort by newest first (optional)
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    } else {
      callback([]);
    }
  });

  return unsubscribe;
};

// 🔹 DELETE ACTIVITY
export const deleteActivity = async (professorId: string, classId: string, activityId: string) => {
  const activityRef = ref(db, `professors/${professorId}/classes/${classId}/activities/${activityId}`);
  await remove(activityRef);
};

// 🔹 UPDATE ACTIVITY TITLE
export const updateActivity = async (
  professorId: string, 
  classId: string, 
  activityId: string, 
  newTitle: string
) => {
  const activityRef = ref(db, `professors/${professorId}/classes/${classId}/activities/${activityId}`);
  await update(activityRef, {
    title: newTitle
  });
};

// 🔹 FETCH ALL STUDENTS IN A CLASS (For Dropdowns)
export const getStudentsInClass = async (professorId: string, classId: string) => {
  const studentsRef = ref(db, `professors/${professorId}/classes/${classId}/students`);
  const snapshot = await get(studentsRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    // Convert object to array of { label: "Last, First", value: "ID" }
    return Object.keys(data).map(key => ({
      id: key,
      name: data[key].name // Assuming name is stored as "Last, First"
    })).sort((a, b) => a.name.localeCompare(b.name));
  }
  return [];
};

// 🔹 FETCH ACTIVITIES (One-time fetch for Dropdowns)
export const getActivities = async (professorId: string, classId: string) => {
  const activitiesRef = ref(db, `professors/${professorId}/classes/${classId}/activities`);
  const snapshot = await get(activitiesRef);

  if (snapshot.exists()) {
    const data = snapshot.val();
    // Convert object to array
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
  }
  return [];
};