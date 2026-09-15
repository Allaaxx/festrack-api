import dayjs from 'dayjs';
import { prisma } from '../../../../prisma/prisma.js';
import { event, user } from '../../../tests/index.js';
import { PostgresGetEventsByUserIdRepository } from './get-events-by-user-id.js';

describe('Postgres Get Events By User Id Repository', () => {
    it('should return events of the provided user ordered by start_date desc', async () => {
        const sut = new PostgresGetEventsByUserIdRepository();

        await prisma.user.create({ data: user });

        const event1 = {
            ...event,
            id: 'event-id-1',
            user_id: user.id,
            start_date: new Date('2026-05-01'),
            end_date: new Date('2026-05-02'),
        };
        const event2 = {
            ...event,
            id: 'event-id-2',
            user_id: user.id,
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-02'),
        };

        await prisma.event.create({ data: event1 });
        await prisma.event.create({ data: event2 });

        const result = await sut.execute(user.id);

        expect(result.length).toBe(2);
        expect(result[0].id).toBe(event2.id);
        expect(result[1].id).toBe(event1.id);
        expect(dayjs(result[0].start_date).toISOString()).toBe(
            dayjs(event2.start_date).toISOString(),
        );
    });

    it('should return an empty array if no events are found', async () => {
        await prisma.user.create({ data: user });

        const sut = new PostgresGetEventsByUserIdRepository();
        const result = await sut.execute(user.id);

        expect(result).toEqual([]);
    });

    it('should call Prisma with correct params', async () => {
        const prismaSpy = jest.spyOn(prisma.event, 'findMany');
        const sut = new PostgresGetEventsByUserIdRepository();

        await sut.execute(user.id);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: { user_id: user.id },
            orderBy: { start_date: 'desc' },
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresGetEventsByUserIdRepository();
        jest.spyOn(prisma.event, 'findMany').mockRejectedValueOnce(new Error());

        await expect(sut.execute(user.id)).rejects.toThrow();
    });
});
