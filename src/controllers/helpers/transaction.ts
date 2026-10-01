import { HttpResponse, notFound } from './http.js';

export const transactionNotFoundResponse = (): HttpResponse<{ message: string }> => {
    return notFound({
        message: 'Transaction not found.',
    });
};
