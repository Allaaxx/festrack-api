import { describe, it, expect, mock } from 'bun:test';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { TransactionNotFoundError } from '../../errors/transaction.js';
import { transaction, user, shop } from '../../tests/index.js';
import { GetTransactionByIdUseCase } from './get-transaction-by-id.js';
import {
    ShopMember,
    ShopMemberRepository,
    ShopRepository,
    TransactionRepository,
} from '../../domain/index.js';

describe('Get Transaction By Id Use Case', () => {
    const makeMember = (role: 'OWNER' | 'MEMBER' = 'OWNER'): ShopMember => ({
        id: 'member-id',
        shop_id: shop.id,
        user_id: user.id,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const makeSut = () => {
        const transactionRepository: Pick<TransactionRepository, 'findById'> = {
            findById: mock(async () => ({
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

        const sut = new GetTransactionByIdUseCase(
            transactionRepository,
            shopRepository,
            shopMemberRepository,
        );

        return {
            sut,
            transactionRepository,
            shopRepository,
            shopMemberRepository,
        };
    };

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const { sut, shopRepository } = makeSut();
        shopRepository.findById = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id),
        ).rejects.toThrow(new ShopNotFoundError(shop.id));
    });

    it('should throw ForbiddenError if user is not a shop member', async () => {
        const { sut, shopMemberRepository } = makeSut();
        shopMemberRepository.findByShopAndUserId = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id),
        ).rejects.toThrow(ForbiddenError);
    });

    it('should throw TransactionNotFoundError if transaction does not exist', async () => {
        const { sut, transactionRepository } = makeSut();
        transactionRepository.findById = mock(async () => null);

        await expect(
            sut.execute(shop.id, transaction.id, user.id),
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
            sut.execute(shop.id, transaction.id, user.id),
        ).rejects.toThrow(new TransactionNotFoundError(transaction.id));
    });

    it('should return transaction when found in shop', async () => {
        const { sut } = makeSut();

        const result = await sut.execute(shop.id, transaction.id, user.id);

        expect(result.id).toBe(transaction.id);
        expect(result.shop_id).toBe(shop.id);
    });
});
