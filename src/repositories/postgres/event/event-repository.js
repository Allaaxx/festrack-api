import { prisma } from '../../../../prisma/prisma.js';

export class PostgresEventRepository {
    async create(createEventParams) {
        return await prisma.event.create({
            data: {
                ...createEventParams,
                start_date: new Date(createEventParams.start_date),
                end_date: new Date(createEventParams.end_date),
            },
        });
    }

    async findById(eventId) {
        return await prisma.event.findUnique({
            where: { id: eventId },
        });
    }

    async findByUserId(userId) {
        return await prisma.event.findMany({
            where: { user_id: userId },
        });
    }

    async update(eventId, updateEventParams) {
        return await prisma.event.update({
            where: { id: eventId },
            data: {
                ...updateEventParams,
                start_date: updateEventParams.start_date
                    ? new Date(updateEventParams.start_date)
                    : undefined,
                end_date: updateEventParams.end_date
                    ? new Date(updateEventParams.end_date)
                    : undefined,
            },
        });
    }

    async delete(eventId) {
        return await prisma.event.delete({
            where: { id: eventId },
        });
    }
}
