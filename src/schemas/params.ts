import { z } from 'zod';

export const uuidSchema = z
    .string({
        message: 'The provided id is not valid.',
    })
    .uuid({
        message: 'The provided id is not valid.',
    });

export const createIdParamSchema = <K extends string>(paramName: K) =>
    z.object(
        {
            [paramName]: uuidSchema,
        } as Record<K, typeof uuidSchema>,
        {
            message: 'The provided id is not valid.',
        },
    );

export const userIdParamSchema = createIdParamSchema('userId');
export type UserIdParamSchema = z.infer<typeof userIdParamSchema>;

export const eventIdParamSchema = createIdParamSchema('eventId');
export type EventIdParamSchema = z.infer<typeof eventIdParamSchema>;

export const transactionIdParamSchema = createIdParamSchema('transactionId');
export type TransactionIdParamSchema = z.infer<typeof transactionIdParamSchema>;

export const idParamSchema = createIdParamSchema('id');
export type IdParamSchema = z.infer<typeof idParamSchema>;
