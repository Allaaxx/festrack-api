import 'dotenv/config.js';
import { app } from './src/app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
    const url = `http://localhost:${port}`;

    console.log(`Servidor Rodando em \x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`);
});
