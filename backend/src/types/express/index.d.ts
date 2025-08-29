import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: PrismaUser['role'];
      };
    }
  }
}
