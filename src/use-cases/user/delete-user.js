export class DeleteUserUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(userId) {
        const deletedUser = await this.userRepository.delete(userId);

        return deletedUser;
    }
}
