import crypto from 'node:crypto';
import {
    InvalidFileTypeError,
    FileSizeExceededError,
} from '../../errors/user.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import {
    ShopRepository,
    ShopMemberRepository,
    StorageService,
    ImageProcessor,
} from '../../domain/index.js';

export interface UploadFileInput {
    name?: string;
    type: string;
    size?: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
}

export type ShopAssetFolder = 'general' | 'products' | 'receipts';

export interface UploadShopAssetParams {
    shopId: string;
    userId: string;
    file: UploadFileInput;
    folder?: ShopAssetFolder;
}

export interface UploadShopAssetResult {
    url: string;
    key: string;
    content_type: 'image/webp';
    size: number;
}

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class UploadShopAssetUseCase {
    constructor(
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
        private readonly storageService: StorageService,
        private readonly imageProcessor: ImageProcessor,
    ) {}

    async execute(
        params: UploadShopAssetParams,
    ): Promise<UploadShopAssetResult> {
        const shop = await this.shopRepository.findById(params.shopId);
        if (!shop) {
            throw new ShopNotFoundError(params.shopId);
        }

        const member = await this.shopMemberRepository.findByShopAndUserId(
            params.shopId,
            params.userId,
        );
        if (!member) {
            throw new ForbiddenError('You are not a member of this shop.');
        }

        if (!ALLOWED_MIME_TYPES.includes(params.file.type)) {
            throw new InvalidFileTypeError(
                params.file.type,
                ALLOWED_MIME_TYPES,
            );
        }

        const buffer = await params.file.arrayBuffer();
        if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
            throw new FileSizeExceededError(10);
        }

        const webpBuffer = await this.imageProcessor.toWebp(
            Buffer.from(buffer),
            { maxWidth: 2048 },
        );

        const assetUuid = crypto.randomUUID();
        const key = params.folder
            ? `shops/${params.shopId}/${params.folder}/${assetUuid}.webp`
            : `shops/${params.shopId}/${assetUuid}.webp`;

        const url = await this.storageService.upload({
            fileName: key,
            contentType: 'image/webp',
            data: webpBuffer,
        });

        return {
            url,
            key,
            content_type: 'image/webp',
            size: webpBuffer.byteLength,
        };
    }
}
