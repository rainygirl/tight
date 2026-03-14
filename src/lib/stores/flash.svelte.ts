let _messageId = $state<string | null>(null);

export const flashStore = {
	get messageId() { return _messageId; },
	flash(id: string) { _messageId = id; },
	clear() { _messageId = null; }
};
