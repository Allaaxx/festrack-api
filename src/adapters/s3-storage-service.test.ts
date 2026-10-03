import { describe, it, expect, jest, beforeEach, afterEach } from 'bun:test';
import { S3Client } from '@aws-sdk/client-s3';
import { S3StorageService } from './s3-storage-service.js';

describe('S3 Storage Service', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.S3_BUCKET = 'test-bucket';
        process.env.S3_ENDPOINT = 'https://s3.custom.endpoint.com';
        process.env.S3_REGION = 'us-east-1';
        process.env.S3_ACCESS_KEY_ID = 'test-key';
        process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
        process.env.S3_PUBLIC_URL = 'https://cdn.example.com';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should upload file and return publicUrl when S3_PUBLIC_URL is provided', async () => {
        const service = new S3StorageService();
        const sendSpy = (
            jest.spyOn(S3Client.prototype, 'send') as any
        ).mockResolvedValue({} as any);

        const url = await service.upload({
            fileName: 'avatars/avatar.png',
            contentType: 'image/png',
            data: Buffer.from('test'),
        });

        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(url).toBe('https://cdn.example.com/avatars/avatar.png');
        sendSpy.mockRestore();
    });

    it('should return endpoint URL when S3_PUBLIC_URL is missing but S3_ENDPOINT is set', async () => {
        delete process.env.S3_PUBLIC_URL;
        const service = new S3StorageService();
        const sendSpy = (
            jest.spyOn(S3Client.prototype, 'send') as any
        ).mockResolvedValue({} as any);

        const url = await service.upload({
            fileName: 'avatars/avatar.png',
            contentType: 'image/png',
            data: Buffer.from('test'),
        });

        expect(url).toBe(
            'https://s3.custom.endpoint.com/test-bucket/avatars/avatar.png',
        );
        sendSpy.mockRestore();
    });

    it('should return aws s3 standard url when neither publicUrl nor endpoint is set', async () => {
        delete process.env.S3_PUBLIC_URL;
        delete process.env.S3_ENDPOINT;
        const service = new S3StorageService({
            bucket: 'my-bucket',
            region: 'sa-east-1',
        });
        const sendSpy = (
            jest.spyOn(S3Client.prototype, 'send') as any
        ).mockResolvedValue({} as any);

        const url = await service.upload({
            fileName: 'avatars/avatar.png',
            contentType: 'image/png',
            data: Buffer.from('test'),
        });

        expect(url).toBe(
            'https://my-bucket.s3.sa-east-1.amazonaws.com/avatars/avatar.png',
        );
        sendSpy.mockRestore();
    });
});
