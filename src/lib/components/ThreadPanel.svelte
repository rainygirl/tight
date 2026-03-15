<script lang="ts">
	import { onMount } from 'svelte';
	import { socketStore } from '$lib/stores/socket.svelte';
	import MessageItem from './MessageItem.svelte';
	import MessageInput from './MessageInput.svelte';
	import type { MessagePayload, WsServerMessage } from '$lib/ws/types';
	import { t, timeLocale } from '$lib/i18n';

	interface Member { id: string; name: string; avatarUrl: string | null; }
	interface Channel { id: string; name: string; }

	let {
		parentMessage,
		workspaceSlug,
		userId,
		members = [],
		channels = [],
		uploadDisabled = false,
		onClose
	}: {
		parentMessage: MessagePayload;
		workspaceSlug: string;
		userId: string;
		members?: Member[];
		channels?: Channel[];
		uploadDisabled?: boolean;
		onClose: () => void;
	} = $props();

	let replies = $state<MessagePayload[]>([]);
	let container: HTMLDivElement;
	let loading = $state(true);

	async function loadThread() {
		loading = true;
		const res = await fetch(`/api/threads/${parentMessage.id}`);
		if (res.ok) {
			const data = await res.json();
			replies = data.replies;
		}
		loading = false;
		setTimeout(() => { if (container) container.scrollTop = container.scrollHeight; }, 0);
	}

	$effect(() => {
		// Re-load when parentMessage changes
		parentMessage.id;
		loadThread();
	});

	onMount(() => {
		const threadChannelId = `thread:${parentMessage.id}`;
		socketStore.joinChannel(threadChannelId);

		return () => {};
	});

	// Listen for new_reply WS events to update replies in real time
	$effect(() => {
		function handleReply(msg: WsServerMessage) {
			if (msg.type === 'new_reply' && msg.parentId === parentMessage.id) {
				replies = [...replies, msg.reply];
				setTimeout(() => { if (container) container.scrollTop = container.scrollHeight; }, 0);
			}
		}
		const unsub = socketStore.on('new_reply', handleReply);
		return unsub;
	});

	function handleSend(body: string, imageUrl?: string) {
		socketStore.send({
			type: 'send_message',
			channelId: parentMessage.channelId,
			authorId: userId,
			body,
			imageUrl,
			parentId: parentMessage.id
		});
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(timeLocale(), { month: 'long', day: 'numeric', weekday: 'short' });
	}
</script>

<div class="thread-panel">
	<div class="thread-header">
		<span class="thread-title">{t('thread.title')}</span>
		<button class="close-btn" onclick={onClose}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<div class="thread-body" bind:this={container}>
		<!-- Original message -->
		<div class="original-message">
			<MessageItem message={parentMessage} {workspaceSlug} {userId} />
		</div>

		<div class="reply-divider">
			<span>{t('thread.replyCount', { count: String(replies.length) })}</span>
		</div>

		{#if loading}
			<div class="loading">{t('thread.loading')}</div>
		{:else}
			{#each replies as reply (reply.id)}
				<MessageItem message={reply} {workspaceSlug} {userId} />
			{/each}
		{/if}
	</div>

	<div class="thread-input">
		<MessageInput channelName={t('thread.title')} onSend={handleSend} {members} {channels} {workspaceSlug} {uploadDisabled} />
	</div>
</div>

<style>
	.thread-panel {
		position: relative;
		z-index: 11;
		width: 380px;
		min-width: 380px;
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--border-color);
		background: var(--main-bg);
		overflow: hidden;
	}

	@media (max-width: 768px) {
		.thread-panel {
			position: absolute;
			inset: 0;
			width: 100%;
			min-width: unset;
			border-left: none;
		}
	}

	.thread-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		height: 60px;
		min-height: 60px;
		border-bottom: 1px solid var(--border-color);
	}

	.thread-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 6px;
		border-radius: 4px;
		display: flex;
		align-items: center;
	}

	.close-btn:hover { background: var(--hover-bg); color: var(--text-primary); }

	.thread-body {
		flex: 1;
		overflow-y: auto;
		padding: 8px 0;
	}

	.original-message {
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 8px;
		margin-bottom: 4px;
	}

	.reply-divider {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 20px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.reply-divider::before,
	.reply-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-color);
	}

	.loading {
		text-align: center;
		color: var(--text-secondary);
		font-size: 13px;
		padding: 20px;
	}

	.thread-input { border-top: 1px solid var(--border-color); }
</style>
