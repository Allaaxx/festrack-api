import { faker } from '@faker-js/faker';
import { UserNotFoundError } from '../../errors/user.js';
import { transaction } from '../../tests';
import { GetTransactionsByUserIdController } from './get-transactions-by-user-id.js';
describe('Get Transaction By User ID Controller ', () => {
    const from = '2026-01-01';
    const to = '2027-01-01';
    class GetUserByIdUseCaseStub {
        execute() {
            return transaction;
        }
    }

    const makeSut = () => {
        const getUserByIdUseCase = new GetUserByIdUseCaseStub();
        const sut = new GetTransactionsByUserIdController(getUserByIdUseCase);

        return { sut, getUserByIdUseCase };
    };

    it('should return 200 when finding transaction by user id successfully', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            query: {
                userId: faker.string.uuid(),
                from,
                to,
            },
        });

        expect(response.statusCode).toBe(200);
    });

    it('should return 400 when missing userId param', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            query: {
                userId: undefined,
                from,
                to,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when userId is invalid', async () => {
        const { sut } = makeSut();

        const response = await sut.execute({
            query: {
                userId: 'invalid_user_id',
                from,
                to,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 when GetUserByIdUseCase throws UserNotFoundError', async () => {
        const { sut, getUserByIdUseCase } = makeSut();
        jest.spyOn(getUserByIdUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError(),
        );

        const response = await sut.execute({
            query: {
                userId: faker.string.uuid(),
                from,
                to,
            },
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 500 when GetUserByIdUseCase throws generic error', async () => {
        const { sut, getUserByIdUseCase } = makeSut();
        jest.spyOn(getUserByIdUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await sut.execute({
            query: {
                userId: faker.string.uuid(),
                from,
                to,
            },
        });

        expect(response.statusCode).toBe(500);
    });

    it('should call GetUserByIdUseCase with correct values', async () => {
        const { sut, getUserByIdUseCase } = makeSut();
        const executeSpy = jest.spyOn(getUserByIdUseCase, 'execute');

        const userId = faker.string.uuid();

        await sut.execute({
            query: {
                userId,
                from,
                to,
            },
        });

        expect(executeSpy).toHaveBeenCalledWith(userId, from, to);
    });
});
