# User Roles and Permissions System - Complete Implementation Analysis

## Overview

The User Roles and Permissions System provides comprehensive access control and authorization management for the Teacher Assistant platform. It implements a hierarchical role-based access control (RBAC) system that governs user interactions across all platform features, ensuring appropriate access levels for different user types while maintaining security and compliance.

## System Architecture

### Core Components

#### 1. User Type Enumeration
- **Location**: `src/server/api/constants.ts`, `src/types/user.ts`, `prisma/schema.prisma`
- **Purpose**: Define all user roles in the system
- **Implementation**: Consistent enum across TypeScript and Prisma

```typescript
enum UserType {
  // Core System Roles
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  SYSTEM_MANAGER = "SYSTEM_MANAGER",
  
  // Campus Roles
  CAMPUS_ADMIN = "CAMPUS_ADMIN",
  CAMPUS_COORDINATOR = "CAMPUS_COORDINATOR", 
  CAMPUS_TEACHER = "CAMPUS_TEACHER",
  CAMPUS_STUDENT = "CAMPUS_STUDENT",
  CAMPUS_PARENT = "CAMPUS_PARENT",
}
```

#### 2. Authorization Middleware
- **Location**: `src/server/api/middleware/authorization.ts`
- **Purpose**: Centralized permission checking
- **Features**:
  - Role-based permission validation
  - Campus-specific access control
  - Permission caching for performance

#### 3. Authentication System
- **Location**: `src/lib/auth.ts`
- **Purpose**: User authentication and session management
- **Features**:
  - NextAuth integration
  - Session caching with LRU cache
  - Role-based redirects

## User Role Hierarchy and Permissions

### System-Level Roles

#### System Administrator (SYSTEM_ADMIN)
- **Scope**: Entire platform across all institutions
- **Permissions**:
  - Full system access and configuration
  - Institution and campus management
  - User management across all levels
  - System-wide analytics and reporting
  - Security and compliance oversight

#### System Manager (SYSTEM_MANAGER)
- **Scope**: Platform operations and management
- **Permissions**:
  - Operational system management
  - Multi-institution oversight
  - System performance monitoring
  - User support and troubleshooting
  - Limited administrative functions

### Campus-Level Roles

#### Campus Administrator (CAMPUS_ADMIN)
- **Scope**: Single campus administration
- **Permissions**:
  - Campus-wide user management
  - Academic program oversight
  - Resource allocation and management
  - Campus-specific analytics
  - Policy implementation and enforcement

```typescript
// Campus admin permission check example
const allowedRoles = [
  UserType.SYSTEM_ADMIN,
  UserType.SYSTEM_MANAGER,
  UserType.CAMPUS_ADMIN,
  UserType.CAMPUS_COORDINATOR
];

if (!allowedRoles.includes(ctx.session.user.userType as UserType)) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Insufficient permissions",
  });
}
```

#### Campus Coordinator (CAMPUS_COORDINATOR)
- **Scope**: Academic coordination within campus
- **Permissions**:
  - Program and course management
  - Teacher assignment and scheduling
  - Academic calendar management
  - Student enrollment oversight
  - Curriculum coordination

#### Campus Teacher (CAMPUS_TEACHER)
- **Scope**: Teaching responsibilities within campus
- **Permissions**:
  - Class and student management
  - Resource creation and sharing
  - Assessment and grading
  - Lesson planning and curriculum delivery
  - Parent communication

```typescript
// Teacher-specific permission validation
if (!ctx.session?.user?.id || 
    (ctx.session.user.userType !== UserType.CAMPUS_TEACHER && 
     ctx.session.user.userType !== 'TEACHER')) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Only teachers can use the Teacher Assistant",
  });
}
```

#### Campus Student (CAMPUS_STUDENT)
- **Scope**: Learning activities within campus
- **Permissions**:
  - Course enrollment and participation
  - Resource access and consumption
  - Assignment submission
  - Assessment participation
  - Peer collaboration

#### Campus Parent (CAMPUS_PARENT)
- **Scope**: Child's academic progress monitoring
- **Permissions**:
  - Child's academic progress viewing
  - Communication with teachers
  - Event and calendar access
  - Limited resource access
  - Report and analytics viewing

## Business Logic Implementation

### Authentication Flow
```typescript
// NextAuth configuration with role-based redirects
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate credentials and return user with role
        const user = await validateUser(credentials);
        return user;
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl, token }) {
      // Role-based redirect logic
      const userType = token?.userType as UserType;
      
      switch (userType) {
        case UserType.SYSTEM_ADMIN:
          return `${baseUrl}/admin`;
        case UserType.CAMPUS_ADMIN:
          return `${baseUrl}/campus-admin`;
        case UserType.CAMPUS_TEACHER:
          return `${baseUrl}/teacher`;
        case UserType.CAMPUS_STUDENT:
          return `${baseUrl}/student`;
        default:
          return baseUrl;
      }
    }
  }
};
```

### Permission Checking System
```typescript
// Basic permission check function
export const checkPermission = (userType: UserType, permission: string) => {
  if (userType === 'SYSTEM_ADMIN') {
    return true; // System admin has all permissions
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userType] || [];
  return rolePermissions.includes(permission);
};

// Advanced permission check with context
interface UserPermission {
  permission: {
    id: string;
    name: string;
    code: string;
    scope: AccessScope;
    entityType: EntityType | null;
  };
  campusId?: string | null;
}
```

### Campus-Specific Access Control
```typescript
// Campus access validation
const userCampusAccess = await ctx.prisma.userCampusAccess.findFirst({
  where: {
    userId: ctx.session?.user?.id,
    campusId: input.campusId,
    status: 'ACTIVE' as SystemStatus,
  },
});

if (!userCampusAccess) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You do not have permission to access this campus',
  });
}
```

