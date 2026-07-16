import { UnauthorizedError } from '../../errors';
import { RefreshTokenUseCase } from './refresh-token';

describe('Refresh Token Use Case', () => {
    class TokenVerifierAdapterStub {
        execute() {
            return true;
        }
    }

    class TokensGeneratorAdapterStub {
        execute() {
            return {
                accessToken: 'new_access_token',
                refreshToken: 'new_refresh_token',
            };
        }
    }

    const makeSut = () => {
        const tokenVerifierAdapter = new TokenVerifierAdapterStub();
        const tokensGeneratorAdapter = new TokensGeneratorAdapterStub();
        const sut = new RefreshTokenUseCase(
            tokensGeneratorAdapter,
            tokenVerifierAdapter,
        );

        return {
            sut,
            tokenVerifierAdapter,
            tokensGeneratorAdapter,
        };
    };

    it('should generate new tokens when a valid refresh token is provided', async () => {
        const { sut } = makeSut();

        const result = await sut.execute('valid_refresh_token');

        expect(result).toEqual({
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
        });
    });

    it('should throw an error when tokenVerifierAdapter throws', async () => {
        const { sut, tokenVerifierAdapter } = makeSut();
        jest.spyOn(tokenVerifierAdapter, 'execute').mockImplementationOnce(
            () => {
                throw new Error();
            },
        );

        await expect(sut.execute('invalid_refresh_token')).rejects.toThrow(
            new UnauthorizedError(),
        );
    });
});
