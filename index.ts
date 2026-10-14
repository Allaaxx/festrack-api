import 'dotenv/config.js';
import { app } from './src/app.js';
import { env } from './src/config/env.js';

export const serverConfig = {
    port: env.PORT,
    hostname: '0.0.0.0',
};

export const startServer = (config = serverConfig) => {
    return app.listen(config, () => {
        const url = `http://${config.hostname}:${config.port}`;
        console.log(
            `Servidor Rodando em \x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`,
        );
    });
};

if (import.meta.main) {
    startServer();
}
