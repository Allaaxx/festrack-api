import { describe, it, expect, mock } from 'bun:test';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import { EventNotFoundError } from '../../errors/event.js';
import { transaction, user, shop } from '../../tests/index.js';
import { UpdateTransactionUseCase } from './update-transaction.js';
import {
    EventRepository,
    ShopMember,
    ShopMemberRepository,
    ShopRepository,
    TransactionRepository,
} from '../../domain/index.js';

describe('Update Transaction Use Case', () => {
    const makeMember = (role: 'OWNER' | 'MEMBER' = 'OWNER'): ShopMember => ({
        id: 'member-id',
        shop_id: shop.id,
        user_id: user.id,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const makeSut = () => {
        const transactionRepository: Pick<
            TransactionRepository,
            'findById' | 'update'
        > = {
            findById: mock(async () => ({
                ...transaction,
                shop_id: shop.id,
                created_by_user_id: user.id,
            })),
            update: mock(async (_id, params) => ({
                ...transaction,
                ...params,
                shop_id: shop.id,
                created_by_user_id: user.id,
            })),
        };

        const shopRepository: Pick<ShopRepository, 'findById'> = {
            findById: mock(async () => shop),
        };

        const shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        > = {
            findByShopAndUserId: mock(async () => makeMember()),
        };

        const eventRepository: Pick<EventRepository, 'findById'> = {
            findById: mock(async () => ({
                id: 'event-id',
                shop_id: shop.id,
                name: 'Event 1',
                description: null,
                start_date: '2026-06-01',
                end_date: '2026-06-02',
                created_by_user_id: user.id,
            })),
        };

        const sut = new UpdateTransactionUseCase(
            transactionRepository,
            shopRepository,
            shopMemberRepository,
            eventRepository,
        );

        return {
            sut,
            transactionRepository,
            shopRepository,
            shopMemberRepository,
            eventRepository,
        };
    };

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const { sut, shopRepository } = makeSut();
        shopRepository.findById = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id, { name: 'Updated' }),
        ).rejects.toThrow(new ShopNotFoundError(shop.id));
    });

    it('should throw ForbiddenError if user is not a member', async () => {
        const { sut, shopMemberRepository } = makeSut();
        shopMemberRepository.findByShopAndUserId = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id, { name: 'Updated' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw TransactionNotFoundError if transaction does not exist', async () => {
        const { sut, transactionRepository } = makeSut();
        transactionRepository.findById = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id, { name: 'Updated' }),
        ).rejects.toThrow(new TransactionNotFoundError(transaction.id));
    });

    it('should throw TransactionNotFoundError if transaction belongs to another shop', async () => {
        const { sut, transactionRepository } = makeSut();
        transactionRepository.findById = mock(async () => ({
            ...transaction,
            shop_id: 'other-shop-id',
            created_by_user_id: user.id,
        }));

        await expect(
            sut.execute(shop.id, transaction.id, user.id, { name: 'Updated' }),
        ).rejects.toThrow(new TransactionNotFoundError(transaction.id));
    });

    it('should throw EventNotFoundError if new event_id does not exist', async () => {
        const { sut, eventRepository } = makeSut();
        eventRepository.findById = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id, {
                event_id: 'non-existent',
            }),
        ).rejects.toThrow(new EventNotFoundError('non-existent'));
    });

    it('should throw EventNotFoundError if new event_id belongs to another shop', async () => {
        const { sut, eventRepository } = makeSut();
        eventRepository.findById = mock(async () => ({
            id: 'event-id',
            shop_id: 'other-shop-id',
            name: 'Other Event',
            description: null,
            start_date: '2026-06-01',
            end_date: '2026-06-02',
            created_by_user_id: user.id,
        }));

        await expect(
            sut.execute(shop.id, transaction.id, user.id, {
                event_id: 'event-id',
            }),
        ).rejects.toThrow(new EventNotFoundError('event-id'));
    });

    it('should update transaction when all validations pass', async () => {
        const { sut, transactionRepository } = makeSut();

        const result = await sut.execute(shop.id, transaction.id, user.id, {
            name: 'New Name',
        });

        expect(result.name).toBe('New Name');
        expect(transactionRepository.update).toHaveBeenCalledWith(
            transaction.id,
            { name: 'New Name' },
        );
    });
});
