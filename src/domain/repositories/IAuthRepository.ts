import { User } from '../entities/User';

export interface IAuthRepository {
  getCurrentUser(): Promise<User | null>;
  logout(): Promise<void>;
  getProfessorProfile(professorId: string): Promise<User | null>;
  createProfessorProfile(professorId: string, data: Partial<User>): Promise<void>;
}
