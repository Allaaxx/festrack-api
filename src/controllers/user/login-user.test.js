import { LoginUserController } from './login-user.js';
import { user } from '../../tests/fixtures/user.js';
describe('Login user controller', () => {
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

    test('should return 200 with user and tokens', async () => {
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
});
