import { UserRole } from '../models';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
  role: UserRole;
      };
    }
  }
}
