import { prisma } from '../../../../prisma/prisma.js';

export class PostgresCreateEventRepository {
    async execute(createEventParams) {
        return await prisma.event.create({
            data: {
                ...createEventParams,
                start_date: new Date(createEventParams.start_date),
                end_date: new Date(createEventParams.end_date),
            },
        });
    }
}
