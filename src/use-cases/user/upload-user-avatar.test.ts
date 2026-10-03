import { describe, it, expect, jest } from 'bun:test';
import {
    UserNotFoundError,
    InvalidFileTypeError,
    FileSizeExceededError,
} from '../../errors/user.js';
import { user } from '../../tests/index.js';
import { UploadUserAvatarUseCase } from './upload-user-avatar.js';
import { User, StorageService, UserRepository } from '../../domain/index.js';

describe('Upload User Avatar Use Case', () => {
    class UserRepositoryStub {
        async findById(): Promise<User | null> {
            return user;
        }

        async update(): Promise<User> {
            return {
                ...user,
                image: 'https://cdn.example.com/avatars/user-123.png',
            };
        }
    }

    class StorageServiceStub implements StorageService {
        async upload(): Promise<string> {
            return 'https://cdn.example.com/avatars/user-123.png';
        }
    }

    const makeSut = () => {
        const userRepository = new UserRepositoryStub() as Pick<
            UserRepository,
            'findById' | 'update'
        >;
        const storageService = new StorageServiceStub();
        const sut = new UploadUserAvatarUseCase(userRepository, storageService);

        return {
            sut,
            userRepository,
            storageService,
        };
    };

    const makeFakeFile = (
        type: string = 'image/png',
        sizeBytes: number = 1024,
    ) => {
        const buffer = new Uint8Array(sizeBytes);
        return {
            name: 'avatar.png',
            type,
            size: sizeBytes,
            arrayBuffer: async () => buffer.buffer,
        };
    };

    it('should upload avatar successfully and update user image', async () => {
        const { sut, userRepository, storageService } = makeSut();
        const uploadSpy = jest.spyOn(storageService, 'upload');
        const updateSpy = jest.spyOn(userRepository, 'update');

        const file = makeFakeFile('image/jpeg', 2048);
        const result = await sut.execute({
            userId: user.id,
            file,
        });

        expect(uploadSpy).toHaveBeenCalledTimes(1);
        expect(updateSpy).toHaveBeenCalledWith(user.id, {
            image: 'https://cdn.example.com/avatars/user-123.png',
        });
        expect(result.image).toBe(
            'https://cdn.example.com/avatars/user-123.png',
        );
    });

    it('should throw InvalidFileTypeError when file type is not allowed', async () => {
        const { sut } = makeSut();
        const file = makeFakeFile('application/pdf', 1024);

        const promise = sut.execute({
            userId: user.id,
            file,
        });

        await expect(promise).rejects.toThrow(InvalidFileTypeError);
    });

    it('should throw FileSizeExceededError when file exceeds 5MB', async () => {
        const { sut } = makeSut();
        const sixMb = 6 * 1024 * 1024;
        const file = makeFakeFile('image/png', sixMb);

        const promise = sut.execute({
            userId: user.id,
            file,
        });

        await expect(promise).rejects.toThrow(FileSizeExceededError);
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'findById').mockResolvedValue(null);

        const file = makeFakeFile('image/webp', 1024);
        const promise = sut.execute({
            userId: 'non-existent-user-id',
            file,
        });

        await expect(promise).rejects.toThrow(UserNotFoundError);
    });

    it('should throw if storageService.upload throws', async () => {
        const { sut, storageService } = makeSut();
        jest.spyOn(storageService, 'upload').mockRejectedValue(
            new Error('S3 error'),
        );

        const file = makeFakeFile('image/png', 1024);
        const promise = sut.execute({
            userId: user.id,
            file,
        });

        await expect(promise).rejects.toThrow('S3 error');
    });

    it('should throw if userRepository.update throws', async () => {
        const { sut, userRepository } = makeSut();
        jest.spyOn(userRepository, 'update').mockRejectedValue(
            new Error('DB error'),
        );

        const file = makeFakeFile('image/png', 1024);
        const promise = sut.execute({
            userId: user.id,
            file,
        });

        await expect(promise).rejects.toThrow('DB error');
    });
});
