import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth } from './auth.js';

describe('Auth Middleware', () => {
    let request: Partial<Request>;
    let response: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        request = { headers: {} };
        response = {
            status: jest.fn().mockReturnThis() as any,
            send: jest.fn() as any,
        };
        next = jest.fn();
    });

    it('should return 401 when access token is missing', () => {
        auth(request as Request, response as Response, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when jwt.verify returns null', () => {
        request.headers = { authorization: 'Bearer valid_token' };

        jest.spyOn(jwt, 'verify').mockReturnValueOnce(null as any);

        auth(request as Request, response as Response, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when jwt.verify throws', () => {
        request.headers = { authorization: 'Bearer invalid_token' };

        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
            throw new Error('Invalid token');
        });

        auth(request as Request, response as Response, next);

        expect(logSpy).toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(next).not.toHaveBeenCalled();

        logSpy.mockRestore();
    });

    it('should call next when token is valid', () => {
        request.headers = { authorization: 'Bearer valid_token' };

        jest.spyOn(jwt, 'verify').mockReturnValueOnce({
            userId: '123',
        } as any);

        auth(request as Request, response as Response, next);

        expect(request.userId).toBe('123');
        expect(next).toHaveBeenCalled();
    });
});
