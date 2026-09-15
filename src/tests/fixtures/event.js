import { faker } from '@faker-js/faker';

export const event = {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    name: faker.word.words(2),
    description: faker.lorem.sentence(),
    start_date: '2026-09-15T00:00:00.000Z',
    end_date: '2026-09-16T00:00:00.000Z',
};
