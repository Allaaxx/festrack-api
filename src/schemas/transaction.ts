import validator from 'validator';
import { z } from 'zod';

export const createTransactionSchema = z.object({
    user_id: z
        .string({
            message: 'User ID is required.',
        })
        .uuid({
            message: 'User ID must be a valid UUID.',
        }),
    name: z
        .string({
            message: 'Name is required.',
        })
        .trim()
        .min(1, {
            message: 'Name is required.',
        }),
    date: z.iso.datetime({
        error: (issue) =>
            issue.input === undefined
                ? 'Date is required.'
                : 'Date must be a valid date.',
    }),
    type: z.enum(['EXPENSE', 'EARNING', 'INVESTMENT'], {
        error: () => 'Type must be EXPENSE, EARNING or INVESTMENT.',
    }),
    amount: z
        .number({
            error: () => 'Amount must be a number.',
        })
        .min(1, {
            message: 'Amount must be greater than 0.',
        })
        .refine(
            (value) =>
                validator.isCurrency(value.toFixed(2), {
                    digits_after_decimal: [2],
                    allow_negatives: false,
                    decimal_separator: '.',
                }),
            {
                message: 'Amount must be a valid currency.',
            },
        ),
    event_id: z
        .string()
        .uuid({
            message: 'Event ID must be a valid UUID.',
        })
        .optional()
        .nullable(),
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;

export const updatedTransactionSchema = createTransactionSchema
    .omit({
        user_id: true,
    })
    .partial();

export type UpdateTransactionSchema = z.infer<typeof updatedTransactionSchema>;

export const getTransactionByUserIdSchema = z.object({
    user_id: z
        .string({
            message: 'User ID is required.',
        })
        .uuid({
            message: 'User ID must be a valid UUID.',
        }),
    from: z.iso.date(),
    to: z.iso.date(),
});

export type GetTransactionByUserIdSchema = z.infer<
    typeof getTransactionByUserIdSchema
>;
