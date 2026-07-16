import { prisma } from '../../../../prisma/prisma.js';

export class PostgresCreateUserRepository {
    async execute(params) {
        const user = await prisma.user.create({
            data: {
                id: params.id,
                email: params.email,
                first_name: params.first_name,
                last_name: params.last_name,
                password: params.password,
            },
        });
        return user;
    }
}
