import { LoginUserController } from './login-user.js';
import { user } from '../../tests/fixtures/user.js';
describe('Login User Controller', () => {
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
});
