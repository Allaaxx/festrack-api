import { jest } from '@jest/globals';
import { prisma } from './prisma/prisma.js';

globalThis.jest = jest;

beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.user.deleteMany({});
});

afterEach(async () => {
    await prisma.$disconnect();
});
