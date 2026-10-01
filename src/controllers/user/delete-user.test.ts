import { faker } from '@faker-js/faker';
import { user } from '../../tests/index.js';
import { DeleteUserController, IDeleteUserUseCase } from './delete-user.js';
import { UserNotFoundError } from '../../errors/user.js';
import { User } from '../../domain/entities/user.js';

describe('Delete User Controller', () => {
    class DeleteUserUseCaseStub implements IDeleteUserUseCase {
        async execute(): Promise<User> {
            return user;
        }
    }
    const makeSut = () => {
        const deleteUserUseCase = new DeleteUserUseCaseStub();
        const deleteUserController = new DeleteUserController(
            deleteUserUseCase,
        );

        return { deleteUserUseCase, deleteUserController };
    };

    const httpRequest = {
        params: {
            userId: faker.string.uuid(),
        },
    };

    it('should return 200 if user is deleted', async () => {
        const { deleteUserController } = makeSut();

        const result = await deleteUserController.execute(httpRequest);

        expect(result.statusCode).toBe(200);
    });

    it('should return 400 if id is invalid', async () => {
        const { deleteUserController } = makeSut();

        const result = await deleteUserController.execute({
            params: {
                userId: 'invalid_id',
            },
        });

        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('should return 404 if user is not found', async () => {
        const { deleteUserController, deleteUserUseCase } = makeSut();
        jest.spyOn(deleteUserUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError('user-id'),
        );

        const result = await deleteUserController.execute(httpRequest);

        expect(result.statusCode).toBe(404);
    });

    it('should return 500 if DeleteUserUseCase throws', async () => {
        const { deleteUserController, deleteUserUseCase } = makeSut();

        jest.spyOn(deleteUserUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const result = await deleteUserController.execute(httpRequest);

        expect(result.statusCode).toBe(500);
    });

    it('should call DeleteUserUseCase with correct values', async () => {
        const { deleteUserController, deleteUserUseCase } = makeSut();
        const executeSpy = jest.spyOn(deleteUserUseCase, 'execute');

        await deleteUserController.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(httpRequest.params.userId);
    });
});
