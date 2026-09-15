import { prisma } from '../../../../prisma/prisma.js';
import { event, user } from '../../../tests/index.js';
import { PostgresDeleteEventRepository } from './delete-event.js';

describe('Postgres Delete Event Repository', () => {
    it('should delete an event from db', async () => {
        await prisma.user.create({ data: user });
        await prisma.event.create({
            data: {
                ...event,
                user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            },
        });

        const sut = new PostgresDeleteEventRepository();

        const result = await sut.execute(event.id);

        expect(result.id).toBe(event.id);

        const deletedEvent = await prisma.event.findUnique({
            where: { id: event.id },
        });
        expect(deletedEvent).toBeNull();
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

        const sut = new PostgresDeleteEventRepository();
        const prismaSpy = jest.spyOn(prisma.event, 'delete');

        await sut.execute(event.id);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: { id: event.id },
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresDeleteEventRepository();
        jest.spyOn(prisma.event, 'delete').mockRejectedValueOnce(new Error());

        await expect(sut.execute(event.id)).rejects.toThrow();
    });
});
