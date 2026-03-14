<script lang="ts">
	import type { MessagePayload } from '$lib/ws/types';
	import { t, timeLocale } from '$lib/i18n';
	import ProfileCard from './ProfileCard.svelte';
	import { flashStore } from '$lib/stores/flash.svelte';

	let { message, workspaceSlug, userId = '', onOpenThread = () => {} }: {
		message: MessagePayload;
		workspaceSlug: string;
		userId?: string;
		onOpenThread?: (message: MessagePayload) => void;
	} = $props();

	let flashing = $state(false);

	$effect(() => {
		if (flashStore.messageId === message.id) {
			flashing = true;
			const t1 = setTimeout(() => { flashing = false; flashStore.clear(); }, 2000);
			return () => clearTimeout(t1);
		}
	});

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString(timeLocale(), { hour: '2-digit', minute: '2-digit' });
	}

	// 저장 포맷 → 표시용 HTML 변환
	// 처리 순서: 멘션(@[id:name]) 분리 → 텍스트 파트별로 bold/**/, URL, 줄바꿈 처리
	function renderBody(body: string): string {
		// @[id:name] 멘션과 #[id:name] 채널 태그를 함께 처리
		const tokenRe = /(@\[([^:\]]+):([^\]]+)\])|(#\[([^:\]]+):([^\]]+)\])/g;
		let result = '';
		let last = 0;
		let m: RegExpExecArray | null;

		while ((m = tokenRe.exec(body)) !== null) {
			if (m.index > last) result += processText(body.slice(last, m.index));
			if (m[1]) {
				// @멘션
				const uid = m[2], name = m[3];
				result += `<a class="mention" href="/${workspaceSlug}/dm/${encodeURIComponent(uid)}">@${escapeHtml(name)}</a>`;
			} else {
				// #채널
				const cid = m[5], name = m[6];
				result += `<a class="channel-tag" href="/${workspaceSlug}/${encodeURIComponent(cid)}">#${escapeHtml(name)}</a>`;
			}
			last = m.index + m[0].length;
		}
		if (last < body.length) result += processText(body.slice(last));
		return result;
	}

	function processText(text: string): string {
		// 1. HTML 이스케이프
		let html = escapeHtml(text);

		// 2. 굵게: **text**
		html = html.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');

		// 3. 링크: [text](url)
		html = html.replace(
			/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
			(_, linkText, url) =>
				`<a href="${url.replace(/"/g, '%22')}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
		);

		// 4. 베어 URL
		html = html.replace(
			/https?:\/\/[^\s<>"]+/g,
			(url) => `<a href="${url.replace(/"/g, '%22')}" target="_blank" rel="noopener noreferrer">${url}</a>`
		);

		// 5. 줄바꿈
		html = html.replace(/\n/g, '<br>');

		return html;
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	const bodyHtml = $derived(renderBody(message.body));

	let showProfile = $state(false);
</script>

