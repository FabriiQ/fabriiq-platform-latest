/**
 * Type definitions for the reward system
 */
import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Extended PrismaClient type with reward system models
 * Using composition instead of inheritance to avoid compatibility issues
 */
export type RewardSystemPrismaClient = PrismaClient;

/**
 * StudentProfile with reward system fields
 */
export interface StudentProfileWithRewards {
  id: string;
  totalPoints?: number;
  currentLevel?: number;
  [key: string]: any;
}

/**
 * StudentPoints model
 */
export interface StudentPoints {
  id: string;
  studentId: string;
  amount: number;
  source: string;
  sourceId?: string;
  classId?: string;
  subjectId?: string;
  description?: string;
  createdAt: Date;
  status: SystemStatus;
}

/**
 * StudentLevel model
 */
export interface StudentLevel {
  id: string;
  studentId: string;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  classId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: SystemStatus;
}

/**
 * StudentAchievement model
 */
export interface StudentAchievement {
  id: string;
  studentId: string;
  title: string;
  description: string;
  type: string;
  classId?: string;
  subjectId?: string;
  progress: number;
  total: number;
  unlocked: boolean;
  unlockedAt?: Date;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  status: SystemStatus;
}

/**
 * StudentPointsAggregate model
 */
export interface StudentPointsAggregate {
  id: string;
  studentId: string;
  classId?: string;
  subjectId?: string;
  courseId?: string;
  campusId?: string;
  date: Date;
  dailyPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  termPoints: number;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * LeaderboardSnapshot model
 */
export interface LeaderboardSnapshot {
  id: string;
  type: string;
  referenceId: string;
  snapshotDate: Date;
  entries: any;
  metadata?: any;
  createdAt: Date;
  status: SystemStatus;
}
