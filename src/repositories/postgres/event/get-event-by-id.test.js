import { prisma } from '../../../../prisma/prisma.js';
import { event, user } from '../../../tests/index.js';
import { PostgresGetEventByIdRepository } from './get-event-by-id.js';

describe('Postgres Get Event By Id Repository', () => {
    it('should return event by id', async () => {
        const sut = new PostgresGetEventByIdRepository();

        await prisma.user.create({ data: user });
        await prisma.event.create({
            data: {
                ...event,
                user_id: user.id,
                start_date: new Date(event.start_date),
                end_date: new Date(event.end_date),
            },
        });

        const result = await sut.execute(event.id);

        expect(result.id).toBe(event.id);
        expect(result.name).toBe(event.name);
        expect(result.user_id).toBe(user.id);
    });

    it('should return null if event is not found', async () => {
        const sut = new PostgresGetEventByIdRepository();

        const result = await sut.execute(event.id);

        expect(result).toBeNull();
    });

    it('should call Prisma with correct params', async () => {
        const prismaSpy = jest.spyOn(prisma.event, 'findUnique');
        const sut = new PostgresGetEventByIdRepository();

        await sut.execute(event.id);

        expect(prismaSpy).toHaveBeenCalledWith({
            where: { id: event.id },
        });
    });

    it('should throw if Prisma throws', async () => {
        const sut = new PostgresGetEventByIdRepository();
        jest.spyOn(prisma.event, 'findUnique').mockRejectedValueOnce(
            new Error(),
        );

        await expect(sut.execute(event.id)).rejects.toThrow();
    });
});
