// Production custom server: SvelteKit + WebSocket on single port
// Built output: node server.js
import { createServer } from 'http';
import { attachWsToServer } from './src/lib/ws/server.js';

async function main() {
	const PORT = Number(process.env.PORT ?? 3000);

	// Dynamic import of the built SvelteKit handler
	const { handler } = await import('./build/handler.js');

	const httpServer = createServer(handler);
	attachWsToServer(httpServer);

	httpServer.listen(PORT, () => {
		console.log(`[server] Listening on http://localhost:${PORT}`);
	});
}

main().catch(console.error);
