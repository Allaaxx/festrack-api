import { faker } from '@faker-js/faker';
import { User, UserBalance } from '../../domain/index.js';

export const user: User = {
    id: faker.string.uuid(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password({
        length: 7,
    }),
};

export const userBalance: UserBalance = {
    earnings: '10000',
    expenses: '2000',
    investments: '2000',
    earningsPercentage: 71,
    expensePercentage: 14,
    investmentsPercentage: 14,
    balance: '6000',
};
