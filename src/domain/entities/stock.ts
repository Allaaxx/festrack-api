export interface Stock {
    id: string;
    product_id: string;
    quantity: number;
    reserved: number;
    updated_at: Date | string;
}

export interface CreateStockParams {
    product_id: string;
    quantity?: number;
    reserved?: number;
}

export interface UpdateStockParams {
    quantity?: number;
    reserved?: number;
}
