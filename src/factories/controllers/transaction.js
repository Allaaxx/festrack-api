import { IdGeneratorAdapter } from '../../adapters/index.js';
import {
    CreateTransactionController,
    DeleteTransactionController,
    GetTransactionsByUserIdController,
    UpdateTransactionController,
} from '../../controllers/index.js';
import {
    PostgresCreateTransactionRepository,
    PostgresDeleteTransactionRepository,
    PostgresGetTransactionsByUserIdRepository,
    PostgresGetTransactionByIdRepository,
    PostgresGetUserByIdRepository,
    PostgresUpdateTransactionRepository,
    PostgresGetEventByIdRepository,
} from '../../repositories/postgres/index.js';

import {
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    GetTransactionByUserIdUseCase,
    UpdateTransactionUseCase,
} from '../../use-cases/index.js';

export const makeCreateTransactionController = () => {
    const createTransactionRepository =
        new PostgresCreateTransactionRepository();

    const getUserByIdRepository = new PostgresGetUserByIdRepository();

    const idGeneratorAdapter = new IdGeneratorAdapter();

    const getEventByIdRepository = new PostgresGetEventByIdRepository();

    const createTransactionUseCase = new CreateTransactionUseCase(
        createTransactionRepository,
        getUserByIdRepository,
        idGeneratorAdapter,
        getEventByIdRepository,
    );

    const creaTransactionController = new CreateTransactionController(
        createTransactionUseCase,
    );

    return creaTransactionController;
};


export const makeGetTransactionsByUserIdController = () => {
    const getTransactionsByUserIdRepository =
        new PostgresGetTransactionsByUserIdRepository();

    const getUserByIdRepository = new PostgresGetUserByIdRepository();

    const getTransactionsByUserIdUseCase = new GetTransactionByUserIdUseCase(
        getTransactionsByUserIdRepository,
        getUserByIdRepository,
    );

    const getTransactionsByUserIdController =
        new GetTransactionsByUserIdController(getTransactionsByUserIdUseCase);

    return getTransactionsByUserIdController;
};

export const makeUpdateTransactionController = () => {
    const updateTransactionRepository =
        new PostgresUpdateTransactionRepository();
    const getTransactionByIdRepository =
        new PostgresGetTransactionByIdRepository();
    const getEventByIdRepository = new PostgresGetEventByIdRepository();

    const updateTransactionUseCase = new UpdateTransactionUseCase(
        updateTransactionRepository,
        getTransactionByIdRepository,
        getEventByIdRepository,
    );

    const updateTransactionController = new UpdateTransactionController(
        updateTransactionUseCase,
    );

    return updateTransactionController;
};

export const makeDeleteTransactionController = () => {
    const deleteTransactionRepository =
        new PostgresDeleteTransactionRepository();

    const getTransactionByIdRepository =
        new PostgresGetTransactionByIdRepository();

    const deleteTransactionUseCase = new DeleteTransactionUseCase(
        getTransactionByIdRepository,
        deleteTransactionRepository,
    );

    const deleteTransactionController = new DeleteTransactionController(
        deleteTransactionUseCase,
    );

    return deleteTransactionController;
};
