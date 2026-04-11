export type PasswordRuleCheck = {
  id: string;
  label: string;
  met: boolean;
};

export const getPasswordRuleChecks = (password: string): PasswordRuleCheck[] => [
  {
    id: "lower",
    label: "At least 1 lowercase letter",
    met: /[a-z]/.test(password),
  },
  {
    id: "upper",
    label: "At least 1 uppercase letter",
    met: /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "At least 1 number",
    met: /\d/.test(password),
  },
  {
    id: "special",
    label: "At least 1 special character",
    met: /[~`!@#$%^&*()\-_\+={}\[\]|\\;:"<>,./?]/.test(password),
  },
];

export const isPasswordStrong = (password: string) =>
  getPasswordRuleChecks(password).every((rule) => rule.met);
