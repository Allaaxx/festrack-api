export interface SendInvitationParams {
    to: string;
    shopName: string;
    inviterName?: string | null;
    token: string;
    role: string;
    expiresAt: Date;
}

export interface EmailService {
    sendInvitation(params: SendInvitationParams): Promise<void>;
}
