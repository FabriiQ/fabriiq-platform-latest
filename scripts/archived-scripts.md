# Archived NPM Scripts

This file contains the actual scripts that were removed during consolidation.
You can restore any of these by copying them back to package.json.

## Archived Scripts:

### dev:fast
```json
"dev:fast": "node scripts/fast-startup.js"
```

### build:optimized
```json
"build:optimized": "node scripts/build-optimized.js"
```

### build:memory
```json
"build:memory": "node scripts/build-memory.js"
```

### build:no-lint
```json
"build:no-lint": "node scripts/build-no-lint.js"
```

### server
```json
"server": "node scripts/clear-sessions.js && node server.js"
```

### migrate:term-structure
```json
"migrate:term-structure": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/migrations/manual/term-structure-update.ts"
```

### cleanup-auth
```json
"cleanup-auth": "node scripts/cleanup-auth.js"
```

### consolidate-auth
```json
"consolidate-auth": "node scripts/consolidate-auth.js"
```

### cleanup-expired-sessions
```json
"cleanup-expired-sessions": "node scripts/cleanup-expired-sessions.js"
```

### assign-primary-campus
```json
"assign-primary-campus": "ts-node src/scripts/assign-primary-campus.ts"
```

### canvas:server
```json
"canvas:server": "npx @langchain/langgraph-cli dev --port 54367"
```

### db:seed-subjects
```json
"db:seed-subjects": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/seed-subjects.ts"
```

### db:check-subjects
```json
"db:check-subjects": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/check-subjects.ts"
```

### db:simple-seed
```json
"db:simple-seed": "ts-node --project prisma/tsconfig.json prisma/simple-seed.ts"
```

### db:robust-seed
```json
"db:robust-seed": "ts-node --project prisma/tsconfig.json prisma/robust-seed.ts"
```

### db:learning-content-seed
```json
"db:learning-content-seed": "ts-node --project prisma/tsconfig.json prisma/learning-content-seed.ts"
```

### db:complete-seed
```json
"db:complete-seed": "ts-node --project prisma/tsconfig.json prisma/complete-seed.ts"
```

### db:teacher-assignments-seed
```json
"db:teacher-assignments-seed": "ts-node --project prisma/tsconfig.json prisma/teacher-assignments-seed.ts"
```

### db:seed-subject-topics
```json
"db:seed-subject-topics": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/seed-subject-topics.ts"
```

### db:simple-seed-topics
```json
"db:simple-seed-topics": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/simple-seed-topics.ts"
```

### db:seed-activities-by-type
```json
"db:seed-activities-by-type": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/seed-activities-by-type.ts"
```

### db:seed-bulk-students
```json
"db:seed-bulk-students": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/seed-bulk-students.ts"
```

### db:check-class-activities
```json
"db:check-class-activities": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/check-class-activities.ts"
```

### db:add-activities-to-class
```json
"db:add-activities-to-class": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/add-activities-to-class.ts"
```

### db:simple-add-activities
```json
"db:simple-add-activities": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/simple-add-activities.ts"
```

### db:cleanup-activities
```json
"db:cleanup-activities": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/cleanup-activities.ts"
```

### db:add-seeded-activities-to-class
```json
"db:add-seeded-activities-to-class": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/server/db/add-seeded-activities-to-class.ts"
```

### migrate:reward-system
```json
"migrate:reward-system": "node scripts/migrate-reward-system.js"
```

### migrate:supabase
```json
"migrate:supabase": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/migrate-to-supabase.ts"
```

### create-question-banks
```json
"create-question-banks": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/create-question-banks-for-subjects.ts"
```

### db:create-question-banks
```json
"db:create-question-banks": "ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/create-question-banks.ts"
```

### test:class-overview
```json
"test:class-overview": "node scripts/test-class-overview.js"
```

### test:class-overview:unit
```json
"test:class-overview:unit": "node scripts/test-class-overview.js unit"
```

### test:class-overview:integration
```json
"test:class-overview:integration": "node scripts/test-class-overview.js integration"
```

### test:class-overview:e2e
```json
"test:class-overview:e2e": "node scripts/test-class-overview.js e2e"
```

### test:class-overview:performance
```json
"test:class-overview:performance": "node scripts/test-class-overview.js performance"
```

### build:force
```json
"build:force": "cross-env TYPESCRIPT_NO_TYPE_CHECK=true TSC_COMPILE_ON_ERROR=true ESLINT_NO_DEV_ERRORS=true next build"
```


## Script Categories:

### Build Variants
These were consolidated into the main `build` script:
- build:optimized
- build:memory
- build:no-lint
- build:force
- dev:fast

### Database Seeding
These were consolidated into `db:seed`:
- db:seed-subjects
- db:check-subjects
- db:simple-seed
- db:robust-seed
- db:learning-content-seed
- db:complete-seed
- db:teacher-assignments-seed
- db:seed-subject-topics
- db:simple-seed-topics
- db:seed-activities-by-type
- db:seed-bulk-students
- db:check-class-activities
- db:add-activities-to-class
- db:simple-add-activities
- db:cleanup-activities
- db:add-seeded-activities-to-class

### Test Variants  
These were consolidated into main test scripts:
- test:class-overview
- test:class-overview:unit
- test:class-overview:integration
- test:class-overview:e2e
- test:class-overview:performance

---
*Generated during build scripts consolidation on 2025-08-06T16:28:29.109Z*
