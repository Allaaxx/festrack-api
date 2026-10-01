import { HttpResponse, notFound } from './http.js';

export const eventNotFoundResponse = (): HttpResponse<{ message: string }> => {
    return notFound({
        message: 'Event not found.',
    });
};
