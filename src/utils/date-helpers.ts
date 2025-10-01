/**
 * Date helper utilities for stable date references
 * Prevents infinite re-renders caused by new Date() in React components
 */

/**
 * Creates a stable date reference rounded to the nearest hour
 * This prevents infinite re-renders in React queries
 */
export function createStableEndDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
}

/**
 * Creates a stable start date based on timeframe
 */
export function createStableStartDate(timeframe: 'week' | 'month' | 'term'): Date {
  const now = new Date();
  switch (timeframe) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'term':
      // Assuming term starts 3 months ago
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

/**
 * Creates stable query parameters for learning time stats
 */
export function createStableLearningTimeParams(
  classId?: string,
  timeframe: 'week' | 'month' | 'term' = 'month'
) {
  return {
    classId,
    startDate: createStableStartDate(timeframe),
    endDate: createStableEndDate(),
  };
}

/**
 * Formats time in minutes to a readable string
 */
export function formatTimeMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Formats time in minutes to decimal hours
 */
export function formatTimeDecimal(minutes: number): string {
  return (minutes / 60).toFixed(1) + 'h';
}

/**
 * Gets a human-readable timeframe label
 */
export function getTimeframeLabel(timeframe: 'week' | 'month' | 'term'): string {
  switch (timeframe) {
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'term': return 'This Term';
    default: return 'This Month';
  }
}
