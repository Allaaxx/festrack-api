import { HttpResponse } from './helpers/index.js';

export interface HttpRequest<B = any, P = any, Q = any> {
    body?: B;
    params?: P;
    query?: Q;
    headers?: any;
    userId?: string;
}

export interface Controller {
    execute(httpRequest: HttpRequest): Promise<HttpResponse>;
}
