import { LoginUserUseCase } from './login-user';
import { user } from '../../tests/fixtures/user.js';
import { UserNotFoundError } from '../../errors/user';

describe('Login User Use Case', () => {
    class GetUserByEmailRepositoryStub {
        async execute() {
            return user;
        }
    }

    const makeSut = () => {
        const getUserByEmailRepositoryStub = new GetUserByEmailRepositoryStub();
        const sut = new LoginUserUseCase(getUserByEmailRepositoryStub);

        return { sut, getUserByEmailRepositoryStub };
    };

    it('should throw UserNotFoundError if user is not found', async () => {
        const { sut, getUserByEmailRepositoryStub } = makeSut();
        import.meta.jest
            .spyOn(getUserByEmailRepositoryStub, 'execute')
            .mockResolvedValueOnce(null);
        const promise = sut.execute('any_email', 'any_password');
        await expect(promise).rejects.toThrow(new UserNotFoundError());
    });
});
