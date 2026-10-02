import { describe, it, expect } from 'bun:test';
import { UnauthorizedError } from '../../errors/index.js';
import { RefreshTokenUseCase } from './refresh-token.js';
import {
    TokensGenerator,
    GeneratedTokens,
} from '../../adapters/tokens-generator.js';
import { TokenVerifier, TokenPayload } from '../../adapters/token-verifier.js';

describe('Refresh Token Use Case', () => {
    class TokenVerifierAdapterStub implements Pick<TokenVerifier, 'execute'> {
        execute(_token: string, _secret: string): string | TokenPayload {
            return { userId: 'any_user_id' };
        }
    }

    class TokensGeneratorAdapterStub implements Pick<
        TokensGenerator,
        'execute'
    > {
        execute(_userId: string): GeneratedTokens {
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

    it('should generate new tokens when a valid refresh token is provided', () => {
        const { sut } = makeSut();

        const result = sut.execute('valid_refresh_token');

        expect(result).toEqual({
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
        });
    });

    it('should throw an error when tokenVerifierAdapter throws', () => {
        const { sut, tokenVerifierAdapter } = makeSut();
        jest.spyOn(tokenVerifierAdapter, 'execute').mockImplementationOnce(
            () => {
                throw new Error();
            },
        );

        expect(() => sut.execute('invalid_refresh_token')).toThrow(
            new UnauthorizedError(),
        );
    });

    it('should throw 401 when refresh token use case throw', () => {
        const { sut, tokensGeneratorAdapter } = makeSut();
        jest.spyOn(tokensGeneratorAdapter, 'execute').mockImplementationOnce(
            () => {
                throw new Error();
            },
        );

        expect(() => sut.execute('invalid_refresh_token')).toThrow(
            new UnauthorizedError(),
        );
    });

    it('should throw UnauthorizedError when decoded token is null', () => {
        const { sut, tokenVerifierAdapter } = makeSut();

        jest.spyOn(tokenVerifierAdapter, 'execute').mockReturnValueOnce(
            null as unknown as TokenPayload,
        );

        expect(() => sut.execute('invalid_refresh_token')).toThrow(
            UnauthorizedError,
        );
    });
});
