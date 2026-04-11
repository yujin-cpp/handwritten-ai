import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { auth } from "../firebase/firebaseConfig";
import { showAlert } from "../utils/alert";

const DEFAULT_TITLE = "Account Verification Required";
const DEFAULT_MESSAGE =
  "Please verify your university email from the Profile tab before using this feature.";

export function useVerificationGate() {
  const [isVerified, setIsVerified] = useState(() => !!auth.currentUser?.emailVerified);
  const [checkingVerification, setCheckingVerification] = useState(true);

  const refreshVerification = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setIsVerified(false);
      setCheckingVerification(false);
      return false;
    }

    setCheckingVerification(true);
    try {
      await currentUser.reload();

      const verified = !!currentUser.emailVerified;
      setIsVerified(verified);
      return verified;
    } finally {
      setCheckingVerification(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshVerification();
    }, [refreshVerification])
  );

  const requireVerified = useCallback(
    async (
      action?: () => void | Promise<void>,
      title = DEFAULT_TITLE,
      message = DEFAULT_MESSAGE
    ) => {
      const verified = await refreshVerification();

      if (!verified) {
        showAlert(title, message);
        return false;
      }

      if (action) {
        await action();
      }

      return true;
    },
    [refreshVerification]
  );

  return {
    isVerified,
    checkingVerification,
    refreshVerification,
    requireVerified,
  };
}
