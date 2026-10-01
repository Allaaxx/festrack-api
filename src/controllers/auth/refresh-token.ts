import { ZodError } from 'zod';
import {
    refreshTokenSchema,
    RefreshTokenSchema,
} from '../../schemas/user.js';
import {
    ok,
    serverError,
    badRequest,
    unauthorized,
    HttpResponse,
} from '../helpers/http.js';
import { UnauthorizedError } from '../../errors/index.js';
import { Controller, HttpRequest } from '../protocols.js';
import { RefreshTokenUseCase } from '../../use-cases/index.js';

export class RefreshTokenController implements Controller {
    constructor(
        private readonly refreshTokenUseCase: Pick<
            RefreshTokenUseCase,
            'execute'
        >,
    ) {}

    async execute(
        httpRequest: HttpRequest<RefreshTokenSchema>,
    ): Promise<HttpResponse> {
        try {
            const params = await refreshTokenSchema.parseAsync(
                httpRequest.body,
            );

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
