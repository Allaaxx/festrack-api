export interface TestResponse<T = any> {
    status: number;
    statusCode: number;
    body: T;
    headers: Headers;
}

export interface AppHandler {
    handle: (request: Request) => Promise<Response>;
}

export class TestRequestBuilder {
    private headers: Record<string, string> = {};
    private payload?: unknown;

    constructor(
        private app: AppHandler,
        private method: string,
        private path: string,
    ) {}

    query(params: Record<string, string | number | undefined>): this {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) {
                searchParams.set(key, String(value));
            }
        }
        const queryString = searchParams.toString();
        if (queryString) {
            this.path = this.path.includes('?')
                ? `${this.path}&${queryString}`
                : `${this.path}?${queryString}`;
        }
        return this;
    }

    set(header: string, value: string): this {
        this.headers[header.toLowerCase()] = value;
        return this;
    }

    send(data: unknown): this {
        this.payload = data;
        return this;
    }

    async then<TResult1 = TestResponse, TResult2 = never>(
        onfulfilled?:
            ((value: TestResponse) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?:
            ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        const url = `http://localhost${this.path}`;
        const reqHeaders = new Headers(this.headers);
        let body: BodyInit | undefined = undefined;

        if (this.payload !== undefined) {
            if (!reqHeaders.has('content-type')) {
                reqHeaders.set('content-type', 'application/json');
            }
            body =
                typeof this.payload === 'string'
                    ? this.payload
                    : JSON.stringify(this.payload);
        }

        const res = await this.app.handle(
            new Request(url, {
                method: this.method,
                headers: reqHeaders,
                body,
            }),
        );

        const contentType = res.headers.get('content-type') || '';
        let parsedBody: unknown;
        if (contentType.includes('application/json')) {
            parsedBody = await res.json();
        } else {
            const text = await res.text();
            try {
                parsedBody = JSON.parse(text);
            } catch {
                parsedBody = text;
            }
        }

        const result: TestResponse = {
            status: res.status,
            statusCode: res.status,
            body: parsedBody,
            headers: res.headers,
        };

        return Promise.resolve(result).then(onfulfilled, onrejected);
    }
}

export const testClient = (app: AppHandler) => ({
    get: (path: string) => new TestRequestBuilder(app, 'GET', path),
    post: (path: string) => new TestRequestBuilder(app, 'POST', path),
    patch: (path: string) => new TestRequestBuilder(app, 'PATCH', path),
    put: (path: string) => new TestRequestBuilder(app, 'PUT', path),
    delete: (path: string) => new TestRequestBuilder(app, 'DELETE', path),
});
