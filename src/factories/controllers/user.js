import { PasswordHasherAdapter } from '../../adapters/index.js';
import {
    DeleteUserController,
    GetUserBalanceController,
    GetUserByIdController,
    UpdateUserController,
} from '../../controllers/index.js';
import { PostgresUserRepository } from '../../repositories/postgres/index.js';
import {
    DeleteUserUseCase,
    GetUserBalanceUseCase,
    GetUserByIdUseCase,
    UpdateUserUseCase,
} from '../../use-cases/index.js';

export const makeGetUserByIdController = () => {
    const userRepository = new PostgresUserRepository();

    const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

    return new GetUserByIdController(getUserByIdUseCase);
};

export const makeUpdateUserController = () => {
    const userRepository = new PostgresUserRepository();
    const passwordHasherAdapter = new PasswordHasherAdapter();

    const updateUserUseCase = new UpdateUserUseCase(
        userRepository,
        passwordHasherAdapter,
    );

    return new UpdateUserController(updateUserUseCase);
};

export const makeDeleteUserController = () => {
    const userRepository = new PostgresUserRepository();

    const deleteUserUseCase = new DeleteUserUseCase(userRepository);

    return new DeleteUserController(deleteUserUseCase);
};

export const makeGetUserBalanceController = () => {
    const userRepository = new PostgresUserRepository();

    const getUserBalanceUseCase = new GetUserBalanceUseCase(userRepository);

    return new GetUserBalanceController(getUserBalanceUseCase);
};
