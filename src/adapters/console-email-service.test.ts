import { describe, it, expect, spyOn } from 'bun:test';
import { ConsoleEmailService } from './console-email-service.js';

describe('ConsoleEmailService', () => {
    it('should log invitation email details to console', async () => {
        const sut = new ConsoleEmailService();
        const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

        await sut.sendInvitation({
            to: 'test@example.com',
            shopName: 'Test Shop',
            token: 'test-token',
            role: 'MEMBER',
            expiresAt: new Date(),
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
