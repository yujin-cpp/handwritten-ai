export interface ProfessorProfile {
  name: string;
  email?: string | null;
  createdAt?: string;
  photoURL?: string | null;
  personalEmail?: string;
  personalEmailVerified?: boolean;
  [key: string]: unknown;
}
