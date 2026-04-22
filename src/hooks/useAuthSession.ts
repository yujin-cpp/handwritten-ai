import { useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [initializing, setInitializing] = useState(!auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    uid: user?.uid ?? "",
    initializing,
  };
}
