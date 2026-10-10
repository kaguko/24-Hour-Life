import { readConfig } from './config.js';
import { installCors } from './cors.js';
import { createServer } from './server.js';

const { port, corsOrigins, limits } = readConfig();
installCors(corsOrigins);
await createServer({ limits }).listen(port);
