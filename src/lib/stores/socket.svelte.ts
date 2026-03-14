import type { WsClientMessage, WsServerMessage } from '$lib/ws/types';

const WS_URL =
	typeof window !== 'undefined' ? (import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001') : '';

type Listener = (msg: WsServerMessage) => void;

function createSocketStore() {
	let socket = $state<WebSocket | null>(null);
	let connected = $state(false);
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	const listeners = new Map<string, Set<Listener>>();

	// 연결 시(재연결 포함) 자동으로 join할 채널
	let pendingChannelId: string | null = null;

	function connect() {
		if (typeof window === 'undefined') return;
		if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING)
			return;

		socket = new WebSocket(WS_URL);

		socket.onopen = () => {
			connected = true;
			if (reconnectTimeout) clearTimeout(reconnectTimeout);
			// 연결되자마자 채널 join (최초 + 재연결 모두 처리)
			if (pendingChannelId) {
				socket!.send(JSON.stringify({ type: 'join_channel', channelId: pendingChannelId }));
			}
		};

		socket.onclose = () => {
			connected = false;
			socket = null;
			reconnectTimeout = setTimeout(connect, 3000);
		};

		socket.onerror = () => {
			socket?.close();
		};

		socket.onmessage = (event) => {
			try {
				const msg: WsServerMessage = JSON.parse(event.data);
				listeners.get(msg.type)?.forEach((fn) => fn(msg));
			} catch {
				// ignore malformed messages
			}
		};
	}

	function joinChannel(channelId: string) {
		pendingChannelId = channelId;
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ type: 'join_channel', channelId }));
		} else {
			// 아직 연결 안됐으면 connect() 후 onopen에서 자동 처리
			connect();
		}
	}

	function send(msg: WsClientMessage) {
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(msg));
		}
	}

	function on(type: string, fn: Listener): () => void {
		if (!listeners.has(type)) listeners.set(type, new Set());
		listeners.get(type)!.add(fn);
		return () => listeners.get(type)?.delete(fn);
	}

	return {
		joinChannel,
		send,
		on,
		get connected() {
			return connected;
		}
	};
}

export const socketStore = createSocketStore();
