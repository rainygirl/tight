<script lang="ts">
	import { onMount } from 'svelte';
	import { socketStore } from '$lib/stores/socket.svelte';
	import MessageList from './MessageList.svelte';
	import MessageInput from './MessageInput.svelte';
	import ThreadPanel from './ThreadPanel.svelte';
	import type { MessagePayload, WsServerMessage } from '$lib/ws/types';
	import { t } from '$lib/i18n';
	import { matchKorean } from '$lib/utils/hangulSearch';
	import ProfileCard from './ProfileCard.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';

	interface Member {
		id: string;
		name: string;
		avatarUrl: string | null;
	}

	interface Channel { id: string; name: string; isPrivate?: boolean; isOwner?: boolean; }

	let {
		channelId,
		channelName,
		isDm = false,
		otherUser = null,
		initialMessages,
		userId,
		members,
		channels = [],
		workspaceSlug,
		channelIsPrivate = false,
		channelIsOwner = false
	}: {
		channelId: string;
		channelName: string;
		isDm?: boolean;
		otherUser?: Member | null;
		initialMessages: MessagePayload[];
		userId: string;
		members: Member[];
		channels?: Channel[];
		workspaceSlug: string;
		channelIsPrivate?: boolean;
		channelIsOwner?: boolean;
	} = $props();

	let messages = $state<MessagePayload[]>([...initialMessages as MessagePayload[]]);
	let forceScroll = $state(0);
	let typingUsers = $state<Set<string>>(new Set());
	const typingTimeout: Record<string, ReturnType<typeof setTimeout>> = {};

	// Profile card
	let showProfileId = $state<string | null>(null);

	// Thread panel
	let selectedThread = $state<MessagePayload | null>(null);

	function handleOpenThread(message: MessagePayload) {
		if (selectedThread?.id === message.id) {
			selectedThread = null;
		} else {
			selectedThread = message;
		}
	}

	function handleNewReply(parentId: string, replyCount: number) {
		messages = messages.map(m => m.id === parentId ? { ...m, replyCount } : m);
	}

	// Member management
	let showMembers = $state(false);
	let channelMembersList = $state<{id: string; name: string; avatarUrl: string | null; role: string}[]>([]);
	let inviteQuery = $state('');

	async function loadChannelMembers() {
		const res = await fetch(`/api/channels/${channelId}/members`);
		if (res.ok) channelMembersList = await res.json();
	}

	async function inviteMember(memberId: string) {
		await fetch(`/api/channels/${channelId}/members`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId: memberId })
		});
		await loadChannelMembers();
	}

	async function removeMember(memberId: string) {
		await fetch(`/api/channels/${channelId}/members/${memberId}`, { method: 'DELETE' });
		await loadChannelMembers();
	}

	const inviteFiltered = $derived(
		inviteQuery.trim() === ''
			? members
			: members.filter(m => matchKorean(inviteQuery, m.name))
	);

	$effect(() => {
		messages = [...(initialMessages as MessagePayload[])];
		socketStore.joinChannel(channelId);
		selectedThread = null;
	});

	onMount(() => {
		socketStore.joinChannel(channelId);

		const unsubMsg = socketStore.on('new_message', (msg: WsServerMessage) => {
			if (msg.type === 'new_message' && msg.message.channelId === channelId) {
				messages = [...messages, msg.message];
			}
		});

		const unsubReply = socketStore.on('new_reply', (msg: WsServerMessage) => {
			if (msg.type === 'new_reply') {
				handleNewReply(msg.parentId, msg.replyCount);
			}
		});

		const unsubTyping = socketStore.on('typing', (msg: WsServerMessage) => {
			if (msg.type !== 'typing' || msg.userId === userId) return;
			if (msg.isTyping) {
				typingUsers = new Set([...typingUsers, msg.userId]);
				clearTimeout(typingTimeout[msg.userId]);
				typingTimeout[msg.userId] = setTimeout(() => {
					typingUsers.delete(msg.userId);
					typingUsers = new Set(typingUsers);
				}, 3000);
			} else {
				typingUsers.delete(msg.userId);
				typingUsers = new Set(typingUsers);
			}
		});

		return () => { unsubMsg(); unsubReply(); unsubTyping(); };
	});

	function handleSend(body: string, imageUrl?: string) {
		socketStore.send({ type: 'send_message', channelId, authorId: userId, body, imageUrl });
		forceScroll += 1;
	}

	let inputTimeout: ReturnType<typeof setTimeout> | null = null;
	function handleTyping() {
		socketStore.send({ type: 'typing', channelId, userId, isTyping: true });
		if (inputTimeout) clearTimeout(inputTimeout);
		inputTimeout = setTimeout(() => {
			socketStore.send({ type: 'typing', channelId, userId, isTyping: false });
		}, 2000);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showProfileId) { showProfileId = null; return; }
			if (showMembers)   { showMembers = false; }
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="chat-view">
	<header class="chat-header">
		<button class="hamburger-btn" onclick={sidebarStore.toggle} aria-label="메뉴">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
				<line x1="3" y1="6" x2="21" y2="6"/>
				<line x1="3" y1="12" x2="21" y2="12"/>
				<line x1="3" y1="18" x2="21" y2="18"/>
			</svg>
		</button>
		{#if isDm && otherUser}
			{#if otherUser.avatarUrl}
				<img src={otherUser.avatarUrl} alt={otherUser.name} class="dm-avatar" />
			{:else}
				<div class="dm-avatar-placeholder">{otherUser.name[0].toUpperCase()}</div>
			{/if}
			<button class="chat-name chat-name-btn" onclick={() => showProfileId = otherUser.id}>{otherUser.name}</button>
			<span class="dm-badge">{t('chat.dm')}</span>
		{:else}
			<span class="hash">#</span>
			<span class="chat-name">{channelName}</span>
		{/if}
		{#if channelIsPrivate}
			<button class="members-btn" onclick={() => { showMembers = true; loadChannelMembers(); }} title={t('channel.members')}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
					<circle cx="9" cy="7" r="4"/>
					<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
					<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
			</button>
		{/if}
		<div
			class="ws-indicator"
			class:connected={socketStore.connected}
			title={socketStore.connected ? t('chat.connected') : t('chat.connecting')}
		>●</div>
	</header>

	<div class="chat-body">
		<div class="main-chat">
			<MessageList {messages} {channelId} {forceScroll} {workspaceSlug} {userId} onOpenThread={handleOpenThread} />

			{#if typingUsers.size > 0}
				<div class="typing-indicator">{t('chat.typing')}</div>
			{/if}

			<div onkeydown={handleTyping} role="none">
				<MessageInput channelName={isDm ? otherUser?.name ?? 'DM' : channelName} onSend={handleSend} {members} {channels} {workspaceSlug} />
			</div>
		</div>

		{#if selectedThread}
			<div
				class="thread-curtain"
				onclick={() => selectedThread = null}
				role="presentation"
			></div>
			<ThreadPanel
				parentMessage={selectedThread}
				{workspaceSlug}
				{userId}
				{members}
				{channels}
				onClose={() => selectedThread = null}
			/>
		{/if}
	</div>
</div>

{#if showProfileId}
  <ProfileCard userId={showProfileId} {workspaceSlug} currentUserId={userId} onClose={() => showProfileId = null} />
{/if}

<!-- 멤버 관리 모달 -->
{#if showMembers}
<div class="modal-overlay" onclick={() => (showMembers = false)} role="presentation">
	<div class="modal members-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('channel.members')}>
		<div class="modal-header">
			<span class="modal-title">{t('channel.members')}</span>
			<button class="modal-close" onclick={() => (showMembers = false)}>✕</button>
		</div>
		<div class="modal-body">
			<div class="members-list">
				{#each channelMembersList as member}
					<div class="member-row">
						<div class="member-info">
							{#if member.avatarUrl}
								<img src={member.avatarUrl} alt={member.name} class="member-avatar" />
							{:else}
								<div class="member-avatar-placeholder">{member.name[0].toUpperCase()}</div>
							{/if}
							<span class="member-name">{member.name}</span>
							{#if member.role === 'owner'}
								<span class="role-badge">{t('channel.owner')}</span>
							{/if}
						</div>
						{#if channelIsOwner && member.id !== userId}
							<button class="remove-btn" onclick={() => removeMember(member.id)}>{t('channel.remove')}</button>
						{/if}
					</div>
				{/each}
				{#if channelMembersList.length === 0}
					<div class="empty-members">{t('channel.noMembers')}</div>
				{/if}
			</div>
			{#if channelIsOwner}
				<div class="invite-section">
					<div class="invite-label">{t('channel.invite')}</div>
					<input
						bind:value={inviteQuery}
						class="modal-input"
						placeholder={t('channel.searchPh')}
					/>
					<div class="invite-results">
						{#each inviteFiltered.filter(m => !channelMembersList.some(cm => cm.id === m.id)) as member}
							<button class="invite-item" onclick={() => inviteMember(member.id)}>
								{#if member.avatarUrl}
									<img src={member.avatarUrl} alt={member.name} class="member-avatar" />
								{:else}
									<div class="member-avatar-placeholder">{member.name[0].toUpperCase()}</div>
								{/if}
								<span>{member.name}</span>
								<span class="invite-plus">+</span>
							</button>
						{:else}
							<div class="empty-members">{t('channel.noInvite')}</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.chat-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		background: var(--main-bg);
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 20px;
		height: 60px;
		min-height: 60px;
		border-bottom: 1px solid var(--border-color);
		background: var(--main-bg);
	}

	@media (max-width: 768px) {
		.chat-header { padding: 0 12px; }
	}

	.hamburger-btn {
		display: none;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
		flex-shrink: 0;
		transition: background 0.1s, color 0.1s;
	}

	.hamburger-btn:hover { background: var(--hover-bg); color: var(--text-primary); }

	@media (max-width: 768px) {
		.hamburger-btn { display: flex; align-items: center; }
	}

	.hash { font-size: 20px; color: var(--text-secondary); }

	.chat-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }

	.chat-name-btn {
		background: none; border: none; padding: 0;
		font-size: 16px; font-weight: 700; color: var(--text-primary);
		cursor: pointer;
	}
	.chat-name-btn:hover { text-decoration: underline; }

	.dm-badge {
		font-size: 11px;
		font-weight: 600;
		background: var(--sidebar-active);
		color: #fff;
		padding: 2px 6px;
		border-radius: 10px;
	}

	.dm-avatar {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		object-fit: cover;
	}

	.dm-avatar-placeholder {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		background: var(--sidebar-active);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 600;
	}

	.members-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		transition: background 0.1s, color 0.1s;
	}

	.members-btn:hover { background: var(--hover-bg); color: var(--text-primary); }

	.ws-indicator {
		margin-left: auto;
		font-size: 10px;
		color: var(--text-secondary);
		opacity: 0.5;
		transition: color 0.3s, opacity 0.3s;
	}

	.ws-indicator.connected { color: #2bac76; opacity: 1; }

	.chat-body {
		display: flex;
		flex: 1;
		overflow: hidden;
		position: relative;
	}

	.thread-curtain {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 10;
		cursor: pointer;
		animation: curtain-in 0.15s ease;
	}

	@keyframes curtain-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	.main-chat {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		min-width: 0;
	}

	.typing-indicator {
		padding: 0 20px 4px;
		font-size: 12px;
		color: var(--text-secondary);
		font-style: italic;
	}

	/* Member management modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.65);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--main-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		width: 400px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.2);
		overflow: hidden;
	}

	.members-modal { width: 420px; }

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 12px;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 14px;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
	}

	.modal-close:hover { color: var(--text-primary); background: var(--hover-bg); }

	.modal-body {
		padding: 16px 20px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-height: 70vh;
		overflow-y: auto;
	}

	.modal-input {
		width: 100%;
		padding: 9px 12px;
		border: 1px solid var(--input-border);
		border-radius: 6px;
		font-size: 14px;
		background: var(--input-bg);
		color: var(--text-primary);
		outline: none;
		box-sizing: border-box;
	}

	.modal-input:focus { border-color: var(--input-border-focus); box-shadow: 0 0 0 3px rgba(18,100,163,0.15); }

	.members-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 0;
	}

	.member-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.member-avatar {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		object-fit: cover;
	}

	.member-avatar-placeholder {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		background: var(--sidebar-active);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
	}

	.member-name { font-size: 14px; color: var(--text-primary); }

	.role-badge {
		font-size: 11px;
		background: var(--sidebar-active);
		color: #fff;
		padding: 1px 6px;
		border-radius: 8px;
	}

	.remove-btn {
		background: none;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 3px 8px;
		transition: background 0.1s;
	}

	.remove-btn:hover { background: rgba(224, 30, 90, 0.08); color: #e01e5a; border-color: #e01e5a; }

	.invite-section { border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }

	.invite-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

	.invite-results {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 160px;
		overflow-y: auto;
	}

	.invite-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		color: var(--text-primary);
		text-align: left;
		transition: background 0.1s;
		width: 100%;
	}

	.invite-item:hover { background: var(--hover-bg); }

	.invite-plus {
		margin-left: auto;
		font-size: 18px;
		color: var(--sidebar-active);
		font-weight: 300;
	}

	.empty-members {
		font-size: 13px;
		color: var(--text-secondary);
		padding: 8px 0;
		text-align: center;
	}
</style>
