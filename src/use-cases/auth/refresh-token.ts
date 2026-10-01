import { UnauthorizedError } from '../../errors/index.js';
import {
    TokensGenerator,
    GeneratedTokens,
} from '../../adapters/tokens-generator.js';
import { TokenVerifier } from '../../adapters/token-verifier.js';

export class RefreshTokenUseCase {
    constructor(
        private readonly tokensGeneratorAdapter: Pick<
            TokensGenerator,
            'execute'
        >,
        private readonly tokenVerifierAdapter: Pick<TokenVerifier, 'execute'>,
    ) {}

    execute(refreshToken: string): GeneratedTokens {
        try {
            const secret = process.env.JWT_REFRESH_TOKEN_SECRET;

            if (!secret) {
                throw new UnauthorizedError();
            }

            const decodedToken = this.tokenVerifierAdapter.execute(
                refreshToken,
                secret,
            );

            if (
                !decodedToken ||
                typeof decodedToken !== 'object' ||
                !('userId' in decodedToken) ||
                !(decodedToken as { userId?: string }).userId
            ) {
                throw new UnauthorizedError();
            }

            const userId = (decodedToken as { userId: string }).userId;

            return this.tokensGeneratorAdapter.execute(userId);
        } catch (error) {
            console.log(error);
            throw new UnauthorizedError();
        }
    }
}
