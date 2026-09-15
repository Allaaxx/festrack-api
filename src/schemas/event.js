import { z } from 'zod';

const dateSchema = (fieldName) =>
    z.union([z.iso.datetime(), z.iso.date()], {
        error: (issue) =>
            issue.input === undefined
                ? `${fieldName} is required.`
                : `${fieldName} must be a valid date.`,
    });

export const createEventSchema = z
    .object({
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
            })
            .max(50, {
                message: 'Name must be at most 50 characters.',
            }),
        description: z
            .string()
            .max(200, {
                message: 'Description must be at most 200 characters.',
            })
            .optional()
            .nullable(),
        start_date: dateSchema('Start date'),
        end_date: dateSchema('End date'),
    })
    .refine(
        (data) => new Date(data.end_date) >= new Date(data.start_date),
        {
            message: 'End date must be greater than or equal to start date.',
            path: ['end_date'],
        },
    );

export const updateEventSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, {
                message: 'Name is required.',
            })
            .max(50, {
                message: 'Name must be at most 50 characters.',
            })
            .optional(),
        description: z
            .string()
            .max(200, {
                message: 'Description must be at most 200 characters.',
            })
            .optional()
            .nullable(),
        start_date: z.union([z.iso.datetime(), z.iso.date()]).optional(),
        end_date: z.union([z.iso.datetime(), z.iso.date()]).optional(),
    })
    .refine(
        (data) => {
            if (data.start_date && data.end_date) {
                return new Date(data.end_date) >= new Date(data.start_date);
            }
            return true;
        },
        {
            message: 'End date must be greater than or equal to start date.',
            path: ['end_date'],
        },
    );
