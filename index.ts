import 'dotenv/config.js';
import { app } from './src/app.js';
import { env } from './src/config/env.js';

const port = env.PORT;

app.listen({ port, hostname: '0.0.0.0' }, () => {
    const url = `http://0.0.0.0:${port}`;

    console.log(`Servidor Rodando em \x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`);
});
