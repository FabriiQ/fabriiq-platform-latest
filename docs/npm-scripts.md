# NPM Scripts Documentation

This document describes the consolidated npm scripts for the FabriiQ platform.

## Core Scripts

### Development
- `npm run dev` - Start development server with custom server
- `npm run dev:next` - Start Next.js development server only
- `npm run build` - Build for production
- `npm run build:analyze` - Build with bundle analysis
- `npm run start` - Start production server
- `npm run start:next` - Start Next.js production server

### Testing
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint

### Database
- `npm run db:seed` - Seed database with sample data
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database (careful!)
- `npm run db:studio` - Open Prisma Studio

### Utilities
- `npm run analyze-bundle` - Analyze bundle size
- `npm run cleanup` - Clean up root directory
- `npm run clear-sessions` - Clear expired sessions

## Archived Scripts

Many scripts were archived during consolidation. See `scripts/archived-scripts.md` for the complete list of removed scripts and how to restore them if needed.

## Adding New Scripts

When adding new scripts, follow these guidelines:

1. **Keep it essential** - Only add scripts that are frequently used
2. **Use clear names** - Script names should be self-explanatory
3. **Group by purpose** - Use prefixes like `db:`, `test:`, `build:`
4. **Document thoroughly** - Update this file when adding new scripts

## Script Naming Conventions

- `dev:*` - Development-related scripts
- `build:*` - Build-related scripts  
- `test:*` - Testing-related scripts
- `db:*` - Database-related scripts
- No prefix - Core scripts (dev, build, start, test, lint)

---
*Last updated: 2025-08-06T16:28:29.141Z*
