import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageService, UploadFileParams } from '../domain/index.js';
import { env } from '../config/env.js';

export interface S3StorageConfig {
    bucket?: string;
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicUrl?: string;
}

export class S3StorageService implements StorageService {
    private client: S3Client;
    private bucket: string;
    private publicUrl?: string;
    private endpoint?: string;
    private region: string;

    constructor(config?: S3StorageConfig) {
        this.bucket = config?.bucket ?? env.S3_BUCKET;
        this.region = config?.region ?? env.S3_REGION;
        this.endpoint = config?.endpoint ?? env.S3_ENDPOINT;

        // If caller explicitly configured endpoint without publicUrl, omit publicUrl
        // Otherwise, prioritize config.publicUrl with fallback to env.S3_PUBLIC_URL
        if (config?.publicUrl !== undefined) {
            this.publicUrl = config.publicUrl || undefined;
        } else if (config?.endpoint) {
            this.publicUrl = undefined;
        } else {
            this.publicUrl = env.S3_PUBLIC_URL;
        }

        const accessKeyId = config?.accessKeyId ?? env.S3_ACCESS_KEY_ID ?? '';
        const secretAccessKey =
            config?.secretAccessKey ?? env.S3_SECRET_ACCESS_KEY ?? '';

        this.client = new S3Client({
            region: this.region,
            ...(this.endpoint
                ? {
                      endpoint: this.endpoint,
                      forcePathStyle: true,
                  }
                : {}),
            ...(accessKeyId && secretAccessKey
                ? {
                      credentials: {
                          accessKeyId,
                          secretAccessKey,
                      },
                  }
                : {}),
        });
    }

    async upload({
        fileName,
        contentType,
        data,
    }: UploadFileParams): Promise<string> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: fileName,
                Body: data,
                ContentType: contentType,
            }),
        );

        if (this.publicUrl) {
            const base = this.publicUrl.replace(/\/+$/, '');
            return `${base}/${fileName}`;
        }

        if (this.endpoint) {
            const base = this.endpoint.replace(/\/+$/, '');
            return `${base}/${this.bucket}/${fileName}`;
        }

        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;
    }
}
