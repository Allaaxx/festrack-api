export interface TransactionManager {
    run<T>(fn: () => Promise<T>): Promise<T>;
}
