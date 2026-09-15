import { IdGeneratorAdapter } from '../../adapters/index.js';
import { CreateEventController } from '../../controllers/index.js';
import {
    PostgresCreateEventRepository,
    PostgresGetUserByIdRepository,
} from '../../repositories/postgres/index.js';
import { CreateEventUseCase } from '../../use-cases/index.js';

export const makeCreateEventController = () => {
    const createEventRepository = new PostgresCreateEventRepository();
    const getUserByIdRepository = new PostgresGetUserByIdRepository();
    const idGeneratorAdapter = new IdGeneratorAdapter();

    const createEventUseCase = new CreateEventUseCase(
        createEventRepository,
        getUserByIdRepository,
        idGeneratorAdapter,
    );

    const createEventController = new CreateEventController(createEventUseCase);

    return createEventController;
};
