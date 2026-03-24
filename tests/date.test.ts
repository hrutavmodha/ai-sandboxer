import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNow, formatDate, isOverdue } from '../src/utils/date';

describe('Date Utilities', () => {
  describe('getNow', () => {
    it('should return the current Unix timestamp in milliseconds', () => {
      const now = getNow();
      expect(typeof now).toBe('number');
      expect(now).toBeGreaterThan(0);
      // Verify it's roughly current time
      const actualNow = Date.now();
      expect(now).toBeGreaterThanOrEqual(actualNow - 100);
      expect(now).toBeLessThanOrEqual(actualNow + 100);
    });
  });

  describe('formatDate', () => {
    it('should format a Unix timestamp to "MMM DD, YYYY"', () => {
      // Use a fixed timestamp for predictable result
      const timestamp = new Date('2024-01-15T12:00:00').getTime();
      // The task specifies: { year: 'numeric', month: 'short', day: 'numeric' }
      // In US locale, this is 'Jan 15, 2024'
      expect(formatDate(timestamp)).toBe('Jan 15, 2024');
    });

    it('should handle different dates correctly', () => {
      const timestamp = new Date('2023-12-31T23:59:59').getTime();
      expect(formatDate(timestamp)).toBe('Dec 31, 2023');
    });

    it('should handle leap years correctly', () => {
      const timestamp = new Date('2024-02-29T12:00:00').getTime();
      expect(formatDate(timestamp)).toBe('Feb 29, 2024');
    });
  });

  describe('isOverdue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Set fixed current time for tests: March 24, 2026
      const mockNow = new Date('2026-03-24T12:00:00').getTime();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return false if dueDate is null', () => {
      expect(isOverdue(null)).toBe(false);
    });

    it('should return true if dueDate is in the past', () => {
      // One second ago
      const pastDate = Date.now() - 1000;
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('should return false if dueDate is in the future', () => {
      // 100,000 milliseconds (100 seconds) in the future
      const futureDate = Date.now() + 100000;
      expect(isOverdue(futureDate)).toBe(false);
    });

    it('should return false if dueDate is exactly now', () => {
      // Task says: true if dueDate < Date.now()
      // So if dueDate === Date.now(), it is NOT overdue.
      expect(isOverdue(Date.now())).toBe(false);
    });

    it('should return true for a date much further in the past', () => {
      const longPastDate = new Date('2020-01-01').getTime();
      expect(isOverdue(longPastDate)).toBe(true);
    });
  });
});
