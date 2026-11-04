import { describe, it, expect, mock } from 'bun:test';
import { EventNotFoundError } from '../../errors/event.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { transaction, user, shop } from '../../tests/index.js';
import { CreateTransactionUseCase } from './create-transaction.js';
import {
    EventRepository,
    ShopMember,
    ShopMemberRepository,
    ShopRepository,
    TransactionRepository,
} from '../../domain/index.js';

describe('Create Transaction Use Case', () => {
    const input = {
        shopId: shop.id,
        userId: user.id,
        name: transaction.name,
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type,
    };

    const makeMember = (role: 'OWNER' | 'MEMBER' = 'OWNER'): ShopMember => ({
        id: 'member-id',
        shop_id: shop.id,
        user_id: user.id,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const makeSut = () => {
        const transactionRepository: Pick<TransactionRepository, 'create'> = {
            create: mock(async () => ({
                ...transaction,
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

        const sut = new CreateTransactionUseCase(
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

        await expect(sut.execute(input)).rejects.toThrow(
            new ShopNotFoundError(shop.id),
        );
    });

    it('should throw ForbiddenError if user is not a shop member', async () => {
        const { sut, shopMemberRepository } = makeSut();
        shopMemberRepository.findByShopAndUserId = mock(async () => null);

        await expect(sut.execute(input)).rejects.toThrow(ForbiddenError);
    });

    it('should throw EventNotFoundError if event does not exist', async () => {
        const { sut, eventRepository } = makeSut();
        eventRepository.findById = mock(async () => null);

        await expect(
            sut.execute({ ...input, event_id: 'non-existent-event' }),
        ).rejects.toThrow(new EventNotFoundError('non-existent-event'));
    });

    it('should throw EventNotFoundError if event belongs to another shop', async () => {
        const { sut, eventRepository } = makeSut();
        eventRepository.findById = mock(async () => ({
            id: 'event-id',
            shop_id: 'other-shop-id',
            name: 'Other Shop Event',
            description: null,
            start_date: '2026-06-01',
            end_date: '2026-06-02',
            created_by_user_id: user.id,
        }));

        await expect(
            sut.execute({ ...input, event_id: 'event-id' }),
        ).rejects.toThrow(new EventNotFoundError('event-id'));
    });

    it('should create a transaction when valid params and shop membership', async () => {
        const { sut, transactionRepository } = makeSut();

        const result = await sut.execute(input);

        expect(result.name).toBe(transaction.name);
        expect(result.shop_id).toBe(shop.id);
        expect(result.created_by_user_id).toBe(user.id);
        expect(transactionRepository.create).toHaveBeenCalledWith({
            shop_id: shop.id,
            created_by_user_id: user.id,
            name: input.name,
            date: input.date,
            amount: input.amount,
            type: input.type,
            event_id: null,
        });
    });

    it('should allow MEMBER role to create transaction', async () => {
        const { sut, shopMemberRepository, transactionRepository } = makeSut();
        shopMemberRepository.findByShopAndUserId = mock(async () =>
            makeMember('MEMBER'),
        );

        const result = await sut.execute(input);

        expect(result).toBeDefined();
        expect(transactionRepository.create).toHaveBeenCalled();
    });
});