<div class="message" class:flashing data-msg-id={message.id}>
	<div class="avatar-col">
		{#if message.authorId !== userId}
			<button class="avatar-btn" onclick={() => showProfile = true}>
				{#if message.authorAvatar}
					<img src={message.authorAvatar} alt={message.authorName} class="avatar" />
				{:else}
					<div class="avatar-placeholder">{message.authorName[0].toUpperCase()}</div>
				{/if}
			</button>
		{:else}
			{#if message.authorAvatar}
				<img src={message.authorAvatar} alt={message.authorName} class="avatar" />
			{:else}
				<div class="avatar-placeholder">{message.authorName[0].toUpperCase()}</div>
			{/if}
		{/if}
	</div>
	<div class="content">
		<div class="meta">
			{#if message.authorId !== userId}
				<button class="author author-btn" onclick={() => showProfile = true}>{message.authorName}</button>
			{:else}
				<span class="author">{message.authorName}</span>
			{/if}
			<button class="time time-btn" onclick={() => onOpenThread(message)}>{formatTime(message.createdAt)}</button>
		</div>
		{#if message.body}
			<p class="body">{@html bodyHtml}</p>
		{/if}
		{#if message.imageUrl}
			<img src={message.imageUrl} alt={t('msg.imgAlt')} class="attachment" />
		{/if}
		{#if (message.replyCount ?? 0) > 0}
			<button class="reply-count" onclick={() => onOpenThread(message)}>
				💬 {t('thread.replyCount', { count: String(message.replyCount) })}
			</button>
		{/if}
	</div>
</div>

{#if showProfile && message.authorId !== userId}
  <ProfileCard userId={message.authorId} {workspaceSlug} currentUserId={userId} onClose={() => showProfile = false} />
{/if}

<style>
	.message {
		display: flex;
		gap: 12px;
		padding: 6px 20px;
		transition: background 0.1s;
	}

	.message.flashing {
		animation: flash-highlight 2s ease;
	}

	@keyframes flash-highlight {
		0%   { background: transparent; }
		15%  { background: var(--flash-bg, rgba(18, 100, 163, 0.18)); }
		70%  { background: var(--flash-bg, rgba(18, 100, 163, 0.1)); }
		100% { background: transparent; }
	}

	.message:hover { background: var(--hover-bg); }

	.avatar-col { flex-shrink: 0; padding-top: 2px; }

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		background: var(--sidebar-active);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 600;
	}

	.content { flex: 1; min-width: 0; }

	.meta {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 2px;
	}

	.author { font-size: 15px; font-weight: 700; color: var(--text-primary); }

	.author-link {
		text-decoration: none;
		cursor: pointer;
	}
	.author-link:hover { text-decoration: underline; }

	.author-btn {
		background: none; border: none; padding: 0;
		font-size: 15px; font-weight: 700; color: var(--text-primary);
		cursor: pointer;
	}
	.author-btn:hover { text-decoration: underline; }

	.avatar-link { display: block; border-radius: 6px; }
	.avatar-link:hover { opacity: 0.85; }

	.avatar-btn {
		background: none; border: none; padding: 0;
		border-radius: 6px; cursor: pointer; display: block;
	}
	.avatar-btn:hover { opacity: 0.85; }

	.time { font-size: 12px; color: var(--text-secondary); }
	.time-btn { background: none; border: none; padding: 0; cursor: pointer; color: var(--text-secondary); font-size: 12px; }
	.time-btn:hover { text-decoration: underline; color: var(--sidebar-active); }

	.body {
		font-size: 15px;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.5;
		word-break: break-word;
	}

	.body :global(strong) { font-weight: 700; }

	.body :global(a) {
		color: var(--link-color);
		text-decoration: none;
	}
	.body :global(a:hover) { text-decoration: underline; }

	.body :global(.channel-tag) {
		background: var(--mention-bg);
		color: var(--link-color);
		border-radius: 4px;
		padding: 0 3px;
		font-weight: 600;
		font-size: 14px;
		text-decoration: none;
	}
	.body :global(.channel-tag:hover) { text-decoration: underline; }

	.body :global(.mention) {
		background: var(--mention-bg);
		color: var(--link-color);
		border-radius: 4px;
		padding: 0 3px;
		font-weight: 600;
		font-size: 14px;
	}

	.attachment {
		max-width: 400px;
		max-height: 300px;
		border-radius: 8px;
		margin-top: 6px;
		display: block;
		cursor: pointer;
	}

	.reply-count {
		background: var(--reply-count-bg, rgba(18,100,163,0.08));
		border: 1px solid var(--reply-count-border, rgba(18,100,163,0.25));
		border-radius: 6px;
		padding: 3px 10px;
		font-size: 12px;
		color: var(--reply-count-color, var(--sidebar-active));
		cursor: pointer;
		margin-top: 4px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition: background 0.1s;
	}

	.reply-count:hover { background: var(--reply-count-hover, rgba(18,100,163,0.15)); }
</style>
