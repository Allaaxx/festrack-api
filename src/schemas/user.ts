import { z } from 'zod';

export const createUserSchema = z.object({
    first_name: z
        .string({
            message: 'First name is required.',
        })
        .trim()
        .min(1, {
            message: 'First name is required.',
        }),
    last_name: z
        .string({
            message: 'Last name is required.',
        })
        .trim()
        .min(1, {
            message: 'Last name is required.',
        }),
    email: z
        .string({
            message: 'E-mail is required.',
        })
        .email({
            message: 'Please provide a valid e-mail.',
        })
        .trim()
        .min(1, {
            message: 'E-mail is required.',
        }),
    password: z
        .string({
            message: 'Password is required',
        })
        .trim()
        .min(6, {
            message: 'Password must have at least 6 characters',
        }),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const updatedUserSchema = createUserSchema.partial().strict();

export type UpdateUserSchema = z.infer<typeof updatedUserSchema>;

export const loginSchema = z.object({
    email: z
        .string({
            message: 'E-mail is required.',
        })
        .email({
            message: 'Please provide a valid e-mail.',
        })
        .trim()
        .min(1, {
            message: 'E-mail is required.',
        }),
    password: z
        .string({
            message: 'Password is required',
        })
        .trim()
        .min(6, {
            message: 'Password must have at least 6 characters',
        }),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
    refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;

export const getUserBalanceSchema = z.object({
    user_id: z.string().uuid(),
    from: z.iso.date(),
    to: z.iso.date(),
});

export type GetUserBalanceSchema = z.infer<typeof getUserBalanceSchema>;
