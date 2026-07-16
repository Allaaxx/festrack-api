import { LoginUserController } from './login-user.js';
import { user } from '../../tests/fixtures/user.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';
describe('Login User Controller', () => {
    const httpRequest = {
        body: {
            email: 'any_email@email.com',
            password: '123454678',
        },
    };
    class LoginUserUseCaseStub {
        execute() {
            return {
                ...user,
                tokens: {
                    access_token: 'any_token',
                    refresh_token: 'any_refresh_token',
                },
            };
        }
    }
    const makeSut = () => {
        const loginUserUseCase = new LoginUserUseCaseStub();
        const sut = new LoginUserController(loginUserUseCase);
        return {
            sut,
            loginUserUseCase,
        };
    };

    it('should return 200 with user and tokens', async () => {
        const { sut } = makeSut();
        const httpRequest = {
            body: {
                email: 'any_email@email.com',
                password: 'any_password',
            },
        };
        const result = await sut.execute(httpRequest);
        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual({
            ...user,
            tokens: {
                access_token: 'any_token',
                refresh_token: 'any_refresh_token',
            },
        });
    });

    it('should return 400 if email is invalid', async () => {
        const { sut } = makeSut();
        const httpRequest = {
            body: {
                email: 'invalid_email',
                password: 'any_password',
            },
        };
        const result = await sut.execute(httpRequest);
        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual({
            message: 'Please provide a valid e-mail.',
        });
    });

    it('should return 400 if password is too short', async () => {
        const { sut } = makeSut();
        const httpRequest = {
            body: {
                email: 'any_email@email.com',
                password: 'short',
            },
        };
        const result = await sut.execute(httpRequest);
        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual({
            message: 'Password must have at least 6 characters',
        });
    });

    it('should return 401 if password is not valid', async () => {
        const { sut, loginUserUseCase } = makeSut();
        jest.spyOn(loginUserUseCase, 'execute').mockRejectedValue(
            new InvalidPasswordError(),
        );
        const response = await sut.execute(httpRequest);
        expect(response.statusCode).toBe(401);
    });

    it('should return 404 if user is not found', async () => {
        const { sut, loginUserUseCase } = makeSut();
        jest.spyOn(loginUserUseCase, 'execute').mockRejectedValue(
            new UserNotFoundError(),
        );
        const response = await sut.execute(httpRequest);
        expect(response.statusCode).toBe(404);
    });

    it('should return 500 if LoginUserUseCase throws', async () => {
        const { sut, loginUserUseCase } = makeSut();
        jest.spyOn(loginUserUseCase, 'execute').mockImplementationOnce(() => {
            throw new Error();
        });

        const response = await sut.execute(httpRequest);

        expect(response.statusCode).toBe(500);
    });
});
