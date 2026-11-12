export type StockMovementType =
    | 'INBOUND'
    | 'SALE'
    | 'RENTAL_ALLOCATION'
    | 'RENTAL_RETURN'
    | 'LOSS'
    | 'ADJUSTMENT';

export interface StockMovementUser {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

export interface StockMovement {
    id: string;
    stockId: string;
    stock_id?: string;
    type: StockMovementType;
    quantity: number;
    notes?: string | null;
    referenceId?: string | null;
    reference_id?: string | null;
    createdByUserId?: string | null;
    created_by_user_id?: string | null;
    createdByUser?: StockMovementUser | null;
    createdBy?: StockMovementUser | null;
    user?: StockMovementUser | null;
    createdAt: Date | string;
    created_at?: Date | string;
}

export interface CreateStockMovementParams {
    stockId: string;
    type: StockMovementType;
    quantity: number;
    notes?: string | null;
    referenceId?: string | null;
    createdByUserId?: string | null;
}
