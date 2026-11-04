import { faker } from '@faker-js/faker';
import { Shop } from '../../domain/index.js';

export const shop: Shop = {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};
