import {
    CreateUserController,
    LoginUserController,
    RefreshTokenController,
} from '../../controllers/index.js';
import {
    makeCreateUserController,
    makeLoginUserController,
    makeRefreshTokenController,
} from './auth.js';

describe('Auth Controller Factory', () => {
    it('should return a valid CreateUserController instance', () => {
        expect(makeCreateUserController()).toBeInstanceOf(CreateUserController);
    });

    it('should return a valid LoginUserController instance', () => {
        expect(makeLoginUserController()).toBeInstanceOf(LoginUserController);
    });

    it('should return a valid RefreshTokenController instance', () => {
        expect(makeRefreshTokenController()).toBeInstanceOf(
            RefreshTokenController,
        );
    });
});
