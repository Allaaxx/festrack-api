import { prisma } from '../../../../prisma/prisma.js';
import { event, user } from '../../../tests/index.js';
import { PostgresUpdateEventRepository } from './update-event.js';

describe('Postgres Update Event Repository', () => {
    it('should update an event', async () => {
        await prisma.user.create({ data: user });
        await prisma.event.create({
            data: {
                ...event,
                user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            },
        });

        const sut = new PostgresUpdateEventRepository();

        const updateParams = {
            name: 'Updated Name',
            description: 'Updated Description',
            start_date: '2026-10-01T00:00:00.000Z',
            end_date: '2026-10-02T00:00:00.000Z',
        };

        const result = await sut.execute(event.id, updateParams);

        expect(result.name).toBe(updateParams.name);
        expect(result.description).toBe(updateParams.description);
    });

    it('should call Prisma with correct params', async () => {
        await prisma.user.create({ data: user });
        await prisma.event.create({
            data: {
                ...event,
                user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            },
        });

        const sut = new PostgresUpdateEventRepository();
        const prismaSpy = jest.spyOn(prisma.event, 'update');

        const updateParams = {
            name: 'Updated Name',
        };

        await sut.execute(event.id, updateParams);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: { id: event.id },
            data: { ...updateParams },
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresUpdateEventRepository();
        jest.spyOn(prisma.event, 'update').mockRejectedValueOnce(new Error());

        await expect(sut.execute(event.id, { name: 'Name' })).rejects.toThrow();
    });
});
