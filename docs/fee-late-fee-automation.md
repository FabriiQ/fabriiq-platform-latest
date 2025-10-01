# Late Fee Automation (Non-breaking Additions)

This document describes new, additive capabilities for late fee management that do not break existing behavior.

## What’s Added

- TRPC router endpoints (non-breaking):
  - lateFee.previewCalculation: Preview the computed late fee for an enrollmentFee+policy as of a date, with detailed breakdown.
  - lateFee.processAutomatic: Run policy-based automatic application with `dryRun` (default true) to simulate without DB writes.
  - lateFee.createWaiverV2: Store waiver requests in LateFeeWaiver model (replacing temporary systemConfig approach).
  - lateFee.getOverdueFeesEnhanced: Paginated overdue fees for UI, powered by LateFeeService.

- Admin UI: `/admin/system/fee-management/late-fees`
  - Filter by campus and date
  - View overdue fees
  - Select policy and preview calculation per fee
  - Run automatic processing (dryRun toggle)

## Service Capabilities

- LateFeeService.calculateLateFee implements:
  - Grace period handling
  - Fixed/Percentage, Daily Fixed/Percentage (+compounding), Tiered rules
  - Min/Max caps and compounding periods
- LateFeeService.processAutomaticLateFees can be scheduled later; now manually invocable via router with `dryRun`.
- LateFeeService.createWaiverRequest persists to LateFeeWaiver with history records.

## Backward Compatibility

- No existing endpoints changed; new ones are additive.
- The previous manual `applyLateFee` remains untouched.
- The page is isolated under the system fee-management section and does not alter existing flows.

## Next Steps (Optional)

- Add cron/worker to call `lateFee.processAutomatic` nightly with `dryRun=false`.
- Hook reminders to invoice due dates and late fee events.
- Extend UI to approve/reject waivers and view history.

