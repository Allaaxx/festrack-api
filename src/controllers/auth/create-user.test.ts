import { faker } from '@faker-js/faker';
import { EmailAlreadyInUseError } from '../../errors/user.js';
import { user } from '../../tests/index.js';
import { CreateUserController } from './create-user.js';
import { CreateUserUseCase } from '../../use-cases/index.js';
import { UserWithTokens } from '../../domain/index.js';

describe('Create User Controller', () => {
    class CreateUserUseCaseStub implements Pick<CreateUserUseCase, 'execute'> {
        async execute(): Promise<UserWithTokens> {
            return {
                ...user,
                tokens: {
                    accessToken: 'any_token',
                    refreshToken: 'any_refresh_token',
                },
            };
        }
    }

    const makeSut = () => {
        const createUserUseCase = new CreateUserUseCaseStub();
        const sut = new CreateUserController(createUserUseCase);

        return { createUserUseCase, sut };
    };

    const httpRequest = {
        body: {
            ...user,
            id: undefined,
        },
    };

    it('should return 201 when creating an user successfully', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(httpRequest);

        expect(result.statusCode).toBe(201);
        expect(result.body).toEqual({
            ...user,
            tokens: {
                accessToken: 'any_token',
                refreshToken: 'any_refresh_token',
            },
        });
    });

    it('should return 400 if first_name is not provided', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            body: {
                ...httpRequest.body,
                first_name: undefined as any,
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 if last_name is not provided', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            body: {
                ...httpRequest.body,
                last_name: undefined as any,
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 if email is not provided', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            body: {
                ...httpRequest.body,
                email: undefined as any,
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 if email is not valid', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            body: {
                ...httpRequest.body,
                email: 'invalid_email',
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 if password is not provided', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            body: {
                ...httpRequest.body,
                password: undefined as any,
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 if password is less than 6 characters', async () => {
        const { sut } = makeSut();

        const result = await sut.execute({
            body: {
                ...httpRequest.body,
                password: faker.internet.password({ length: 4 }),
            },
        });

        expect(result.statusCode).toBe(400);
    });

    it('should call CreateUserUseCase with correct params', async () => {
        const { createUserUseCase, sut } = makeSut();
        const executeSpy = jest.spyOn(createUserUseCase, 'execute');

        await sut.execute(httpRequest);

        expect(executeSpy).toHaveBeenCalledWith(httpRequest.body);
    });

    it('should return 500 if CreateUserUseCase throws', async () => {
        const { createUserUseCase, sut } = makeSut();
        jest.spyOn(createUserUseCase, 'execute').mockRejectedValueOnce(
            new Error(),
        );

        const result = await sut.execute(httpRequest);

        expect(result.statusCode).toBe(500);
    });

    it('should return 400 if CreateUserUseCase throws EmailAlreadyInUseError', async () => {
        const { createUserUseCase, sut } = makeSut();

        jest.spyOn(createUserUseCase, 'execute').mockRejectedValueOnce(
            new EmailAlreadyInUseError(httpRequest.body.email),
        );

        const result = await sut.execute(httpRequest);

        expect(result.statusCode).toBe(400);
    });
});
