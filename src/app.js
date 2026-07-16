import express from 'express';
import { usersRouter, transactionsRouter, authRouter } from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

export const app = express();

app.use(express.json());

app.use('/api/users', usersRouter);

app.use('/api/transactions', transactionsRouter);

app.use('/api/auth', authRouter);

const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'docs/swagger.json'), 'utf-8'),
);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
