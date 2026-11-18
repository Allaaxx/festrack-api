import { describe, it, expect } from 'bun:test';
import {
    extractCivilDate,
    normalizeAllDayDates,
    resolveEventDateRange,
} from './event.js';
import { InvalidEventDateRangeError } from '../../errors/event.js';

describe('Event Domain Helpers', () => {
    describe('extractCivilDate', () => {
        it('should extract YYYY-MM-DD from an ISO date-only string', () => {
            expect(extractCivilDate('2026-11-18')).toBe('2026-11-18');
        });

        it('should preserve sender civil date from an offset timestamp without timezone shift', () => {
            expect(extractCivilDate('2026-11-18T22:00:00-03:00')).toBe(
                '2026-11-18',
            );
            expect(extractCivilDate('2026-11-18T00:00:00-03:00')).toBe(
                '2026-11-18',
            );
        });

        it('should extract UTC YYYY-MM-DD from a Date instance', () => {
            expect(extractCivilDate(new Date('2026-11-18T23:59:59.000Z'))).toBe(
                '2026-11-18',
            );
        });

        it('should accept valid leap day Feb 29 on leap year', () => {
            expect(extractCivilDate('2024-02-29')).toBe('2024-02-29');
        });

        it('should throw InvalidEventDateRangeError for non-existent calendar dates instead of rolling over', () => {
            expect(() => extractCivilDate('2026-02-30')).toThrow(
                InvalidEventDateRangeError,
            );
            expect(() => extractCivilDate('2026-04-31')).toThrow(
                InvalidEventDateRangeError,
            );
            expect(() => extractCivilDate('2025-02-29')).toThrow(
                InvalidEventDateRangeError,
            );
            expect(() => extractCivilDate('2026-02-30T10:00:00.000Z')).toThrow(
                InvalidEventDateRangeError,
            );
        });

        it('should throw InvalidEventDateRangeError for invalid strings or invalid Date instances', () => {
            expect(() => extractCivilDate('invalid-date')).toThrow(
                InvalidEventDateRangeError,
            );
            expect(() => extractCivilDate(new Date('invalid'))).toThrow(
                InvalidEventDateRangeError,
            );
        });
    });

    describe('normalizeAllDayDates', () => {
        it('should normalize single-day and multi-day dates to UTC civil-date carrier bounds', () => {
            expect(
                normalizeAllDayDates(
                    '2026-11-18T22:00:00-03:00',
                    '2026-11-20T01:00:00Z',
                ),
            ).toEqual({
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-20T23:59:59.000Z',
            });
        });

        it('should reject non-existent calendar dates', () => {
            expect(() =>
                normalizeAllDayDates('2026-02-30', '2026-03-01'),
            ).toThrow(InvalidEventDateRangeError);
        });
    });

    describe('resolveEventDateRange', () => {
        it('should normalize and validate All-Day Event bounds when allDay is true', () => {
            const resolved = resolveEventDateRange(
                '2026-11-18T22:00:00-03:00',
                '2026-11-18T10:00:00Z',
                true,
            );

            expect(resolved).toEqual({
                start_date: '2026-11-18T00:00:00.000Z',
                end_date: '2026-11-18T23:59:59.000Z',
            });
        });

        it('should throw InvalidEventDateRangeError when All-Day Event end civil date is before start civil date', () => {
            expect(() =>
                resolveEventDateRange('2026-11-19', '2026-11-18', true),
            ).toThrow(InvalidEventDateRangeError);
        });

        it('should preserve raw timestamps and validate range when allDay is false', () => {
            const resolved = resolveEventDateRange(
                '2026-11-18T00:00:00-03:00',
                '2026-11-18T23:59:59-03:00',
                false,
            );

            expect(resolved).toEqual({
                start_date: '2026-11-18T00:00:00-03:00',
                end_date: '2026-11-18T23:59:59-03:00',
            });
        });

        it('should throw InvalidEventDateRangeError when Timed Event end instant is before start instant', () => {
            expect(() =>
                resolveEventDateRange(
                    '2026-11-18T22:00:00-03:00',
                    '2026-11-18T10:00:00Z',
                    false,
                ),
            ).toThrow(InvalidEventDateRangeError);
        });

        it('should reject impossible calendar dates in both Timed and All-Day modes', () => {
            expect(() =>
                resolveEventDateRange('2026-02-30', '2026-03-02', false),
            ).toThrow(InvalidEventDateRangeError);
            expect(() =>
                resolveEventDateRange('2026-04-31', '2026-05-01', true),
            ).toThrow(InvalidEventDateRangeError);
        });
    });
});
