import { Controller, HttpRequest } from './protocols.js';
import { HttpResponse, ok } from './helpers/index.js';

describe('Controller Protocols Contract', () => {
    interface TestBody {
        name: string;
        amount: number;
    }

    interface TestParams {
        id: string;
    }

    interface TestQuery {
        filter: string;
    }

    it('should support strongly typed HttpRequest with body, params, query, headers, and userId', () => {
        const request: HttpRequest<TestBody, TestParams, TestQuery> = {
            body: { name: 'Test Event', amount: 100 },
            params: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            query: { filter: 'active' },
            headers: { authorization: 'Bearer token' },
            userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        };

        expect(request.body?.name).toBe('Test Event');
        expect(request.body?.amount).toBe(100);
        expect(request.params?.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
        expect(request.query?.filter).toBe('active');
        expect(request.headers?.authorization).toBe('Bearer token');
        expect(request.userId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should allow implementing Controller with generic types', async () => {
        class MockController implements Controller<
            TestBody,
            TestParams,
            TestQuery
        > {
            async execute(
                httpRequest: HttpRequest<TestBody, TestParams, TestQuery>,
            ): Promise<HttpResponse> {
                return ok({
                    receivedBody: httpRequest.body,
                    receivedParams: httpRequest.params,
                    receivedQuery: httpRequest.query,
                    userId: httpRequest.userId,
                });
            }
        }

        const sut = new MockController();
        const request: HttpRequest<TestBody, TestParams, TestQuery> = {
            body: { name: 'Concert', amount: 50 },
            params: { id: 'uuid-123' },
            query: { filter: 'upcoming' },
            userId: 'user-456',
        };

        const response = await sut.execute(request);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            receivedBody: { name: 'Concert', amount: 50 },
            receivedParams: { id: 'uuid-123' },
            receivedQuery: { filter: 'upcoming' },
            userId: 'user-456',
        });
    });

    it('should maintain backward compatibility when no generic type arguments are provided', async () => {
        class LegacyController implements Controller {
            async execute(httpRequest: HttpRequest): Promise<HttpResponse> {
                return ok(httpRequest);
            }
        }

        const sut = new LegacyController();
        const request: HttpRequest = {
            body: { anyProp: 1 },
            params: { anyParam: 'param' },
        };

        const response = await sut.execute(request);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(request);
    });
});
