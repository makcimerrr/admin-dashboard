import { describe, it, expect } from 'vitest';
import {
  getWeekNumber,
  validateTimeSlot,
  calculateSlotDuration,
  timeToMinutes,
  minutesToTime,
  calculateTotalWorkHours,
  detectTimeConflicts,
  validateEmployeeData,
  getNextAvailableColor,
  EMPLOYEE_COLORS,
} from './utils';

describe('getWeekNumber', () => {
  it('returns ISO week number for first week of year', () => {
    expect(getWeekNumber(new Date('2026-01-05'))).toBe(2);
  });
  it('handles week 1 starting before Jan 1', () => {
    expect(getWeekNumber(new Date('2026-01-01'))).toBe(1);
  });
  it('returns 52 or 53 for late December', () => {
    const week = getWeekNumber(new Date('2024-12-30'));
    expect([1, 52, 53]).toContain(week);
  });
});

describe('timeToMinutes / minutesToTime', () => {
  it('converts 09:30 to 570 minutes', () => {
    expect(timeToMinutes('09:30')).toBe(570);
  });
  it('round-trips through minutesToTime', () => {
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(1439)).toBe('23:59');
  });
});

describe('calculateSlotDuration', () => {
  it('returns hours as float', () => {
    expect(calculateSlotDuration('09:00', '17:00')).toBe(8);
    expect(calculateSlotDuration('13:00', '13:30')).toBe(0.5);
  });
  it('returns 0 for same start and end', () => {
    expect(calculateSlotDuration('10:00', '10:00')).toBe(0);
  });
});

describe('calculateTotalWorkHours', () => {
  it('sums only work slots', () => {
    const total = calculateTotalWorkHours([
      { start: '09:00', end: '12:00', type: 'work' },
      { start: '13:00', end: '17:00', type: 'work' },
      { start: '08:00', end: '08:30', type: 'vacation' },
    ]);
    expect(total).toBe(7);
  });
  it('returns 0 when no work slot', () => {
    expect(calculateTotalWorkHours([
      { start: '09:00', end: '17:00', type: 'sick' },
    ])).toBe(0);
  });
});

describe('validateTimeSlot', () => {
  it('accepts a valid work slot', () => {
    expect(validateTimeSlot({ start: '09:00', end: '17:00', type: 'work' })).toEqual([]);
  });
  it('rejects bad time format', () => {
    const errs = validateTimeSlot({ start: '9:0', end: '17:00', type: 'work' });
    expect(errs.some((e) => e.includes('Format'))).toBe(true);
  });
  it('rejects end before start', () => {
    const errs = validateTimeSlot({ start: '18:00', end: '09:00', type: 'work' });
    expect(errs.some((e) => e.toLowerCase().includes('début'))).toBe(true);
  });
  it('rejects unknown type', () => {
    const errs = validateTimeSlot({ start: '09:00', end: '17:00', type: 'lunch' });
    expect(errs.some((e) => e.includes('Type'))).toBe(true);
  });
});

describe('detectTimeConflicts', () => {
  it('returns false for non-overlapping slots', () => {
    expect(detectTimeConflicts([
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ])).toBe(false);
  });
  it('returns true when slots overlap', () => {
    expect(detectTimeConflicts([
      { start: '09:00', end: '12:00' },
      { start: '11:00', end: '14:00' },
    ])).toBe(true);
  });
  it('returns true when slot is contained', () => {
    expect(detectTimeConflicts([
      { start: '09:00', end: '17:00' },
      { start: '13:00', end: '14:00' },
    ])).toBe(true);
  });
});

describe('validateEmployeeData', () => {
  it('reports missing required fields', () => {
    const errs = validateEmployeeData({});
    expect(errs.length).toBeGreaterThan(0);
  });
  it('passes with valid data', () => {
    expect(validateEmployeeData({
      name: 'Alice',
      role: 'Coach',
      email: 'alice@zone01.fr',
      color: '#3B82F6',
    })).toEqual([]);
  });
  it('rejects bad email', () => {
    const errs = validateEmployeeData({
      name: 'A', role: 'B', email: 'not-email', color: '#3B82F6',
    });
    expect(errs.some((e) => e.includes('email'))).toBe(true);
  });
});

describe('getNextAvailableColor', () => {
  it('returns first unused color', () => {
    const taken = [EMPLOYEE_COLORS[0], EMPLOYEE_COLORS[1]];
    expect(getNextAvailableColor(taken)).toBe(EMPLOYEE_COLORS[2]);
  });
  it('falls back when all colors are taken', () => {
    const taken = [...EMPLOYEE_COLORS];
    const next = getNextAvailableColor(taken);
    expect(EMPLOYEE_COLORS).toContain(next);
  });
});
