import { faker } from '@faker-js/faker';
import { user } from '../../tests/index.js';
import { GetUserByIdController } from './get-user-by-id.js';
import { User } from '../../domain/entities/user.js';

describe('Get User By Id Controller', () => {
    class GetUserByIdUseCaseStub {
        async execute(): Promise<User | null> {
            return user;
        }
    }

    const makeSut = () => {
        const getUserByIdUseCase = new GetUserByIdUseCaseStub();
        const getUserByIdController = new GetUserByIdController(getUserByIdUseCase);

        return { getUserByIdController, getUserByIdUseCase };
    };

    const baseHttpRequest = {
        params: {
            userId: faker.string.uuid(),
        },
    };

    it('should return 200 if a user is found', async () => {
        const { getUserByIdController } = makeSut();

        const result = await getUserByIdController.execute(baseHttpRequest);

        expect(result.statusCode).toBe(200);
    });

    it('should return 400 if an invalid id is provided', async () => {
        const { getUserByIdController } = makeSut();

        const response = await getUserByIdController.execute({
            params: {
                userId: 'invalid_id',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 if user is not found', async () => {
        const { getUserByIdController, getUserByIdUseCase } = makeSut();
        jest.spyOn(getUserByIdUseCase, 'execute').mockResolvedValue(null);

        const response = await getUserByIdController.execute(baseHttpRequest);

        expect(response.statusCode).toBe(404);
    });

    it('should return 500 if GetUserByIdUseCase throws', async () => {
        const { getUserByIdController, getUserByIdUseCase } = makeSut();
        jest.spyOn(getUserByIdUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await getUserByIdController.execute(baseHttpRequest);

        expect(response.statusCode).toBe(500);
    });

    it('should call GetUserByIdUseCase with correct values', async () => {
        const { getUserByIdController, getUserByIdUseCase } = makeSut();

        const executeSpy = jest.spyOn(getUserByIdUseCase, 'execute');

        await getUserByIdController.execute(baseHttpRequest);

        expect(executeSpy).toHaveBeenCalledWith(baseHttpRequest.params.userId);
    });
});