## Role-Specific Feature Access

### Teacher Assistant Access
- **Allowed Roles**: CAMPUS_TEACHER, TEACHER
- **Validation**: Strict teacher role validation
- **Context**: Teacher profile and subject qualifications
- **Features**: Full AI assistant capabilities

### Resource Management Access
#### Teachers
- **Create**: Personal and class resources
- **Read**: Own resources, shared resources, public resources
- **Update**: Own resources
- **Delete**: Own resources
- **Share**: With students, colleagues, or publicly

#### Students
- **Create**: Personal resources only
- **Read**: Course resources, shared resources, public resources, own resources
- **Update**: Own resources only
- **Delete**: Own resources only
- **Share**: Limited sharing capabilities

#### Administrators
- **Create**: System-wide resources
- **Read**: All resources within scope
- **Update**: Resources within administrative scope
- **Delete**: Resources within administrative scope
- **Share**: System-wide sharing capabilities

### Calendar System Access
#### Personal Calendar
- **All Users**: Full CRUD on personal events
- **Visibility**: Private by default, shareable

#### Academic Calendar
- **Administrators**: Create and manage academic events
- **Teachers**: View academic events, create class-related events
- **Students**: View academic events, create personal study events

#### System Calendar
- **System Admins**: Full system calendar management
- **Campus Admins**: Campus-specific calendar management
- **Users**: View relevant calendar events

## Database Schema Integration

### User Model
```prisma
model User {
  id                String           @id @default(cuid())
  name              String?
  email             String?          @unique
  username          String           @unique
  userType          UserType
  status            SystemStatus     @default(ACTIVE)
  accessScope       AccessScope      @default(SINGLE_CAMPUS)
  primaryCampusId   String?
  institutionId     String
  
  // Relations
  activeCampuses    UserCampusAccess[]
  permissions       UserPermission[]
  teacherProfile    TeacherProfile?
  studentProfile    StudentProfile?
  
  // Audit fields
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  lastLoginAt       DateTime?
}
```

### Permission System
```prisma
model UserPermission {
  id           String     @id @default(cuid())
  userId       String
  permissionId String
  campusId     String?
  settings     Json?
  status       SystemStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  user         User       @relation(fields: [userId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
}

model Permission {
  id          String        @id @default(cuid())
  name        String
  code        String        @unique
  description String?
  scope       AccessScope
  entityType  EntityType?
  status      SystemStatus  @default(ACTIVE)
  
  userPermissions UserPermission[]
}
```

### Campus Access Control
```prisma
model UserCampusAccess {
  id       String       @id @default(cuid())
  userId   String
  campusId String
  status   SystemStatus @default(ACTIVE)
  startDate DateTime?
  endDate   DateTime?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  
  user     User         @relation(fields: [userId], references: [id])
  campus   Campus       @relation(fields: [campusId], references: [id])
}
```

## Security Implementation

### Session Management
```typescript
// Session caching with LRU for performance
const sessionCache = new LRUCache<string, any>({
  max: 5000, // Support 5000 concurrent sessions
  ttl: 10 * 60 * 1000, // 10 minutes
});

// JWT token cache to avoid repeated database lookups
const jwtCache = new LRUCache<string, any>({
  max: 10000,
  ttl: 15 * 60 * 1000, // 15 minutes
});
```

### Access Control Middleware
```typescript
// Protected procedure with role validation
export const protectedProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
```

### Role-Based Route Protection
```typescript
// Route-level protection based on user roles
const ADMIN_ROLES = [
  UserType.SYSTEM_ADMIN,
  UserType.SYSTEM_MANAGER,
  UserType.CAMPUS_ADMIN,
  UserType.CAMPUS_COORDINATOR,
] as const;

// Check if user has admin privileges
const hasAdminAccess = (userType: UserType) => {
  return ADMIN_ROLES.includes(userType as any);
};
```

## Performance Optimization

### Permission Caching
- **User Permission Cache**: Cache user permissions for faster access
- **Role Permission Cache**: Cache role-based permissions
- **Campus Access Cache**: Cache campus access permissions
- **Session Cache**: Cache user session data

### Database Optimization
- **Indexed Queries**: Proper indexing on user and permission tables
- **Query Optimization**: Efficient permission checking queries
- **Connection Pooling**: Optimized database connections
- **Batch Operations**: Batch permission checks where possible

## Audit and Compliance

### Access Logging
- **Login Tracking**: Track user login attempts and success
- **Permission Changes**: Log permission modifications
- **Access Attempts**: Log unauthorized access attempts
- **Administrative Actions**: Log all administrative actions

### Compliance Features
- **GDPR Compliance**: User data protection and privacy
- **FERPA Compliance**: Educational record privacy
- **Audit Trails**: Comprehensive audit logging
- **Data Retention**: Configurable data retention policies

## Future Enhancements

### Planned Features
- **Fine-Grained Permissions**: More granular permission system
- **Dynamic Role Assignment**: Runtime role assignment
- **Multi-Factor Authentication**: Enhanced security
- **Single Sign-On Integration**: SSO provider integration
- **Advanced Audit Analytics**: Enhanced audit and compliance reporting

### Integration Opportunities
- **External Identity Providers**: Integration with external auth systems
- **Role-Based Analytics**: Advanced role-based analytics
- **Automated Permission Management**: AI-driven permission suggestions
- **Compliance Automation**: Automated compliance checking
- **Advanced Security Features**: Enhanced security and monitoring
