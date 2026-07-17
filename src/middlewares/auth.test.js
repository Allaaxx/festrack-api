import { jest } from '@jest/globals';

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: jest.fn(),
    },
}));

const jwt = (await import('jsonwebtoken')).default;
const { auth } = await import('./auth.js');

describe('Auth Middleware', () => {
    let request;
    let response;
    let next;

    beforeEach(() => {
        request = { headers: {} };
        response = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();
    });

    it('should return 401 when access token is missing', () => {
        auth(request, response, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when jwt.verify returns null', () => {
        request.headers.authorization = 'Bearer valid_token';

        jwt.verify.mockReturnValueOnce(null);

        auth(request, response, next);

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when jwt.verify throws', () => {
        request.headers.authorization = 'Bearer invalid_token';

        jest.spyOn(console, 'log').mockImplementation(() => {});

        jwt.verify.mockImplementationOnce(() => {
            throw new Error('Invalid token');
        });

        auth(request, response, next);

        expect(console.log).toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.send).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(next).not.toHaveBeenCalled();

        console.log.mockRestore();
    });

    it('should call next when token is valid', () => {
        request.headers.authorization = 'Bearer valid_token';

        jwt.verify.mockReturnValueOnce({
            userId: '123',
        });

        auth(request, response, next);

        expect(request.userId).toBe('123');
        expect(next).toHaveBeenCalled();
    });
});
