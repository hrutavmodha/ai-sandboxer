import { describe, it, expect } from 'vitest';
import { formatDate, isOverdue } from '../src/utils/date';

describe('Date Utility Functions', () => {
  it('should format a timestamp correctly using Intl.DateTimeFormat', () => {
    const timestamp = new Date('2024-01-15').getTime();
    expect(formatDate(timestamp)).toBe('Jan 15, 2024');
  });

  it('isOverdue should return false if dueDate is null', () => {
    expect(isOverdue(null)).toBe(false);
  });

  it('isOverdue should return true if dueDate is in the past', () => {
    const pastTimestamp = Date.now() - 1000;
    expect(isOverdue(pastTimestamp)).toBe(true);
  });

  it('isOverdue should return false if dueDate is in the future', () => {
    const futureTimestamp = Date.now() + 100000;
    expect(isOverdue(futureTimestamp)).toBe(false);
  });
});
