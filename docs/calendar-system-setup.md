# Calendar System Setup and Usage Guide

## Overview

This document provides comprehensive instructions for setting up and using the calendar system, including holiday management, academic events, and schedule patterns.

## Issues Fixed

### 1. TypeScript Compilation Errors
- ✅ Fixed `isRecurring` field issue in `pakistan-holidays.service.ts`
- ✅ Fixed missing `createdBy` field in holiday creation
- ✅ Fixed campus list API structure issue in calendar view page
- ✅ Added missing `list` endpoint to campus router
- ✅ Fixed User model creation requirements (username, institution)
- ✅ Fixed AcademicCalendarEvent creation requirements (academicCycleId)
- ✅ Fixed SchedulePattern schema alignment

### 2. Calendar Loading Issues
- ✅ Fixed calendar view page that was stuck loading
- ✅ Updated calendar view to use unified calendar API instead of just academic events
- ✅ Added proper campus list API endpoint with pagination
- ✅ Updated calendar view to use correct data structure from campus API
- ✅ Ensured unified calendar service has proper event fetching methods
- ✅ Fixed calendar events formatting to show both holidays and academic events

### 3. Missing API Endpoints and Data Display
- ✅ Added `campus.list` endpoint for calendar filtering
- ✅ Implemented proper error handling and data structure
- ✅ Added holiday list display to admin calendar holidays tab
- ✅ Added academic events list display to admin calendar events tab
- ✅ Fixed empty tabs showing no data even when data exists in database

### 4. Database Seeding Integration
- ✅ Integrated calendar seed scripts into main database seeding process
- ✅ Added Pakistan holidays seeding to main seed script
- ✅ Added academic events seeding to main seed script
- ✅ Added schedule patterns seeding to main seed script
- ✅ Ensured proper dependency order in seeding process

## Seed Data and Scripts Created

### 1. Pakistan Holidays Seeding
**File:** `scripts/seed-pakistan-holidays.ts`
- Seeds Pakistan public holidays for 2025-2027
- Includes national holidays (Kashmir Day, Pakistan Day, Independence Day, etc.)
- Includes religious holidays (Eid ul-Fitr, Eid ul-Adha, Ashura, etc.)
- Handles duplicate detection and updates

### 2. Academic Events Seeding
**File:** `scripts/seed-academic-events.ts`
- Seeds academic calendar events (registration, examinations, graduation, etc.)
- Creates schedule patterns for different working day configurations
- Supports 5-day, 6-day, and flexible working schedules
- Creates necessary institution and user data

### 3. Comprehensive Testing
**File:** `scripts/test-calendar-functionality.ts`
- Tests database connectivity
- Validates holiday creation and retrieval
- Tests academic event functionality
- Verifies schedule pattern creation
- Tests calendar data retrieval by date ranges

### 4. Master Seeding Script
**File:** `scripts/seed-all-calendar-data.ts`
- Runs all seeding operations in correct order
- Creates basic institution data if missing
- Provides comprehensive testing option
- Includes detailed progress reporting

## NPM Scripts Added

```json
{
  "seed:holidays": "Seed Pakistan holidays for 2025-2027",
  "seed:events": "Seed academic events and schedule patterns", 
  "seed:calendar": "Run all calendar seeding operations",
  "test:calendar": "Test calendar functionality",
  "seed:calendar:test": "Seed calendar data with comprehensive testing"
}
```

## Usage Instructions

### 1. Seed Calendar Data

```bash
# Seed only holidays
npm run seed:holidays

# Seed only academic events and schedule patterns
npm run seed:events

# Seed all calendar data
npm run seed:calendar

# Seed all calendar data with testing
npm run seed:calendar:test
```

### 2. Test Calendar Functionality

```bash
# Run comprehensive calendar tests
npm run test:calendar
```

### 3. Access Calendar Views

Navigate to the following URLs in your application:

- **Admin Calendar View:** `/admin/system/calendar/view`
- **Holiday Management:** `/admin/system/calendar/holidays`
- **Campus Calendar:** `/campus-admin/calendar`

## Calendar Features

### 1. Holiday Management
- Create, edit, and delete holidays
- Support for national and religious holidays
- Campus-specific or system-wide holidays
- Pakistan holidays pre-seeded for 2025-2027

### 2. Academic Events
- Registration periods
- Examination schedules
- Graduation ceremonies
- Add/drop periods
- Orientation events

### 3. Schedule Patterns
- Configurable working days (5-6 days/week)
- Customizable weekend configurations
- Support for different time zones and cultures
- Flexible scheduling options

### 4. Calendar Views
- Month, week, day, and year views
- Multi-campus calendar support
- Event filtering and search
- Conflict detection
- Role-based permissions

## Configuration

### Working Days Configuration

The system supports multiple working day patterns:

1. **Standard 5-Day Week:** Monday to Friday
2. **6-Day Week (Saturday Weekend):** Monday to Saturday
3. **6-Day Week (Friday Weekend):** Saturday to Thursday  
4. **Flexible 4-Day Week:** Tuesday to Friday

### Holiday Types

- **NATIONAL:** National holidays (Pakistan Day, Independence Day)
- **RELIGIOUS:** Religious observances (Eid, Ashura)
- **INSTITUTIONAL:** School-specific holidays
- **ADMINISTRATIVE:** Administrative closures
- **WEATHER:** Weather-related closures
- **OTHER:** Miscellaneous holidays

## Troubleshooting

### Common Issues

1. **Calendar not loading:** Ensure database is connected and seeded
2. **No holidays showing:** Run `npm run seed:holidays`
3. **Campus filter empty:** Check campus data exists in database
4. **TypeScript errors:** Ensure all dependencies are installed

### Database Requirements

Ensure the following tables exist and are properly migrated:
- `holidays`
- `academic_calendar_events`
- `schedule_patterns`
- `campuses`
- `institutions`
- `users`

## Support

For issues or questions:
1. Check the test results: `npm run test:calendar`
2. Review the seeding logs for errors
3. Ensure database connectivity
4. Verify user permissions for calendar access

## Next Steps

1. Customize holiday dates based on actual lunar calendar
2. Add more academic event types as needed
3. Implement calendar sync with external systems
4. Add notification system for upcoming events
5. Implement recurring event patterns
