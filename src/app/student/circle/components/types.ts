/**
 * TypeScript interfaces for Circle feature components
 */

export interface ClassMember {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER';
  enrollmentNumber?: string;
  isCurrentUser: boolean;
  sortOrder?: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  courseName: string;
  termName: string;
}

export interface ClassWithMembers {
  id: string;
  name: string;
  code: string;
  courseName: string;
  termName: string;
  memberCounts: {
    students: number;
    teachers: number;
    total: number;
  };
}

export interface MemberCardProps {
  member: ClassMember;
  showRole?: boolean;
  compact?: boolean;
  className?: string;
}

export interface CircleGridProps {
  members: ClassMember[];
  currentUserId: string;
  classInfo: ClassInfo;
  isLoading?: boolean;
  className?: string;
}

export interface CircleHeaderProps {
  classInfo: ClassInfo;
  memberCounts: {
    total: number;
    students: number;
    teachers: number;
  };
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export interface ClassSelectorProps {
  classes: ClassWithMembers[];
  selectedClassId?: string;
  onClassSelect: (classId: string) => void;
  isLoading?: boolean;
  className?: string;
}
