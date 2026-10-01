import { HttpResponse, notFound } from './http.js';

export const userNotFoundResponse = (): HttpResponse<{ message: string }> =>
    notFound({ message: 'User not found.' });
