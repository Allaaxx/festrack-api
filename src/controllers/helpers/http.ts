export interface HttpResponse<T = unknown> {
    statusCode: number;
    body: T;
}

export const badRequest = <T = unknown>(body: T): HttpResponse<T> => ({
    statusCode: 400,
    body,
});

export const unauthorized = (): HttpResponse<{ message: string }> => ({
    statusCode: 401,
    body: {
        message: 'Unauthorized',
    },
});

export const forbidden = (): HttpResponse<{ message: string }> => ({
    statusCode: 403,
    body: {
        message: 'Forbidden',
    },
});

export const created = <T = unknown>(body: T): HttpResponse<T> => ({
    statusCode: 201,
    body,
});

export const serverError = (): HttpResponse<{ message: string }> => ({
    statusCode: 500,
    body: {
        message: 'Internal server error',
    },
});

export const ok = <T = unknown>(body: T): HttpResponse<T> => ({
    statusCode: 200,
    body,
});

export const notFound = <T = unknown>(body: T): HttpResponse<T> => ({
    statusCode: 404,
    body,
});

export const noContent = (): HttpResponse<null> => ({
    statusCode: 204,
    body: null,
});
