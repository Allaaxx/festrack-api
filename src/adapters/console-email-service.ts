import { EmailService, SendInvitationParams } from '../domain/index.js';

export class ConsoleEmailService implements EmailService {
    async sendInvitation(params: SendInvitationParams): Promise<void> {
        console.log(
            `[EmailService] Invitation email sent to ${params.to} for shop "${params.shopName}" with token: ${params.token} (expires at: ${params.expiresAt.toISOString()})`,
        );
    }
}
