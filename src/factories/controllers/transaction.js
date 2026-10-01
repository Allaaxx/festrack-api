import {
    CreateTransactionController,
    DeleteTransactionController,
    GetTransactionsByUserIdController,
    UpdateTransactionController,
} from '../../controllers/index.js';
import {
    PostgresTransactionRepository,
    PostgresUserRepository,
    PostgresEventRepository,
} from '../../repositories/postgres/index.js';

import {
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    GetTransactionByUserIdUseCase,
    UpdateTransactionUseCase,
} from '../../use-cases/index.js';

export const makeCreateTransactionController = () => {
    const transactionRepository = new PostgresTransactionRepository();
    const userRepository = new PostgresUserRepository();
    const eventRepository = new PostgresEventRepository();

    const createTransactionUseCase = new CreateTransactionUseCase(
        transactionRepository,
        userRepository,
        eventRepository,
    );

    return new CreateTransactionController(createTransactionUseCase);
};

export const makeGetTransactionsByUserIdController = () => {
    const transactionRepository = new PostgresTransactionRepository();
    const userRepository = new PostgresUserRepository();

    const getTransactionsByUserIdUseCase = new GetTransactionByUserIdUseCase(
        transactionRepository,
        userRepository,
    );

    return new GetTransactionsByUserIdController(
        getTransactionsByUserIdUseCase,
    );
};

export const makeUpdateTransactionController = () => {
    const transactionRepository = new PostgresTransactionRepository();
    const eventRepository = new PostgresEventRepository();

    const updateTransactionUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        eventRepository,
    );

    return new UpdateTransactionController(updateTransactionUseCase);
};

export const makeDeleteTransactionController = () => {
    const transactionRepository = new PostgresTransactionRepository();

    const deleteTransactionUseCase = new DeleteTransactionUseCase(
        transactionRepository,
    );

    return new DeleteTransactionController(deleteTransactionUseCase);
};
