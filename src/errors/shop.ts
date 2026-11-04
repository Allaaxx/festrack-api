export class ShopNotFoundError extends Error {
    constructor(shopId: string) {
        super(`Shop with id ${shopId} not found.`);
        this.name = 'ShopNotFoundError';
    }
}

export class ShopMemberNotFoundError extends Error {
    constructor(shopId: string, userId: string) {
        super(`User with id ${userId} is not a member of shop ${shopId}.`);
        this.name = 'ShopMemberNotFoundError';
    }
}
