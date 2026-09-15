import { prisma } from '../../../../prisma/prisma.js';

export class PostgresDeleteEventRepository {
    async execute(eventId) {
        return await prisma.event.delete({
            where: { id: eventId },
        });
    }
}
