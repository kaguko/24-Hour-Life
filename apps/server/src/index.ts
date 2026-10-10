import { readConfig } from './config.js';
import { createServer } from './server.js';

const { port } = readConfig();
await createServer().listen(port);
