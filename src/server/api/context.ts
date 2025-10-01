import { AcademicCycleService } from './services/academic-cycle.service';
import { prisma } from '../db';
import type { Session } from 'next-auth';

interface ContextOptions {
  session: Session | null;
}

export const createContext = async (opts: ContextOptions) => {
  return {
    session: opts.session,
    prisma,
    academicCycle: new AcademicCycleService({ prisma }),
  };
}; 