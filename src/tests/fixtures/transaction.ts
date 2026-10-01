import { faker } from '@faker-js/faker';
import { Transaction } from '../../domain/index.js';

export const transaction: Transaction = {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    name: faker.commerce.productName(),
    date: faker.date.anytime().toISOString(),
    type: 'EXPENSE',
    amount: Number(faker.finance.amount()),
};
