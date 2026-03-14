export type WsClientMessage =
	| { type: 'join_channel'; channelId: string }
	| {
			type: 'send_message';
			channelId: string;
			authorId: string;
			body: string;
			imageUrl?: string;
			parentId?: string;
	  }
	| { type: 'typing'; channelId: string; userId: string; isTyping: boolean };

export type WsServerMessage =
	| { type: 'new_message'; message: MessagePayload }
	| { type: 'new_reply'; parentId: string; reply: MessagePayload; replyCount: number }
	| { type: 'typing'; userId: string; isTyping: boolean }
	| { type: 'error'; message: string };

export interface MessagePayload {
	id: string;
	channelId: string;
	authorId: string;
	authorName: string;
	authorAvatar: string | null;
	body: string;
	imageUrl: string | null;
	createdAt: string; // ISO string for safe JSON transfer
	replyCount?: number;
}
