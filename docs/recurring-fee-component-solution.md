# Recurring Fee Component Solution

## Problem Analysis

The current fee management system has a structural flaw where recurring settings are applied at the **fee structure level** rather than the **individual component level**. This doesn't match real-world scenarios where:

- **One-time fees**: Admission Fee, Security Deposit, Books, Registration Fee
- **Recurring fees**: Tuition Fee (monthly), Lab Fee, Library Fee, Transport Fee
- **Mixed billing**: First invoice includes both one-time fees + advance recurring fees

## Solution Overview

### 1. Enhanced Fee Component Structure

**Before:**
```typescript
interface FeeComponent {
  name: string;
  type: FeeComponentType;
  amount: number;
  description?: string;
}
```

**After:**
```typescript
interface FeeComponent {
  name: string;
  type: FeeComponentType;
  amount: number;
  description?: string;
  isRecurring?: boolean;        // NEW: Component-level recurring flag
  recurringInterval?: string;   // NEW: Component-level interval
}
```

### 2. Updated Fee Structure Logic

**Fee Structure Level:**
- `isRecurring`: Now means "Auto-Generate Recurring Fees"
- `recurringInterval`: Now means "Default Billing Cycle"
- Used for automation settings, not individual component behavior

**Component Level:**
- Each component has its own `isRecurring` and `recurringInterval`
- Allows mixing one-time and recurring components in same structure
- Enables different intervals per component (e.g., monthly tuition, quarterly lab fee)

## Implementation Details

### 1. Database Schema (No Changes Required)

The existing `feeComponents` JSON field in `FeeStructure` table can accommodate the new fields:

```json
{
  "feeComponents": [
    {
      "name": "Admission Fee",
      "type": "ADMISSION",
      "amount": 5000,
      "isRecurring": false
    },
    {
      "name": "Tuition Fee",
      "type": "TUITION", 
      "amount": 3000,
      "isRecurring": true,
      "recurringInterval": "MONTHLY"
    }
  ]
}
```

### 2. New Service: RecurringFeeProcessingService

**Key Methods:**
- `processEnrollmentFees()`: Separates one-time and recurring components on enrollment
- `generateRecurringFees()`: Automated recurring fee generation (cron job)
- `getFeeBreakdown()`: Shows one-time vs recurring fee breakdown

**Processing Logic:**
1. **Initial Enrollment**: Creates separate `EnrollmentFee` records for one-time and recurring components
2. **Recurring Generation**: Daily cron job creates new fees based on component intervals
3. **Smart Detection**: Checks last fee generation date to avoid duplicates

### 3. Updated UI Components

**Fee Structure Form:**
- Component dialog now includes recurring settings per component
- Visual indicators show which components are recurring
- Structure-level settings renamed for clarity

**Component Display:**
- One-time components show green "One-time" badge
- Recurring components show blue interval badge (e.g., "MONTHLY")

### 4. Cron Job Integration

**New Scheduled Task:**
- Runs daily at 5 AM
- Processes all active enrollments
- Generates recurring fees based on component intervals
- Provides detailed logging and error handling

## Real-World Example

### Scenario: Student Enrollment

**Fee Structure: "Grade 10 - Main Campus"**
```json
{
  "name": "Grade 10 - Main Campus",
  "isRecurring": true,
  "recurringInterval": "MONTHLY",
  "feeComponents": [
    {
      "name": "Admission Fee",
      "type": "ADMISSION",
      "amount": 10000,
      "isRecurring": false
    },
    {
      "name": "Security Deposit", 
      "type": "REGISTRATION",
      "amount": 5000,
      "isRecurring": false
    },
    {
      "name": "Books",
      "type": "MISCELLANEOUS", 
      "amount": 3000,
      "isRecurring": false
    },
    {
      "name": "Tuition Fee",
      "type": "TUITION",
      "amount": 8000,
      "isRecurring": true,
      "recurringInterval": "MONTHLY"
    },
    {
      "name": "Lab Fee",
      "type": "LABORATORY",
      "amount": 1000,
      "isRecurring": true,
      "recurringInterval": "MONTHLY"
    }
  ]
}
```

**Generated Enrollment Fees:**

**Initial Enrollment (Day 1):**
1. **One-time Fee**: $18,000 (Admission + Security + Books)
2. **First Recurring Fee**: $9,000 (Tuition + Lab for Month 1)

**Monthly Automation:**
- **Month 2**: New $9,000 recurring fee created
- **Month 3**: New $9,000 recurring fee created
- And so on...

## Benefits

### 1. Accurate Real-World Modeling
- Matches actual school billing practices
- Separates one-time from recurring charges
- Supports complex fee structures

### 2. Flexible Component Management
- Different intervals per component
- Easy to modify individual component settings
- Clear visual distinction in UI

### 3. Automated Processing
- Reliable cron job automation
- Prevents duplicate fee generation
- Comprehensive error handling and logging

### 4. Backward Compatibility
- Existing fee structures continue to work
- No database migration required
- Gradual adoption possible

## API Endpoints

### New Endpoints Added:

1. **Process Enrollment Fees**
   ```typescript
   processEnrollmentFeesWithRecurring: {
     input: { enrollmentId: string, feeStructureId: string }
     output: { oneTimeAmount: number, recurringAmount: number, ... }
   }
   ```

