import express from 'express';
import { usersRouter, transactionsRouter, authRouter, eventsRouter } from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
export const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
);
app.use(express.json());

app.use('/api/users', usersRouter);

app.use('/api/transactions', transactionsRouter);

app.use('/api/auth', authRouter);

app.use('/api/events', eventsRouter);

const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'docs/swagger.json'), 'utf-8'),
);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
