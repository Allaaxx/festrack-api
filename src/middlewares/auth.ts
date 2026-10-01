import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const auth = (
    request: Request,
    response: Response,
    next: NextFunction,
): Response | void => {
    try {
        const accessToken = request.headers?.authorization?.split('Bearer ')[1];

        if (!accessToken) {
            return response.status(401).send({ message: 'Unauthorized' });
        }

        const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
        if (!secret) {
            return response.status(401).send({ message: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(
            accessToken,
            secret,
        ) as jwt.JwtPayload | string | null;

        if (!decodedToken) {
            return response.status(401).send({ message: 'Unauthorized' });
        }

        if (typeof decodedToken === 'object' && decodedToken.userId) {
            request.userId = decodedToken.userId;
        } else {
            return response.status(401).send({ message: 'Unauthorized' });
        }

        next();
    } catch (error) {
        console.log(error);
        return response.status(401).send({ message: 'Unauthorized' });
    }
};
