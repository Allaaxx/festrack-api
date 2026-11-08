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

export class ShopInvitationNotFoundError extends Error {
    constructor(message: string = 'Invitation not found.') {
        super(message);
        this.name = 'ShopInvitationNotFoundError';
    }
}

export class InvalidInvitationStateError extends Error {
    constructor(message: string = 'Only pending invitations can be revoked.') {
        super(message);
        this.name = 'InvalidInvitationStateError';
    }
}

export class ShopInvitationExpiredError extends Error {
    constructor(message: string = 'Invitation has expired.') {
        super(message);
        this.name = 'ShopInvitationExpiredError';
    }
}

export class ShopInvitationEmailMismatchError extends Error {
    constructor(
        message: string = 'Authenticated user email does not match invitation recipient email.',
    ) {
        super(message);
        this.name = 'ShopInvitationEmailMismatchError';
    }
}

export class ShopSoleOwnerCannotLeaveError extends Error {
    constructor(
        message: string = 'Sole owner cannot leave without transferring ownership or deleting the shop.',
    ) {
        super(message);
        this.name = 'ShopSoleOwnerCannotLeaveError';
    }
}

export class TargetUserNotMemberError extends Error {
    constructor(userId: string, shopId: string) {
        super(`Target user ${userId} is not a member of shop ${shopId}.`);
        this.name = 'TargetUserNotMemberError';
    }
}

export class UserAlreadyShopMemberError extends Error {
    constructor(email: string, shopId: string) {
        super(
            `User with email ${email} is already a member of shop ${shopId}.`,
        );
        this.name = 'UserAlreadyShopMemberError';
    }
}

export class InvalidShopAssetFolderError extends Error {
    constructor(folder: string) {
        super(
            `Invalid asset folder: ${folder}. Allowed folders are: general, products, receipts.`,
        );
        this.name = 'InvalidShopAssetFolderError';
    }
}

export class ShopAssetInvalidFileTypeError extends Error {
    constructor(fileType: string, allowedTypes?: string[]) {
        const allowed = allowedTypes
            ? allowedTypes.join(', ')
            : 'image/jpeg, image/png, image/webp, image/avif';
        super(`Invalid file type: ${fileType}. Allowed types are ${allowed}.`);
        this.name = 'ShopAssetInvalidFileTypeError';
    }
}

export class ShopAssetFileSizeExceededError extends Error {
    constructor(maxSizeMb: number = 10) {
        super(`File size exceeds the maximum allowed size of ${maxSizeMb}MB.`);
        this.name = 'ShopAssetFileSizeExceededError';
    }
}
