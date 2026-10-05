import { describe, it, expect, jest } from 'bun:test';
import { S3Client } from '@aws-sdk/client-s3';
import { S3StorageService } from './s3-storage-service.js';

describe('S3 Storage Service', () => {
    it('should upload file and return publicUrl when publicUrl is provided', async () => {
        const service = new S3StorageService({
            bucket: 'test-bucket',
            publicUrl: 'https://cdn.example.com',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
        });
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

    it('should return endpoint URL when publicUrl is missing but endpoint is set', async () => {
        const service = new S3StorageService({
            bucket: 'test-bucket',
            endpoint: 'https://s3.custom.endpoint.com',
            region: 'us-east-1',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
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
            'https://s3.custom.endpoint.com/test-bucket/avatars/avatar.png',
        );
        sendSpy.mockRestore();
    });

    it('should return aws s3 standard url when neither publicUrl nor endpoint is set', async () => {
        const service = new S3StorageService({
            bucket: 'my-bucket',
            region: 'sa-east-1',
            publicUrl: '',
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

    it('should format URL for local MinIO endpoint when publicUrl is not set', async () => {
        const service = new S3StorageService({
            bucket: 'festrack',
            endpoint: 'http://localhost:9000',
            region: 'us-east-1',
            accessKeyId: 'minioadmin',
            secretAccessKey: 'minioadmin',
        });
        const sendSpy = (
            jest.spyOn(S3Client.prototype, 'send') as any
        ).mockResolvedValue({} as any);

        const url = await service.upload({
            fileName: 'avatars/avatar.png',
            contentType: 'image/png',
            data: Buffer.from('test'),
        });

        expect(url).toBe('http://localhost:9000/festrack/avatars/avatar.png');
        sendSpy.mockRestore();
    });

    it('should instantiate cleanly with default env configuration', () => {
        const service = new S3StorageService();
        expect(service).toBeDefined();
    });
});
