import { prisma } from '../../../../prisma/prisma.js';

export class PostgresUpdateEventRepository {
    async execute(eventId, updateEventParams) {
        return await prisma.event.update({
            where: { id: eventId },
            data: {
                ...updateEventParams,
                ...(updateEventParams.start_date && {
                    start_date: new Date(updateEventParams.start_date),
                }),
                ...(updateEventParams.end_date && {
                    end_date: new Date(updateEventParams.end_date),
                }),
            },
        });
    }
}
