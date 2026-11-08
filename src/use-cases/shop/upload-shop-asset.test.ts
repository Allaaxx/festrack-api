import { describe, it, expect, mock } from 'bun:test';
import { UploadShopAssetUseCase } from './upload-shop-asset.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    InvalidFileTypeError,
    FileSizeExceededError,
} from '../../errors/user.js';
import {
    Shop,
    ShopMember,
    StorageService,
    ImageProcessor,
} from '../../domain/index.js';

describe('UploadShopAssetUseCase', () => {
    const mockShop: Shop = {
        id: 'shop-uuid-1',
        name: 'Test Shop',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const mockMember: ShopMember = {
        id: 'member-uuid-1',
        shop_id: 'shop-uuid-1',
        user_id: 'user-uuid-1',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const validImageBytes = new Uint8Array([1, 2, 3, 4]);
    const mockWebpBuffer = Buffer.from([5, 6, 7, 8, 9]);

    const createUseCase = (overrides?: {
        shop?: Shop | null;
        member?: ShopMember | null;
        uploadedUrl?: string;
        webpBuffer?: Buffer;
    }) => {
        const shopRepository = {
            findById: mock(async () =>
                overrides?.shop !== undefined ? overrides.shop : mockShop,
            ),
        };

        const shopMemberRepository = {
            findByShopAndUserId: mock(async () =>
                overrides?.member !== undefined ? overrides.member : mockMember,
            ),
        };

        const storageService: StorageService = {
            upload: mock(
                async () =>
                    overrides?.uploadedUrl ??
                    'https://storage.example.com/shops/shop-uuid-1/test.webp',
            ),
        };

        const imageProcessor: ImageProcessor = {
            toWebp: mock(async () => overrides?.webpBuffer ?? mockWebpBuffer),
        };

        const useCase = new UploadShopAssetUseCase(
            shopRepository,
            shopMemberRepository,
            storageService,
            imageProcessor,
        );

        return {
            useCase,
            shopRepository,
            shopMemberRepository,
            storageService,
            imageProcessor,
        };
    };

    it('should successfully upload image converted to WebP and return metadata', async () => {
        const { useCase, storageService, imageProcessor } = createUseCase({
            uploadedUrl:
                'https://cdn.example.com/shops/shop-uuid-1/random-id.webp',
        });

        const file = {
            name: 'sample.png',
            type: 'image/png',
            size: validImageBytes.byteLength,
            arrayBuffer: async () => validImageBytes.buffer,
        };

        const result = await useCase.execute({
            shopId: 'shop-uuid-1',
            userId: 'user-uuid-1',
            file,
        });

        expect(imageProcessor.toWebp).toHaveBeenCalledWith(expect.any(Buffer), {
            maxWidth: 2048,
        });
        expect(storageService.upload).toHaveBeenCalledWith({
            fileName: expect.stringMatching(
                /^shops\/shop-uuid-1\/[a-f0-9-]+\.webp$/,
            ),
            contentType: 'image/webp',
            data: mockWebpBuffer,
        });
        expect(result).toEqual({
            url: 'https://cdn.example.com/shops/shop-uuid-1/random-id.webp',
            key: expect.stringMatching(
                /^shops\/shop-uuid-1\/[a-f0-9-]+\.webp$/,
            ),
            content_type: 'image/webp',
            size: mockWebpBuffer.byteLength,
        });
    });

    it('should support folder partition when folder is specified', async () => {
        const { useCase, storageService } = createUseCase();

        const file = {
            type: 'image/jpeg',
            arrayBuffer: async () => validImageBytes.buffer,
        };

        const result = await useCase.execute({
            shopId: 'shop-uuid-1',
            userId: 'user-uuid-1',
            file,
            folder: 'products',
        });

        expect(storageService.upload).toHaveBeenCalledWith({
            fileName: expect.stringMatching(
                /^shops\/shop-uuid-1\/products\/[a-f0-9-]+\.webp$/,
            ),
            contentType: 'image/webp',
            data: mockWebpBuffer,
        });
        expect(result.key).toMatch(
            /^shops\/shop-uuid-1\/products\/[a-f0-9-]+\.webp$/,
        );
    });

    it('should throw ShopNotFoundError when shop does not exist', async () => {
        const { useCase } = createUseCase({ shop: null });

        const file = {
            type: 'image/png',
            arrayBuffer: async () => validImageBytes.buffer,
        };

        const promise = useCase.execute({
            shopId: 'non-existent',
            userId: 'user-uuid-1',
            file,
        });

        await expect(promise).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError when user is not a shop member', async () => {
        const { useCase } = createUseCase({ member: null });

        const file = {
            type: 'image/png',
            arrayBuffer: async () => validImageBytes.buffer,
        };

        const promise = useCase.execute({
            shopId: 'shop-uuid-1',
            userId: 'stranger-user',
            file,
        });

        await expect(promise).rejects.toThrow(ForbiddenError);
    });

    it('should throw InvalidFileTypeError when file MIME type is unsupported', async () => {
        const { useCase } = createUseCase();

        const file = {
            type: 'application/pdf',
            arrayBuffer: async () => validImageBytes.buffer,
        };

        const promise = useCase.execute({
            shopId: 'shop-uuid-1',
            userId: 'user-uuid-1',
            file,
        });

        await expect(promise).rejects.toThrow(InvalidFileTypeError);
    });

    it('should throw FileSizeExceededError when file exceeds 10MB', async () => {
        const { useCase } = createUseCase();

        // 10MB + 1 byte
        const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
        const file = {
            type: 'image/png',
            arrayBuffer: async () => oversized.buffer,
        };

        const promise = useCase.execute({
            shopId: 'shop-uuid-1',
            userId: 'user-uuid-1',
            file,
        });

        await expect(promise).rejects.toThrow(FileSizeExceededError);
    });
});
