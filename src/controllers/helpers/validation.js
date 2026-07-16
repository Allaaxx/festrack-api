import validator from 'validator';
import { badRequest } from './http.js';
export const checkIfIdIsValid = (id) => validator.isUUID(id);

export const invalidIdResponse = () => {
    return badRequest({
        message: 'The provided id is not valid.',
    });
};
