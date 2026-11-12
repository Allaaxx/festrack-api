import { describe, it, expect } from 'bun:test';
import {
    calculateBundleAvailableStock,
    calculateSimpleProductAvailableStock,
} from './stock-evaluator.js';

describe('Stock Evaluator Domain Service', () => {
    describe('calculateBundleAvailableStock', () => {
        it('should return 0 when bundle has no items or empty array', () => {
            expect(calculateBundleAvailableStock([])).toBe(0);
            expect(calculateBundleAvailableStock(null)).toBe(0);
            expect(calculateBundleAvailableStock(undefined)).toBe(0);
        });

        it('should compute available stock as bottleneck across multiple components', () => {
            // Comp A: stock 10, item qty 2 -> 5
            // Comp B: stock 12, item qty 3 -> 4
            // Bottleneck is 4
            const items = [
                {
                    quantity: 2,
                    stock: { quantity: 10, reserved: 0 },
                },
                {
                    quantity: 3,
                    stock: { quantity: 12, reserved: 0 },
                },
            ];

            expect(calculateBundleAvailableStock(items)).toBe(4);
        });

        it('should account for reserved stock on components', () => {
            // Comp A: stock 10, reserved 2 (avail 8), item qty 2 -> 4
            // Comp B: stock 12, reserved 0 (avail 12), item qty 3 -> 4
            const items = [
                {
                    quantity: 2,
                    stock: { quantity: 10, reserved: 2 },
                },
                {
                    quantity: 3,
                    stock: { quantity: 12, reserved: 0 },
                },
            ];

            expect(calculateBundleAvailableStock(items)).toBe(4);
        });

        it('should return 0 when any component has 0 available stock', () => {
            const items = [
                {
                    quantity: 1,
                    stock: { quantity: 10, reserved: 0 },
                },
                {
                    quantity: 1,
                    stock: { quantity: 0, reserved: 0 },
                },
            ];

            expect(calculateBundleAvailableStock(items)).toBe(0);
        });

        it('should return 0 when component stock is missing or null', () => {
            const items = [
                {
                    quantity: 1,
                    stock: null,
                },
            ];

            expect(calculateBundleAvailableStock(items)).toBe(0);
        });

        it('should round down fractional results to nearest integer', () => {
            // 5 / 2 = 2.5 -> 2
            const items = [
                {
                    quantity: 2,
                    stock: { quantity: 5, reserved: 0 },
                },
            ];

            expect(calculateBundleAvailableStock(items)).toBe(2);
        });

        it('should evaluate stock when stock is nested in componentProduct', () => {
            const items = [
                {
                    quantity: 2,
                    componentProduct: {
                        stock: { quantity: 8, reserved: 0 },
                    },
                },
            ];

            expect(calculateBundleAvailableStock(items)).toBe(4);
        });
    });

    describe('calculateSimpleProductAvailableStock', () => {
        it('should calculate quantity minus reserved', () => {
            expect(
                calculateSimpleProductAvailableStock({
                    quantity: 10,
                    reserved: 3,
                }),
            ).toBe(7);
        });

        it('should return 0 when stock is null or undefined', () => {
            expect(calculateSimpleProductAvailableStock(null)).toBe(0);
            expect(calculateSimpleProductAvailableStock(undefined)).toBe(0);
        });
    });
});
