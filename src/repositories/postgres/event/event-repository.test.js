import dayjs from 'dayjs';
import { prisma } from '../../../../prisma/prisma.js';
import { event, user } from '../../../tests/index.js';
import { PostgresEventRepository } from './event-repository.js';

describe('Postgres Event Repository', () => {
    let sut;

    beforeEach(() => {
        sut = new PostgresEventRepository();
    });

    describe('create', () => {
        it('should create an event on db with correct dates', async () => {
            await prisma.user.create({ data: user });

            const result = await sut.create({ ...event, user_id: user.id });

            expect(result.id).toBeDefined();
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

        it('should throw if Prisma throws', async () => {
            jest.spyOn(prisma.event, 'create').mockRejectedValueOnce(
                new Error(),
            );

            await expect(sut.create(event)).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should return event by id', async () => {
            await prisma.user.create({ data: user });
            await prisma.event.create({
                data: {
                    ...event,
                    user_id: user.id,
                    start_date: new Date(event.start_date),
                    end_date: new Date(event.end_date),
                },
            });

            const result = await sut.findById(event.id);

            expect(result.id).toBe(event.id);
            expect(result.name).toBe(event.name);
            expect(result.user_id).toBe(user.id);
        });

        it('should return null if event is not found', async () => {
            const result = await sut.findById(event.id);

            expect(result).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should return all events for a user', async () => {
            await prisma.user.create({ data: user });
            await prisma.event.create({
                data: {
                    ...event,
                    user_id: user.id,
                    start_date: new Date(event.start_date),
                    end_date: new Date(event.end_date),
                },
            });

            const result = await sut.findByUserId(user.id);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(event.id);
            expect(result[0].user_id).toBe(user.id);
        });

        it('should return empty list if user has no events', async () => {
            const result = await sut.findByUserId(user.id);

            expect(result).toEqual([]);
        });
    });

    describe('update', () => {
        it('should update event fields and dates on db', async () => {
            await prisma.user.create({ data: user });
            await prisma.event.create({
                data: {
                    ...event,
                    user_id: user.id,
                    start_date: new Date(event.start_date),
                    end_date: new Date(event.end_date),
                },
            });

            const updatedData = {
                name: 'Updated Name',
                start_date: '2026-10-01T00:00:00.000Z',
                end_date: '2026-10-02T00:00:00.000Z',
            };

            const result = await sut.update(event.id, updatedData);

            expect(result.name).toBe(updatedData.name);
            expect(dayjs(result.start_date).toISOString()).toBe(
                dayjs(updatedData.start_date).toISOString(),
            );
            expect(dayjs(result.end_date).toISOString()).toBe(
                dayjs(updatedData.end_date).toISOString(),
            );
        });
    });

    describe('delete', () => {
        it('should delete event from db and return deleted event', async () => {
            await prisma.user.create({ data: user });
            await prisma.event.create({
                data: {
                    ...event,
                    user_id: user.id,
                    start_date: new Date(event.start_date),
                    end_date: new Date(event.end_date),
                },
            });

            const result = await sut.delete(event.id);

            expect(result.id).toBe(event.id);

            const searchOnDb = await prisma.event.findUnique({
                where: { id: event.id },
            });
            expect(searchOnDb).toBeNull();
        });
    });
});
