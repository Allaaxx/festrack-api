import { faker } from '@faker-js/faker';
import {
    EmailAlreadyInUseError,
    UserNotFoundError,
} from '../../errors/user.js';
import { user } from '../../tests/index.js';
import { UpdateUserController, IUpdateUserUseCase } from './update-user.js';
import { User } from '../../domain/entities/user.js';

describe('Update User Controller', () => {
    class UpdateUserUseCaseStub implements IUpdateUserUseCase {
        async execute(): Promise<User> {
            return user;
        }
    }

    const makeSut = () => {
        const updateUserUseCase = new UpdateUserUseCaseStub();
        const updateUserController = new UpdateUserController(
            updateUserUseCase,
        );

        return { updateUserController, updateUserUseCase };
    };

    const httpRequest = {
        params: {
            userId: faker.string.uuid(),
        },
        body: {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            email: faker.internet.email(),
            password: faker.internet.password({
                length: 7,
            }),
        },
    };

    it('should return 200 when updating a user successfully', async () => {
        const { updateUserController } = makeSut();

        const response = await updateUserController.execute(httpRequest);

        expect(response.statusCode).toBe(200);
    });

    it('should return 400 when an invalid email is provided', async () => {
        const { updateUserController } = makeSut();

        const response = await updateUserController.execute({
            params: httpRequest.params,
            body: {
                ...httpRequest.body,
                email: 'invalid_email',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when an invalid password is provided', async () => {
        const { updateUserController } = makeSut();

        const response = await updateUserController.execute({
            params: httpRequest.params,
            body: {
                ...httpRequest.body,
                password: faker.internet.password({
                    length: 5,
                }),
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 400 when an invalid id is provided', async () => {
        const { updateUserController } = makeSut();

        const response = await updateUserController.execute({
            params: {
                userId: 'invalid_id',
            },
            body: httpRequest.body,
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
            message: 'The provided id is not valid.',
        });
    });

    it('should return 400 when an unallowed field is provided', async () => {
        const { updateUserController } = makeSut();

        const response = await updateUserController.execute({
            params: httpRequest.params,
            body: {
                ...httpRequest.body,
                unallowed_field: 'unallowed_value',
            } as any,
        });

        expect(response.statusCode).toBe(400);
    });

    it('should return 500 if UpdateUserUseCase throws with generic error', async () => {
        const { updateUserController, updateUserUseCase } = makeSut();
        jest.spyOn(updateUserUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const response = await updateUserController.execute({
            params: httpRequest.params,
            body: httpRequest.body,
        });

        expect(response.statusCode).toBe(500);
    });

    it('should return 400 if UpdateUserUseCase throws with EmailAlreadyInUseError', async () => {
        const { updateUserController, updateUserUseCase } = makeSut();
        jest.spyOn(updateUserUseCase, 'execute').mockRejectedValueOnce(
            new EmailAlreadyInUseError(faker.internet.email()),
        );

        const response = await updateUserController.execute(httpRequest);

        expect(response.statusCode).toBe(400);
    });

    it('should return 404 if UpdateUserUseCase throws UserNotFoundError', async () => {
        const { updateUserController, updateUserUseCase } = makeSut();
        jest.spyOn(updateUserUseCase, 'execute').mockRejectedValueOnce(
            new UserNotFoundError(faker.string.uuid()),
        );

        const response = await updateUserController.execute(httpRequest);

        expect(response.statusCode).toBe(404);
    });

    it('should call UpdateUserUseCase with correct values', async () => {
        const { updateUserController, updateUserUseCase } = makeSut();
        const executeSpy = jest.spyOn(updateUserUseCase, 'execute');

        await updateUserController.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(
            httpRequest.params.userId,
            httpRequest.body,
        );
    });
});
