import { readConfig } from './config.js';
import { installCors } from './cors.js';
import { createServer } from './server.js';

const { port, corsOrigins, limits, timing } = readConfig();
installCors(corsOrigins);
await createServer({ limits, timing: { ...(timing.planningMs && { planningMs: timing.planningMs }), ...(timing.morningMs && { morningMs: timing.morningMs }) } }).listen(port);
