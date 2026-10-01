import { HttpResponse } from './helpers/index.js';

export interface HttpRequest<B = any, P = any, Q = any, H = any> {
    body?: B;
    params?: P;
    query?: Q;
    headers?: H;
    userId?: string;
}

export interface Controller<B = any, P = any, Q = any> {
    execute(httpRequest: HttpRequest<B, P, Q>): Promise<HttpResponse>;
}
