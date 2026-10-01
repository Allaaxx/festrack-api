import { ZodError } from 'zod';
import {
    uuidSchema,
    createIdParamSchema,
    userIdParamSchema,
    eventIdParamSchema,
    transactionIdParamSchema,
    idParamSchema,
} from './params.js';

describe('Parameter Validation Schemas', () => {
    const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const invalidIdErrorMessage = 'The provided id is not valid.';

    describe('uuidSchema', () => {
        it('should successfully parse a valid UUID string', () => {
            const result = uuidSchema.parse(validUuid);
            expect(result).toBe(validUuid);
        });

        it('should reject an invalid UUID string with expected message', () => {
            expect.assertions(2);
            try {
                uuidSchema.parse('invalid-uuid');
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject a non-string input with expected message', () => {
            expect.assertions(2);
            try {
                uuidSchema.parse(12345);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject undefined with expected message', () => {
            expect.assertions(2);
            try {
                uuidSchema.parse(undefined);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });
    });

    describe('createIdParamSchema', () => {
        const customParamSchema = createIdParamSchema('customId');

        it('should successfully parse an object with a valid UUID parameter', () => {
            const result = customParamSchema.parse({ customId: validUuid });
            expect(result).toEqual({ customId: validUuid });
        });

        it('should reject an invalid UUID value with expected message', () => {
            expect.assertions(2);
            try {
                customParamSchema.parse({ customId: 'invalid-uuid' });
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject an empty object with expected message', () => {
            expect.assertions(2);
            try {
                customParamSchema.parse({});
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject undefined input with expected message', () => {
            expect.assertions(2);
            try {
                customParamSchema.parse(undefined);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });
    });

    describe('userIdParamSchema', () => {
        it('should successfully parse valid userId param', () => {
            const result = userIdParamSchema.parse({ userId: validUuid });
            expect(result).toEqual({ userId: validUuid });
        });

        it('should reject invalid userId param', () => {
            expect.assertions(2);
            try {
                userIdParamSchema.parse({ userId: 'not-a-uuid' });
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject missing userId param', () => {
            expect.assertions(2);
            try {
                userIdParamSchema.parse({});
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject undefined input', () => {
            expect.assertions(2);
            try {
                userIdParamSchema.parse(undefined);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });
    });

    describe('eventIdParamSchema', () => {
        it('should successfully parse valid eventId param', () => {
            const result = eventIdParamSchema.parse({ eventId: validUuid });
            expect(result).toEqual({ eventId: validUuid });
        });

        it('should reject invalid eventId param', () => {
            expect.assertions(2);
            try {
                eventIdParamSchema.parse({ eventId: 'not-a-uuid' });
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject missing eventId param', () => {
            expect.assertions(2);
            try {
                eventIdParamSchema.parse({});
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject undefined input', () => {
            expect.assertions(2);
            try {
                eventIdParamSchema.parse(undefined);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });
    });

    describe('transactionIdParamSchema', () => {
        it('should successfully parse valid transactionId param', () => {
            const result = transactionIdParamSchema.parse({
                transactionId: validUuid,
            });
            expect(result).toEqual({ transactionId: validUuid });
        });

        it('should reject invalid transactionId param', () => {
            expect.assertions(2);
            try {
                transactionIdParamSchema.parse({ transactionId: 'not-a-uuid' });
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject missing transactionId param', () => {
            expect.assertions(2);
            try {
                transactionIdParamSchema.parse({});
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject undefined input', () => {
            expect.assertions(2);
            try {
                transactionIdParamSchema.parse(undefined);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });
    });

    describe('idParamSchema', () => {
        it('should successfully parse valid id param', () => {
            const result = idParamSchema.parse({ id: validUuid });
            expect(result).toEqual({ id: validUuid });
        });

        it('should reject invalid id param', () => {
            expect.assertions(2);
            try {
                idParamSchema.parse({ id: 'not-a-uuid' });
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject missing id param', () => {
            expect.assertions(2);
            try {
                idParamSchema.parse({});
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });

        it('should reject undefined input', () => {
            expect.assertions(2);
            try {
                idParamSchema.parse(undefined);
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).issues[0].message).toBe(
                    invalidIdErrorMessage,
                );
            }
        });
    });
});
