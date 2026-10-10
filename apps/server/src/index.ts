import { readConfig } from './config.js';
import { installCors } from './cors.js';
import { createServer } from './server.js';

const { port, corsOrigins } = readConfig();
installCors(corsOrigins);
await createServer().listen(port);
