export interface ImageProcessorOptions {
    maxWidth?: number;
    quality?: number;
}

export interface ImageProcessor {
    toWebp(
        buffer: Buffer | Uint8Array,
        options?: ImageProcessorOptions,
    ): Promise<Buffer>;
}
