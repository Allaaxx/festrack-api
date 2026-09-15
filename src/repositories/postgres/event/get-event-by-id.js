import { prisma } from '../../../../prisma/prisma.js';

export class PostgresGetEventByIdRepository {
    async execute(eventId) {
        return await prisma.event.findUnique({
            where: { id: eventId },
        });
    }
}
