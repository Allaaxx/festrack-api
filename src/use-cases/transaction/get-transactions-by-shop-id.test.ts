import { describe, it, expect, mock } from 'bun:test';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { EventNotFoundError } from '../../errors/event.js';
import { transaction, user, shop } from '../../tests/index.js';
import { GetTransactionsByShopIdUseCase } from './get-transactions-by-shop-id.js';
import {
    EventRepository,
    ShopMember,
    ShopMemberRepository,
    ShopRepository,
    TransactionRepository,
} from '../../domain/index.js';

describe('Get Transactions By Shop Id Use Case', () => {
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
            'findByShopId'
        > = {
            findByShopId: mock(async () => [
                {
                    ...transaction,
                    shop_id: shop.id,
                    created_by_user_id: user.id,
                },
            ]),
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

        const sut = new GetTransactionsByShopIdUseCase(
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

        await expect(sut.execute(shop.id, user.id)).rejects.toThrow(
            new ShopNotFoundError(shop.id),
        );
    });

    it('should throw ForbiddenError if user is not a member', async () => {
        const { sut, shopMemberRepository } = makeSut();
        shopMemberRepository.findByShopAndUserId = mock(async () => null);

        await expect(sut.execute(shop.id, user.id)).rejects.toThrow(
            ForbiddenError,
        );
    });

    it('should throw EventNotFoundError if filtered event does not exist', async () => {
        const { sut, eventRepository } = makeSut();
        eventRepository.findById = mock(async () => null);

        await expect(
            sut.execute(shop.id, user.id, { event_id: 'non-existent' }),
        ).rejects.toThrow(new EventNotFoundError('non-existent'));
    });

    it('should throw EventNotFoundError if filtered event belongs to another shop', async () => {
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
            sut.execute(shop.id, user.id, { event_id: 'event-id' }),
        ).rejects.toThrow(new EventNotFoundError('event-id'));
    });

    it('should return transactions for valid shop member', async () => {
        const { sut, transactionRepository } = makeSut();

        const result = await sut.execute(shop.id, user.id, {
            from: '2026-01-01',
        });

        expect(result.length).toBe(1);
        expect(result[0].shop_id).toBe(shop.id);
        expect(transactionRepository.findByShopId).toHaveBeenCalledWith(
            shop.id,
            { from: '2026-01-01' },
        );
    });
});
