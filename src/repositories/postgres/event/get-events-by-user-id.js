import { prisma } from '../../../../prisma/prisma.js';

export class PostgresGetEventsByUserIdRepository {
    async execute(userId) {
        return await prisma.event.findMany({
            where: { user_id: userId },
            orderBy: { start_date: 'desc' },
        });
    }
}
