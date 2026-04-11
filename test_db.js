const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");

const firebaseConfig = {
  // Add user's firebase config here or just read raw REST
  databaseURL: "https://handwritten-ai-scorer-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function testFetch() {
  const profId = "rWdtn7SqluUsuEoBRbUOhfWcKOj1"; // Used in an earlier upload
  const classId = "-OmYxYnZ9PLsNnQsZnik"; // Used in the bug report

  const activitiesRef = ref(
    db,
    `professors/${profId}/classes/${classId}/activities`,
  );
  const snapshot = await get(activitiesRef);

  if (snapshot.exists()) {
    console.log("Activities raw:", snapshot.val());
  } else {
    console.log("No activities found");
  }

  const studentsRef = ref(
    db,
    `professors/${profId}/classes/${classId}/students`,
  );
  const studentSnap = await get(studentsRef);

  if (studentSnap.exists()) {
    console.log("Students raw:", studentSnap.val());
  } else {
    console.log("No students found");
  }
}

testFetch().then(() => process.exit(0));
