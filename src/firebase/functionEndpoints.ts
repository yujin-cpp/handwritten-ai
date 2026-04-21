const CALLABLE_BASE_URL =
  "https://us-central1-handwritten-ai-scorer.cloudfunctions.net";

export const CALLABLE_URLS = {
  sendOtpEmail: `${CALLABLE_BASE_URL}/sendOtpEmail`,
  resetPasswordWithOtp: `${CALLABLE_BASE_URL}/resetPasswordWithOtp`,
  verifyPersonalEmail: `${CALLABLE_BASE_URL}/verifyPersonalEmail`,
} as const;
