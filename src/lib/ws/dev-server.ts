// Dev-only standalone WS server
// Run with: tsx watch src/lib/ws/dev-server.ts
import { createStandaloneWsServer } from './server.js';

const port = Number(process.env.WS_PORT ?? 3001);
createStandaloneWsServer(port);
