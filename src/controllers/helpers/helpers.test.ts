import {
    badRequest,
    unauthorized,
    forbidden,
    created,
    serverError,
    ok,
    notFound,
    noContent,
    userNotFoundResponse,
    eventNotFoundResponse,
    transactionNotFoundResponse,
    checkIfIdIsValid,
    invalidIdResponse,
} from './index.js';

describe('HTTP & Controller Helpers', () => {
    describe('HTTP response helpers', () => {
        it('badRequest returns status 400 and body', () => {
            const res = badRequest({ message: 'Error' });
            expect(res).toEqual({ statusCode: 400, body: { message: 'Error' } });
        });

        it('unauthorized returns status 401 with unauthorized message', () => {
            const res = unauthorized();
            expect(res).toEqual({ statusCode: 401, body: { message: 'Unauthorized' } });
        });

        it('forbidden returns status 403 with forbidden message', () => {
            const res = forbidden();
            expect(res).toEqual({ statusCode: 403, body: { message: 'Forbidden' } });
        });

        it('created returns status 201 with body', () => {
            const res = created({ id: '1' });
            expect(res).toEqual({ statusCode: 201, body: { id: '1' } });
        });

        it('serverError returns status 500 with internal server error message', () => {
            const res = serverError();
            expect(res).toEqual({ statusCode: 500, body: { message: 'Internal server error' } });
        });

        it('ok returns status 200 with body', () => {
            const res = ok({ data: 'ok' });
            expect(res).toEqual({ statusCode: 200, body: { data: 'ok' } });
        });

        it('notFound returns status 404 with body', () => {
            const res = notFound({ message: 'Not found' });
            expect(res).toEqual({ statusCode: 404, body: { message: 'Not found' } });
        });

        it('noContent returns status 204 and null body', () => {
            const res = noContent();
            expect(res).toEqual({ statusCode: 204, body: null });
        });
    });

    describe('Domain-specific not found responses', () => {
        it('userNotFoundResponse returns 404 with user not found message', () => {
            const res = userNotFoundResponse();
            expect(res).toEqual({ statusCode: 404, body: { message: 'User not found.' } });
        });

        it('eventNotFoundResponse returns 404 with event not found message', () => {
            const res = eventNotFoundResponse();
            expect(res).toEqual({ statusCode: 404, body: { message: 'Event not found.' } });
        });

        it('transactionNotFoundResponse returns 404 with transaction not found message', () => {
            const res = transactionNotFoundResponse();
            expect(res).toEqual({ statusCode: 404, body: { message: 'Transaction not found.' } });
        });
    });

    describe('Validation helpers', () => {
        it('checkIfIdIsValid returns true for valid UUID and false for invalid', () => {
            expect(checkIfIdIsValid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
            expect(checkIfIdIsValid('invalid-uuid')).toBe(false);
        });

        it('invalidIdResponse returns 400 with invalid id message', () => {
            const res = invalidIdResponse();
            expect(res).toEqual({ statusCode: 400, body: { message: 'The provided id is not valid.' } });
        });
    });
});
