import { describe, it, expect } from 'bun:test';
import { isIsoDateValid } from './helpers.js';

describe('Route Helpers - isIsoDateValid', () => {
    it('should accept valid ISO date-only and datetime strings including timezone offsets', () => {
        expect(isIsoDateValid('2026-11-18')).toBe(true);
        expect(isIsoDateValid('2026-11-18T22:00:00-03:00')).toBe(true);
        expect(isIsoDateValid('2026-11-18T10:00:00.000Z')).toBe(true);
        expect(isIsoDateValid('2024-02-29')).toBe(true);
    });

    it('should reject non-existent calendar dates instead of silently rolling over', () => {
        expect(isIsoDateValid('2026-02-30')).toBe(false);
        expect(isIsoDateValid('2026-02-30T10:00:00Z')).toBe(false);
        expect(isIsoDateValid('2026-04-31')).toBe(false);
        expect(isIsoDateValid('2025-02-29')).toBe(false);
        expect(isIsoDateValid('2026-13-01')).toBe(false);
        expect(isIsoDateValid('2026-00-10')).toBe(false);
        expect(isIsoDateValid('2026-02-00')).toBe(false);
    });

    it('should reject malformed or non-date strings', () => {
        expect(isIsoDateValid('')).toBe(false);
        expect(isIsoDateValid('invalid-date')).toBe(false);
        expect(isIsoDateValid('2026-2-30')).toBe(false);
        expect(isIsoDateValid('2026-11-18T25:00:00Z')).toBe(false);
    });
});
