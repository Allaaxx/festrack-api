import validator from 'validator';

import { HttpResponse, badRequest } from './http.js';
import { uuidSchema } from '../../schemas/params.js';

export const checkIfIdIsValid = (id: string): boolean => validator.isUUID(id);

export const invalidIdResponse = (): HttpResponse<{ message: string }> => {
    return badRequest({
        message: 'The provided id is not valid.',
    });
};

export const validateUuid = async (id: unknown): Promise<string> => {
    return await uuidSchema.parseAsync(id);
};
