import sharp from 'sharp';
import { ImageProcessor, ImageProcessorOptions } from '../domain/index.js';

export const DEFAULT_MAX_IMAGE_WIDTH = 2048;

export class SharpImageProcessor implements ImageProcessor {
    async toWebp(
        buffer: Buffer | Uint8Array,
        options?: ImageProcessorOptions,
    ): Promise<Buffer> {
        let pipeline = sharp(buffer).rotate();

        const maxWidth = options?.maxWidth ?? DEFAULT_MAX_IMAGE_WIDTH;
        pipeline = pipeline.resize({
            width: maxWidth,
            fit: 'inside',
            withoutEnlargement: true,
        });

        return pipeline
            .webp({ quality: options?.quality ?? 80, effort: 4 })
            .toBuffer();
    }
}
