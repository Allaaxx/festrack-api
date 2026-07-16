import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/index.js';
import { GetUserBalanceController } from './get-user-balance.js';

describe('Get User Balance Controller', () => {
    class getUserBalanceUseCaseStub {
        async execute() {
            return faker.number.int();
        }
    }

    const makeSut = () => {
        const getUserBalanceUseCase = new getUserBalanceUseCaseStub();
        const sut = new GetUserBalanceController(getUserBalanceUseCase);

        return { sut, getUserBalanceUseCase };
    };

    const httpRequest = {
        params: {
            userId: faker.string.uuid(),
        },
        query: {
            from: '2025-01-01',
            to: '2026-01-02',
        },
    };

    it('should return 200 when getting user balance', async () => {
        const { sut } = makeSut();

        const httpResponse = await sut.execute(httpRequest);

        expect(httpResponse.statusCode).toBe(200);
    });

    it('should return 400 when userId is invalid', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            params: {
                userId: 'invalid_id',
            },
            query: {
                from: '2025-01-01',
                to: '2026-01-02',
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 if GetUserBalanceUseCase trhows', async () => {
        const { sut, getUserBalanceUseCase } = makeSut();
        jest.spyOn(getUserBalanceUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const result = await sut.execute(httpRequest);

        expect(result.statusCode).toBe(500);
    });

    it('should call GetUserBalanceUseCase with correct values', async () => {
        const { sut, getUserBalanceUseCase } = makeSut();
        const executeSpy = jest.spyOn(getUserBalanceUseCase, 'execute');

        await sut.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(
            httpRequest.params.userId,
            httpRequest.query.from,
            httpRequest.query.to,
        );
    });

    it('should return 404 if GetUserBalanceUseCase throws with UserNotFoundError', async () => {
        const { sut, getUserBalanceUseCase } = makeSut();
        jest.spyOn(getUserBalanceUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError(faker.string.uuid()),
        );

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(404);
    });
});
