import validator from 'validator';
import { z } from 'zod';

export const createTransactionSchema = z.object({
    user_id: z.uuid({
        message: 'User ID must be a valid UUID.',
        required_error: 'User ID is required.',
    }),
    name: z
        .string({
            required_error: 'Name is required.',
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
        error: (issue) =>
            issue.code === 'invalid_value'
                ? 'Type must be EXPENSE, EARNING or INVESTMENT.'
                : undefined,
    }),
    amount: z
        .number({
            error: (issue) =>
                issue.code === 'invalid_type'
                    ? 'Amount must be a number.'
                    : undefined,
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
});

export const updatedTransactionSchema = createTransactionSchema
    .omit({
        user_id: true,
    })
    .partial();
