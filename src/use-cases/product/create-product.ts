import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { SlugAlreadyExistsError } from '../../errors/product.js';
import {
    ProductWithStock,
    ProductRepository,
    StockRepository,
    ShopRepository,
    ShopMemberRepository,
    ProductType,
} from '../../domain/index.js';

export interface CreateProductInput {
    shopId: string;
    userId: string;
    name: string;
    slug: string;
    type: ProductType;
    price: number | string;
    description?: string | null;
    images?: string[];
    quantity?: number;
    initial_quantity?: number;
}

export class CreateProductUseCase {
    constructor(
        private readonly productRepository: Pick<
            ProductRepository,
            'create' | 'findBySlug'
        >,
        private readonly stockRepository: Pick<StockRepository, 'create'>,
        private readonly shopRepository: Pick<ShopRepository, 'findById'>,
        private readonly shopMemberRepository: Pick<
            ShopMemberRepository,
            'findByShopAndUserId'
        >,
    ) {}

    async execute(input: CreateProductInput): Promise<ProductWithStock> {
        const shop = await this.shopRepository.findById(input.shopId);
        if (!shop) {
            throw new ShopNotFoundError(input.shopId);
        }

        const member = await this.shopMemberRepository.findByShopAndUserId(
            input.shopId,
            input.userId,
        );
        if (!member) {
            throw new ForbiddenError();
        }

        const existing = await this.productRepository.findBySlug(input.slug);
        if (existing) {
            throw new SlugAlreadyExistsError(input.slug);
        }

        const product = await this.productRepository.create({
            shop_id: input.shopId,
            name: input.name,
            slug: input.slug,
            type: input.type,
            price: input.price,
            description: input.description ?? null,
            images: input.images ?? [],
            is_bundle: false,
        });

        if (input.type === 'service') {
            return {
                ...product,
                stock: null,
            };
        }

        const initialQuantity = input.initial_quantity ?? input.quantity ?? 0;
        const createdStock = await this.stockRepository.create({
            product_id: product.id,
            quantity: initialQuantity,
            reserved: 0,
        });

        return {
            ...product,
            stock: createdStock,
        };
    }
}
