import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/index.js';
import { GetUserBalanceController } from './get-user-balance.js';
import { userBalance } from '../../tests/index.js';
import { UserBalance } from '../../domain/entities/user.js';

describe('Get User Balance Controller', () => {
    class GetUserBalanceUseCaseStub {
        async execute(): Promise<UserBalance> {
            return userBalance;
        }
    }

    const makeSut = () => {
        const getUserBalanceUseCase = new GetUserBalanceUseCaseStub();
        const getUserBalanceController = new GetUserBalanceController(getUserBalanceUseCase);

        return { getUserBalanceController, getUserBalanceUseCase };
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
        const { getUserBalanceController } = makeSut();

        const httpResponse = await getUserBalanceController.execute(httpRequest);

        expect(httpResponse.statusCode).toBe(200);
    });

    it('should return 400 when userId is invalid', async () => {
        const { getUserBalanceController } = makeSut();

        const result = await getUserBalanceController.execute({
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

    it('should return 500 if GetUserBalanceUseCase throws', async () => {
        const { getUserBalanceController, getUserBalanceUseCase } = makeSut();
        jest.spyOn(getUserBalanceUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const result = await getUserBalanceController.execute(httpRequest);

        expect(result.statusCode).toBe(500);
    });

    it('should call GetUserBalanceUseCase with correct values', async () => {
        const { getUserBalanceController, getUserBalanceUseCase } = makeSut();
        const executeSpy = jest.spyOn(getUserBalanceUseCase, 'execute');

        await getUserBalanceController.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(
            httpRequest.params.userId,
            httpRequest.query.from,
            httpRequest.query.to,
        );
    });

    it('should return 404 if GetUserBalanceUseCase throws with UserNotFoundError', async () => {
        const { getUserBalanceController, getUserBalanceUseCase } = makeSut();
        jest.spyOn(getUserBalanceUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError(faker.string.uuid()),
        );

        const response = await getUserBalanceController.execute(httpRequest);

        expect(response.statusCode).toBe(404);
    });
});
