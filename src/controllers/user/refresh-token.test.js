import { UnauthorizedError } from '../../errors';
import { RefreshTokenController } from './refresh-token.js';

describe('Refresh Token Controller', () => {
    class RefreshTokenUseCaseStub {
        execute() {
            return {
                accessToken: 'new_access_token',
                refreshToken: 'new_refresh_token',
            };
        }
    }

    const makeSut = () => {
        const refreshTokenUseCaseStub = new RefreshTokenUseCaseStub();
        const sut = new RefreshTokenController(refreshTokenUseCaseStub);
        return {
            refreshTokenUseCaseStub,
            sut,
        };
    };

    it('should return 400 when an invalid refresh token is provided', async () => {
        const { sut } = makeSut();

        const httpRequest = {
            body: {
                refreshToken: 0,
            },
        };

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(400);
    });

    it('should return 200 and new tokens when a valid refresh token is provided', async () => {
        const { sut } = makeSut();

        const httpRequest = {
            body: {
                refreshToken: 'valid_refresh_token',
            },
        };

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
        });
    });

    it('should return 401 when the refresh token is invalid', async () => {
        const { sut, refreshTokenUseCaseStub } = makeSut();
        jest.spyOn(refreshTokenUseCaseStub, 'execute').mockImplementationOnce(
            () => {
                throw new UnauthorizedError();
            },
        );

        const httpRequest = {
            body: {
                refreshToken: '1',
            },
        };

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(401);
    });
});
