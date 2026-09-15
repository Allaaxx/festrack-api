import { notFound } from './http.js';

export const eventNotFoundResponse = () => {
    return notFound({
        message: 'Event not found.',
    });
};
