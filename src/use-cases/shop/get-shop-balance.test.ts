import { describe, it, expect, mock } from 'bun:test';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { EventNotFoundError } from '../../errors/event.js';
import { user, shop } from '../../tests/index.js';
import { GetShopBalanceUseCase } from './get-shop-balance.js';
import {
    Balance,
    EventRepository,
    ShopMember,
    ShopMemberRepository,
    ShopRepository,
    TransactionRepository,
} from '../../domain/index.js';

describe('Get Shop Balance Use Case', () => {
    const makeMember = (role: 'OWNER' | 'MEMBER' = 'OWNER'): ShopMember => ({
        id: 'member-id',
        shop_id: shop.id,
        user_id: user.id,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const fakeBalance: Balance = {
        earnings: '5000',
        expenses: '2000',
        investments: '1000',
        earningsPercentage: 62,
        expensePercentage: 25,
        investmentsPercentage: 12,
        balance: '2000',
    };

    const makeSut = () => {
        const transactionRepository: Pick<
            TransactionRepository,
            'getBalanceByShopId'
        > = {
            getBalanceByShopId: mock(async () => fakeBalance),
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

        const sut = new GetShopBalanceUseCase(
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

    it('should throw EventNotFoundError if filtered event belongs to a different shop', async () => {
        const { sut, eventRepository } = makeSut();
        eventRepository.findById = mock(async () => ({
            id: 'event-id',
            shop_id: 'other-shop-id',
            name: 'Event in other shop',
            description: null,
            start_date: '2026-06-01',
            end_date: '2026-06-02',
            created_by_user_id: user.id,
        }));

        await expect(
            sut.execute(shop.id, user.id, { event_id: 'event-id' }),
        ).rejects.toThrow(new EventNotFoundError('event-id'));
    });

    it('should return consolidated balance when user is authorized', async () => {
        const { sut, transactionRepository } = makeSut();

        const result = await sut.execute(shop.id, user.id, {
            from: '2026-01-01',
            to: '2026-12-31',
        });

        expect(result).toEqual(fakeBalance);
        expect(transactionRepository.getBalanceByShopId).toHaveBeenCalledWith(
            shop.id,
            {
                from: '2026-01-01',
                to: '2026-12-31',
            },
        );
    });
});
