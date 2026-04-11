export interface ClassInput {
  className: string;
  section: string;
  semester: string;
  themeColor: string;
}

export interface StudentInput {
  name: string;
  studentId: string;
}

export interface StudentActivityRecord {
  score?: number;
  total?: number;
  status?: string;
  images?: string[];
  confidenceScore?: number;
  legibility?: string;
  verificationLog?: string;
  transcribedText?: string;
  gradedAt?: string;
  [key: string]: unknown;
}

export interface StudentRecord {
  name: string;
  studentId: string;
  addedAt?: string;
  activities?: Record<string, StudentActivityRecord>;
  [key: string]: unknown;
}

export interface StudentListItem extends StudentRecord {
  id: string;
}

export interface ActivityRecord {
  title: string;
  createdAt?: string;
  total?: number;
  passingScore?: number;
  [key: string]: unknown;
}

export interface ActivityListItem extends ActivityRecord {
  id: string;
}

export interface ClassRecord extends ClassInput {
  createdAt?: string;
  students?: Record<string, StudentRecord>;
  activities?: Record<string, ActivityRecord>;
  [key: string]: unknown;
}

export type ClassMap = Record<string, ClassRecord>;
