import { describe, it, expect } from 'bun:test';
import sharp from 'sharp';
import { SharpImageProcessor } from './sharp-image-processor.js';

describe('SharpImageProcessor', () => {
    const processor = new SharpImageProcessor();

    it('should convert a PNG buffer to WebP format', async () => {
        const inputPng = await sharp({
            create: {
                width: 10,
                height: 10,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
        })
            .png()
            .toBuffer();

        const resultWebp = await processor.toWebp(inputPng);

        expect(resultWebp).toBeInstanceOf(Buffer);
        const metadata = await sharp(resultWebp).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(10);
        expect(metadata.height).toBe(10);
    });

    it('should convert a JPEG buffer to WebP format', async () => {
        const inputJpeg = await sharp({
            create: {
                width: 20,
                height: 20,
                channels: 3,
                background: { r: 0, g: 255, b: 0 },
            },
        })
            .jpeg()
            .toBuffer();

        const resultWebp = await processor.toWebp(inputJpeg);

        const metadata = await sharp(resultWebp).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(20);
        expect(metadata.height).toBe(20);
    });

    it('should resize large images when maxWidth option is supplied without enlarging small images', async () => {
        const largeImage = await sharp({
            create: {
                width: 3000,
                height: 1500,
                channels: 3,
                background: { r: 0, g: 0, b: 255 },
            },
        })
            .jpeg()
            .toBuffer();

        const resized = await processor.toWebp(largeImage, { maxWidth: 2048 });
        const resizedMeta = await sharp(resized).metadata();
        expect(resizedMeta.format).toBe('webp');
        expect(resizedMeta.width).toBe(2048);
        expect(resizedMeta.height).toBe(1024);

        const smallImage = await sharp({
            create: {
                width: 500,
                height: 500,
                channels: 3,
                background: { r: 0, g: 0, b: 255 },
            },
        })
            .jpeg()
            .toBuffer();

        const notEnlarged = await processor.toWebp(smallImage, {
            maxWidth: 2048,
        });
        const notEnlargedMeta = await sharp(notEnlarged).metadata();
        expect(notEnlargedMeta.width).toBe(500);
        expect(notEnlargedMeta.height).toBe(500);
    });

    it('should downscale images wider than 2048px (2500x1000) down to 2048px preserving aspect ratio without enlargement', async () => {
        const wideImage = await sharp({
            create: {
                width: 2500,
                height: 1000,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
            },
        })
            .png()
            .toBuffer();

        const resultWebp = await processor.toWebp(wideImage, {
            maxWidth: 2048,
        });
        const meta = await sharp(resultWebp).metadata();

        expect(meta.format).toBe('webp');
        expect(meta.width).toBe(2048);
        expect(meta.height).toBe(819);
    });

    it('should not enlarge images smaller than 2048px', async () => {
        const mediumImage = await sharp({
            create: {
                width: 1200,
                height: 600,
                channels: 3,
                background: { r: 50, g: 100, b: 150 },
            },
        })
            .jpeg()
            .toBuffer();

        const resultWebp = await processor.toWebp(mediumImage, {
            maxWidth: 2048,
        });
        const meta = await sharp(resultWebp).metadata();

        expect(meta.format).toBe('webp');
        expect(meta.width).toBe(1200);
        expect(meta.height).toBe(600);
    });

    it('should default to 2048px maxWidth guardrail when options are omitted', async () => {
        const wideImage = await sharp({
            create: {
                width: 2500,
                height: 1000,
                channels: 3,
                background: { r: 200, g: 100, b: 50 },
            },
        })
            .jpeg()
            .toBuffer();

        const resultWebp = await processor.toWebp(wideImage);
        const meta = await sharp(resultWebp).metadata();

        expect(meta.format).toBe('webp');
        expect(meta.width).toBe(2048);
        expect(meta.height).toBe(819);
    });
});
