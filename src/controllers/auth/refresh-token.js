import { ZodError } from 'zod';
import { refreshTokenSchema } from '../../schemas/user.js';
import { ok, serverError, badRequest, unauthorized } from '../helpers/http.js';
import { UnauthorizedError } from '../../errors/index.js';

export class RefreshTokenController {
    constructor(refreshTokenUseCase) {
        this.refreshTokenUseCase = refreshTokenUseCase;
    }

    async execute(httpRequest) {
        try {
            const params = httpRequest.body;

            await refreshTokenSchema.parseAsync(params);

            const tokens = this.refreshTokenUseCase.execute(
                params.refreshToken,
            );

            return ok({ tokens });
        } catch (error) {
            if (error instanceof ZodError) {
                return badRequest({ message: error.issues[0].message });
            }

            if (error instanceof UnauthorizedError) {
                return unauthorized();
            }

            return serverError();
        }
    }
}
