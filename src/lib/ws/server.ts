import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
import { dispatch } from './handlers.js';

// channelId → active WebSocket connections
export const channelRooms = new Map<string, Set<WebSocket>>();

export function broadcast(channelId: string, payload: unknown, exclude?: WebSocket) {
	const room = channelRooms.get(channelId);
	if (!room) return;
	const data = JSON.stringify(payload);
	for (const client of room) {
		if (client !== exclude && client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	}
}

function setupConnection(ws: WebSocket) {
	let currentChannelId: string | null = null;

	ws.on('message', async (raw) => {
		try {
			const msg = JSON.parse(raw.toString());
			const result = await dispatch(msg, ws);
			if (result?.channelId) currentChannelId = result.channelId;
		} catch {
			ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
		}
	});

	ws.on('close', () => {
		if (currentChannelId) {
			channelRooms.get(currentChannelId)?.delete(ws);
		}
	});
}

// For dev: standalone WebSocket server on a separate port
export function createStandaloneWsServer(port: number) {
	const wss = new WebSocketServer({ port });
	wss.on('connection', setupConnection);
	console.log(`[ws] Listening on ws://localhost:${port}`);
	return wss;
}

// For prod: attach to existing HTTP server via upgrade
export function attachWsToServer(httpServer: Server) {
	const wss = new WebSocketServer({ noServer: true });

	httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
		if (req.url === '/ws') {
			wss.handleUpgrade(req, socket, head, (ws) => {
				wss.emit('connection', ws, req);
			});
		} else {
			socket.destroy();
		}
	});

	wss.on('connection', setupConnection);
	console.log('[ws] Attached to HTTP server at /ws');
	return wss;
}
