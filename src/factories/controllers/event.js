import { IdGeneratorAdapter } from '../../adapters/index.js';
import {
    CreateEventController,
    DeleteEventController,
    GetEventByIdController,
    GetEventsByUserIdController,
    UpdateEventController,
} from '../../controllers/index.js';
import {
    PostgresCreateEventRepository,
    PostgresDeleteEventRepository,
    PostgresGetEventByIdRepository,
    PostgresGetEventsByUserIdRepository,
    PostgresGetUserByIdRepository,
    PostgresUpdateEventRepository,
} from '../../repositories/postgres/index.js';
import {
    CreateEventUseCase,
    DeleteEventUseCase,
    GetEventByIdUseCase,
    GetEventsByUserIdUseCase,
    UpdateEventUseCase,
} from '../../use-cases/index.js';

export const makeCreateEventController = () => {
    const createEventRepository = new PostgresCreateEventRepository();
    const getUserByIdRepository = new PostgresGetUserByIdRepository();
    const idGeneratorAdapter = new IdGeneratorAdapter();

    const createEventUseCase = new CreateEventUseCase(
        createEventRepository,
        getUserByIdRepository,
        idGeneratorAdapter,
    );

    return new CreateEventController(createEventUseCase);
};

export const makeGetEventsByUserIdController = () => {
    const getEventsByUserIdRepository =
        new PostgresGetEventsByUserIdRepository();
    const getUserByIdRepository = new PostgresGetUserByIdRepository();

    const getEventsByUserIdUseCase = new GetEventsByUserIdUseCase(
        getEventsByUserIdRepository,
        getUserByIdRepository,
    );

    return new GetEventsByUserIdController(getEventsByUserIdUseCase);
};

export const makeGetEventByIdController = () => {
    const getEventByIdRepository = new PostgresGetEventByIdRepository();

    const getEventByIdUseCase = new GetEventByIdUseCase(getEventByIdRepository);

    return new GetEventByIdController(getEventByIdUseCase);
};

export const makeUpdateEventController = () => {
    const getEventByIdRepository = new PostgresGetEventByIdRepository();
    const updateEventRepository = new PostgresUpdateEventRepository();

    const updateEventUseCase = new UpdateEventUseCase(
        getEventByIdRepository,
        updateEventRepository,
    );

    return new UpdateEventController(updateEventUseCase);
};

export const makeDeleteEventController = () => {
    const getEventByIdRepository = new PostgresGetEventByIdRepository();
    const deleteEventRepository = new PostgresDeleteEventRepository();

    const deleteEventUseCase = new DeleteEventUseCase(
        getEventByIdRepository,
        deleteEventRepository,
    );

    return new DeleteEventController(deleteEventUseCase);
};
