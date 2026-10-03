export interface UploadFileParams {
    fileName: string;
    contentType: string;
    data: Buffer | Uint8Array;
}

export interface StorageService {
    upload(params: UploadFileParams): Promise<string>;
}
