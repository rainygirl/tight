<script lang="ts">
	import { tick, onMount } from 'svelte';
	import MessageItem from './MessageItem.svelte';
	import type { MessagePayload } from '$lib/ws/types';
	import { t, timeLocale } from '$lib/i18n';
	import { flashStore } from '$lib/stores/flash.svelte';

	let {
		messages,
		channelId = '',
		forceScroll = 0,
		workspaceSlug = '',
		userId = '',
		onOpenThread = () => {}
	}: {
		messages: MessagePayload[];
		channelId?: string;
		forceScroll?: number;
		workspaceSlug?: string;
		userId?: string;
		onOpenThread?: (message: MessagePayload) => void;
	} = $props();

	let container: HTMLDivElement;
	let prevLength = 0;       // 일반 변수 (반응형 불필요)
	let prevChannelId = '';   // 채널 변경 감지용
	let ready = $state(false);

	function scrollToBottom() {
		tick().then(() => {
			if (container) container.scrollTop = container.scrollHeight;
		});
	}

	function scrollToFlashOrBottom() {
		if (flashStore.messageId) {
			const el = container?.querySelector(`[data-msg-id="${flashStore.messageId}"]`);
			if (el) {
				el.scrollIntoView({ block: 'center' });
				return;
			}
		}
		if (container) container.scrollTop = container.scrollHeight;
	}

	function isNearBottom() {
		if (!container) return true;
		return container.scrollHeight - container.scrollTop - container.clientHeight < 120;
	}

	// 최초 마운트
	onMount(() => {
		tick().then(() => {
			scrollToFlashOrBottom();
			prevLength = messages.length;
			prevChannelId = channelId;
			ready = true;
		});
	});

	// 채널 전환 → 맨 아래로 스크롤
	// ready는 읽지 않음 → 루프 없음
	$effect(() => {
		const cid = channelId; // channelId만 구독
		if (cid === prevChannelId) return;
		prevChannelId = cid;
		prevLength = messages.length;
		tick().then(() => scrollToFlashOrBottom());
	});

	// 내가 보낸 메시지 → 항상 스크롤
	$effect(() => {
		if (forceScroll > 0) scrollToBottom();
	});

	// 실시간 새 메시지 수신 → 하단 근처일 때만 스크롤
	$effect(() => {
		const len = messages.length;
		if (ready && len > prevLength) {
			if (isNearBottom()) scrollToBottom();
			prevLength = len;
		}
	});

	function dateKey(iso: string) {
		return iso.slice(0, 10); // 'YYYY-MM-DD'
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(timeLocale(), {
			year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
		});
	}
</script>

<div class="message-list" bind:this={container} class:ready>
	<div class="spacer"></div>
	{#if messages.length === 0}
		<div class="empty">{t('msg.empty')}</div>
	{:else}
		{#each messages as message, i (message.id)}
			{#if i === 0 || dateKey(message.createdAt) !== dateKey(messages[i - 1].createdAt)}
				<div class="date-divider">
					<span>{formatDate(message.createdAt)}</span>
				</div>
			{/if}
			<MessageItem {message} {workspaceSlug} {userId} {onOpenThread} />
		{/each}
	{/if}
</div>

<style>
	.message-list {
		flex: 1;
		overflow-y: auto;
		padding: 16px 0;
		display: flex;
		flex-direction: column;
		visibility: hidden;
	}

	.message-list.ready {
		visibility: visible;
	}

	.spacer {
		flex: 1;
	}

	.empty {
		margin: auto;
		color: #616061;
		font-size: 15px;
		text-align: center;
		padding: 40px;
	}

	.date-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px 8px;
	}

	.date-divider::before,
	.date-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-color);
	}

	.date-divider span {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
	}
</style>
