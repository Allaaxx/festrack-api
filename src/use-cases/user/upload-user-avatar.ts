import {
    InvalidFileTypeError,
    FileSizeExceededError,
    UserNotFoundError,
} from '../../errors/user.js';
import { User, StorageService, UserRepository } from '../../domain/index.js';

export interface UploadFileInput {
    name?: string;
    type: string;
    size?: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface UploadUserAvatarParams {
    userId: string;
    file: UploadFileInput;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class UploadUserAvatarUseCase {
    constructor(
        private readonly userRepository: Pick<
            UserRepository,
            'findById' | 'update'
        >,
        private readonly storageService: StorageService,
    ) {}

    async execute(params: UploadUserAvatarParams): Promise<User> {
        if (!ALLOWED_MIME_TYPES.includes(params.file.type)) {
            throw new InvalidFileTypeError(params.file.type);
        }

        const buffer = await params.file.arrayBuffer();
        if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
            throw new FileSizeExceededError(5);
        }

        const user = await this.userRepository.findById(params.userId);
        if (!user) {
            throw new UserNotFoundError(params.userId);
        }

        const extension =
            params.file.type === 'image/jpeg'
                ? 'jpg'
                : params.file.type === 'image/png'
                  ? 'png'
                  : 'webp';

        const fileName = `avatars/${params.userId}-${Date.now()}.${extension}`;

        const publicUrl = await this.storageService.upload({
            fileName,
            contentType: params.file.type,
            data: Buffer.from(buffer),
        });

        const updatedUser = await this.userRepository.update(params.userId, {
            image: publicUrl,
        });

        return updatedUser;
    }
}
