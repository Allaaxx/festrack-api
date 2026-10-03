export interface PasswordVerifier {
    verify(password: string, hash: string): Promise<boolean>;
}
