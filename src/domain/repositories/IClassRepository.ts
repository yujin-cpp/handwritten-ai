import { ClassEntity } from '../entities/Class';

export interface IClassRepository {
  getClassesByProfessorId(professorId: string): Promise<ClassEntity[]>;
  listenToClasses(professorId: string, callback: (classes: ClassEntity[]) => void): () => void;
  listenToClassesRaw(professorId: string, callback: (data: any) => void): () => void;
  createClass(professorId: string, classData: Omit<ClassEntity, 'id' | 'createdAt'>): Promise<string>;
  updateClass(professorId: string, classId: string, updates: Partial<ClassEntity>): Promise<void>;
}