2. **Get Fee Breakdown**
   ```typescript
   getFeeBreakdown: {
     input: { enrollmentId: string }
     output: { oneTimeFees: [], recurringFees: [], totals: {} }
   }
   ```

3. **Manual Recurring Generation**
   ```typescript
   generateRecurringFees: {
     input: { dryRun: boolean }
     output: { processed: number, created: number, errors: [] }
   }
   ```

## Admin Interface

**New Page: `/admin/system/fee-management/recurring-fees`**

Features:
- Overview of recurring fee system
- Manual processing with dry-run capability
- Processing results and error reporting
- System statistics and monitoring

## Migration Strategy

### Phase 1: Enhanced Components (Current)
- Update fee component interface
- Enhance UI forms
- Add new service layer

### Phase 2: Gradual Adoption
- Update existing fee structures to use component-level settings
- Test with pilot programs
- Monitor automated processing

### Phase 3: Full Deployment
- Enable automated cron jobs
- Train staff on new interface
- Monitor and optimize performance

## Testing Recommendations

1. **Create Test Fee Structure** with mixed components
2. **Test Enrollment Processing** to verify separation
3. **Run Dry-Run Generation** to check automation
4. **Verify Cron Job** scheduling and execution
5. **Test Admin Interface** for monitoring and control

This solution provides a robust, flexible, and scalable approach to handling recurring fees while maintaining backward compatibility with the existing system.

## Troubleshooting

### Chunk Loading Error Fix

If you encounter the error:
```
Error: Failed to load chunk /_next/static/chunks/src_components_shared_entities_e4afb297._.js
```

**Solution:**
1. Stop the development server (Ctrl+C)
2. Clear Next.js cache: `rm -rf .next` (or `rmdir /s .next` on Windows)
3. Restart the development server: `npm run dev`

This error typically occurs due to module resolution issues during development and is resolved by restarting the server.

### Fee Structure Not Showing in Assignment Dialog

If fee structures are created but not showing in the enrollment fee assignment dialog:

1. **Check Program Campus ID Match:**
   - Visit `/admin/system/fee-management/debug` to debug
   - Verify the enrollment's program campus ID matches the fee structure's program campus ID
   - Use the debug page to see all fee structures and their program campus associations

2. **Check Fee Structure Status:**
   - Ensure fee structures have `status: 'ACTIVE'`
   - Only active fee structures are returned by the API

3. **Verify API Endpoint:**
   - The enrollment page uses `api.feeStructure.getByProgramCampus.useQuery()`
   - This calls `getFeeStructuresByProgramCampus()` in the FeeService
   - Check browser network tab for API call responses

## Testing Pages Created

### 1. Debug Page: `/admin/system/fee-management/debug`
- Shows enrollment details and program campus ID
- Lists all fee structures in the system
- Filters fee structures by program campus ID
- Helps identify why fee structures aren't appearing

### 2. Simple Test Page: `/admin/system/fee-management/test-simple`
- Simple form to create test fee structures
- Pre-configured with sample one-time and recurring components
- Shows component breakdown and totals
- Good for quick testing

### 3. Recurring Fee Management: `/admin/system/fee-management/recurring-fees`
- Admin interface for managing recurring fee automation
- Manual processing with dry-run capability
- System statistics and monitoring
- Processing results and error reporting

## Quick Start Guide

### 1. Create a Test Fee Structure
1. Go to `/admin/system/fee-management/test-simple`
2. Select a program campus
3. Modify the pre-configured components as needed
4. Click "Create Fee Structure"

### 2. Verify Fee Structure Creation
1. Go to `/admin/system/fee-management/debug`
2. Check if your fee structure appears in "All Fee Structures"
3. Note the program campus ID

### 3. Test Enrollment Assignment
1. Go to an enrollment page: `/admin/system/enrollment/[id]/fee`
2. Check if the fee structure appears in the assignment dialog
3. If not, use the debug page to verify program campus ID matching

### 4. Test Recurring Fee Processing
1. Go to `/admin/system/fee-management/recurring-fees`
2. Run a dry-run to see what fees would be generated
3. Check the results and error reporting

## Files Modified/Created Summary

**Core Implementation:**
- `src/components/shared/entities/fee/fee-structure-form.tsx` - Enhanced with component-level recurring settings
- `src/components/core/fee/fee-component-list.tsx` - Updated interface with recurring fields
- `src/server/api/services/recurring-fee-processing.service.ts` - New service for recurring fee logic
- `src/server/api/services/fee.service.ts` - Updated schemas for recurring components
- `src/server/api/services/cron.service.ts` - Added recurring fee automation
- `src/server/api/routers/enrollment-fee.ts` - New endpoints for recurring fee processing

**Testing & Debug:**
- `src/app/admin/system/fee-management/debug/page.tsx` - Debug interface
- `src/app/admin/system/fee-management/test-simple/page.tsx` - Simple test interface
- `src/app/admin/system/fee-management/recurring-fees/page.tsx` - Admin management interface

**Documentation:**
- `docs/recurring-fee-component-solution.md` - Complete solution documentation
