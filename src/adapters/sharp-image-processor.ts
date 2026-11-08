import sharp from 'sharp';
import { ImageProcessor, ImageProcessorOptions } from '../domain/index.js';

export class SharpImageProcessor implements ImageProcessor {
    async toWebp(
        buffer: Buffer | Uint8Array,
        options?: ImageProcessorOptions,
    ): Promise<Buffer> {
        let pipeline = sharp(buffer).rotate();

        if (options?.maxWidth) {
            pipeline = pipeline.resize({
                width: options.maxWidth,
                withoutEnlargement: true,
            });
        }

        return pipeline.webp({ quality: options?.quality ?? 80 }).toBuffer();
    }
}
