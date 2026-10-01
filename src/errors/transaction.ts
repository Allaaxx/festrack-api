export class TransactionNotFoundError extends Error {
    constructor(transactionId: string) {
        super(`Transaction with id ${transactionId} not found.`);
        this.name = 'TransactionNotFoundError';
    }
}
