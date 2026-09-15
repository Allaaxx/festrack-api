import dayjs from 'dayjs';
import { prisma } from '../../../../prisma/prisma.js';
import { event, user } from '../../../tests/index.js';
import { PostgresCreateEventRepository } from './create-event.js';

describe('Postgres Create Event Repository', () => {
    it('should create event on db', async () => {
        await prisma.user.create({ data: user });
        const sut = new PostgresCreateEventRepository();

        const result = await sut.execute({ ...event, user_id: user.id });

        expect(result.name).toBe(event.name);
        expect(result.description).toBe(event.description);
        expect(result.user_id).toBe(user.id);
        expect(dayjs(result.start_date).toISOString()).toBe(
            dayjs(event.start_date).toISOString(),
        );
        expect(dayjs(result.end_date).toISOString()).toBe(
            dayjs(event.end_date).toISOString(),
        );
    });

    it('should call Prisma with correct params', async () => {
        await prisma.user.create({ data: user });
        const sut = new PostgresCreateEventRepository();
        const prismaSpy = jest.spyOn(prisma.event, 'create');

        await sut.execute({ ...event, user_id: user.id });

        expect(prismaSpy).toHaveBeenCalledWith({
            data: {
                ...event,
                user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            },
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresCreateEventRepository();
        jest.spyOn(prisma.event, 'create').mockRejectedValueOnce(new Error());

        const promise = sut.execute(event);

        await expect(promise).rejects.toThrow();
    });
});
