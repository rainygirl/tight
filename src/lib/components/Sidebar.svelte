<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { signOut } from '@auth/sveltekit/client';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { localeStore, LANGUAGES } from '$lib/stores/locale.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { t } from '$lib/i18n';
	import { matchKorean } from '$lib/utils/hangulSearch';
	import SearchModal from './SearchModal.svelte';

	interface Channel { id: string; name: string; isPrivate?: boolean; isOwner?: boolean; }
	interface DmEntry { channelId: string; user: { id: string; name: string; avatarUrl: string | null; }; }
	interface Workspace { id: string; name: string; slug: string; }
	interface User { name?: string | null; email?: string | null; image?: string | null; }
	interface Member { id: string; name: string; avatarUrl: string | null; }

	let {
		workspace,
		channels,
		dms = [],
		user,
		userId = '',
		members = []
	}: {
		workspace: Workspace;
		channels: Channel[];
		dms?: DmEntry[];
		user: User;
		userId?: string;
		members?: Member[];
	} = $props();

	const currentChannelId = $derived($page.params.channel);
	const currentDmUserId = $derived($page.params.userId);

	// 팝업 메뉴
	let showMenu = $state(false);
	let menuEl: HTMLDivElement;
	let menuBtnEl: HTMLButtonElement;

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function closeMenu() {
		showMenu = false;
	}

	// DM 검색
	let showDmSearch = $state(false);
	let dmQuery = $state('');
	let dmSearchEl: HTMLInputElement;

	const dmFiltered = $derived(
		dmQuery.trim() === ''
			? members
			: members.filter(m => matchKorean(dmQuery, m.name))
	);

	function openDmSearch() {
		showDmSearch = true;
		dmQuery = '';
		requestAnimationFrame(() => dmSearchEl?.focus());
	}

	function closeDmSearch() {
		showDmSearch = false;
		dmQuery = '';
	}

	// 언어 모달
	let showLangModal = $state(false);

	function openLangModal() {
		closeMenu();
		showLangModal = true;
	}

	function onWindowClick(e: MouseEvent) {
		if (!showMenu) return;
		if (menuEl?.contains(e.target as Node) || menuBtnEl?.contains(e.target as Node)) return;
		closeMenu();
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (showLangModal)      { showLangModal = false; return; }
		if (showNicknameModal)  { showNicknameModal = false; return; }
		if (showAddChannel)     { showAddChannel = false; return; }
		if (showSearchModal)    { showSearchModal = false; return; }
		if (showMenu)           { closeMenu(); return; }
		if (sidebarStore.isOpen){ sidebarStore.hide(); }
	}

	// 닉네임 / 프로필 변경
	let showNicknameModal = $state(false);
	let nickName = $state(user.name ?? '');
	let displayName = $state(user.name ?? '');

	let profileBio = $state('');
	let profileRoleTitle = $state('');
	let profilePhone = $state('');
	let profileAvatarUrl = $state<string | null>(null);
	let profileAvatarUploading = $state(false);
	let profileAvatarFileInput: HTMLInputElement;

	async function openNicknameModal() {
		showNicknameModal = true;
		closeMenu();
		// Load current profile
		if (userId) {
			const res = await fetch(`/api/users/${userId}`);
			if (res.ok) {
				const p = await res.json();
				nickName = p.name;
				profileBio = p.bio ?? '';
				profileRoleTitle = p.roleTitle ?? '';
				profilePhone = p.phone ?? '';
				profileAvatarUrl = null; // reset - show current from prop
			}
		}
	}

	async function handleAvatarUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		profileAvatarUploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload failed');
			const { publicUrl } = await res.json();
			profileAvatarUrl = publicUrl;
		} catch (err) {
			console.error('[avatar upload]', err);
			alert(t('input.uploadFail'));
		} finally {
			profileAvatarUploading = false;
		}
	}

	async function submitNickname(e: SubmitEvent) {
		e.preventDefault();
		const body: Record<string, string> = { name: nickName };
		body.bio = profileBio;
		body.roleTitle = profileRoleTitle;
		body.phone = profilePhone;
		if (profileAvatarUrl) {
			body.avatarUrl = profileAvatarUrl;
			body.avatarSource = 'custom';
		}
		await fetch('/api/profile', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		displayName = nickName;
		showNicknameModal = false;
		invalidateAll();
	}

	// 검색 모달
	let showSearchModal = $state(false);

	// 채널 추가
	let showAddChannel = $state(false);
	let newChannelName = $state('');
	let newChannelPrivate = $state(false);
	let addChannelLoading = $state(false);

	function openAddChannel() { showAddChannel = true; newChannelName = ''; newChannelPrivate = false; }

	async function submitAddChannel(e: SubmitEvent) {
		e.preventDefault();
		const name = newChannelName.trim();
		if (!name) return;
		addChannelLoading = true;
		const res = await fetch('/api/channels', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ workspaceId: workspace.id, name, isPrivate: newChannelPrivate })
		});
		addChannelLoading = false;
		if (res.ok) {
			const ch = await res.json();
			showAddChannel = false;
			await invalidateAll();
			goto(`/${workspace.slug}/${ch.id}`);
		}
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<aside class="sidebar" class:mobile-open={sidebarStore.isOpen}>
	<div class="workspace-header">
		<span class="workspace-name">{workspace.name}</span>
		<button class="mobile-close-btn" onclick={sidebarStore.hide} aria-label={t('sidebar.close')}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<!-- 검색창 (클릭하면 모달) -->
	<button class="search-bar" onclick={() => showSearchModal = true} aria-label={t('search.title')}>
		<svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
		</svg>
		<span class="search-placeholder">{t('search.placeholder')}</span>
	</button>

	{#if true}

	<nav class="channel-list">
		<div class="section-label section-label-row">
			<span>{t('sidebar.channels')}</span>
			<button class="section-add-btn" onclick={openAddChannel} title={t('sidebar.newChannel')}>+</button>
		</div>
		{#each channels as channel}
			<a
				href="/{workspace.slug}/{channel.id}"
				class="nav-item"
				class:active={currentChannelId === channel.id}
				onclick={sidebarStore.hide}
			>
				{#if channel.isPrivate}
					<svg class="lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
					</svg>
				{:else}
					<span class="hash">#</span>
				{/if}
				{channel.name}
			</a>
		{/each}

		<div class="section-label section-label-row" style="margin-top:12px">
			<span>{t('sidebar.dm')}</span>
			<button class="section-add-btn" onclick={openDmSearch} title={t('sidebar.newDm')}>+</button>
		</div>

		{#if showDmSearch}
			<div class="dm-search-box">
				<input
					bind:this={dmSearchEl}
					bind:value={dmQuery}
					class="dm-search-input"
					placeholder={t('channel.searchPh')}
					onkeydown={(e) => e.key === 'Escape' && closeDmSearch()}
				/>
				<div class="dm-search-results">
					{#each dmFiltered as member}
						<a
							href="/{workspace.slug}/dm/{member.id}"
							class="dm-search-item"
							onclick={closeDmSearch}
						>
							{#if member.avatarUrl}
								<img src={member.avatarUrl} alt={member.name} class="dm-avatar" />
							{:else}
								<div class="dm-avatar-placeholder">{member.name[0].toUpperCase()}</div>
							{/if}
							<span>{member.name}</span>
						</a>
					{:else}
						<div class="dm-search-empty">{t('sidebar.noResult')}</div>
					{/each}
				</div>
			</div>
		{/if}

		{#each dms as dm}
			<a
				href="/{workspace.slug}/dm/{dm.user.id}"
				class="nav-item dm-item"
				class:active={currentDmUserId === dm.user.id}
				onclick={sidebarStore.hide}
			>
				{#if dm.user.avatarUrl}
					<img src={dm.user.avatarUrl} alt={dm.user.name} class="dm-avatar" />
				{:else}
					<div class="dm-avatar-placeholder">{dm.user.name[0].toUpperCase()}</div>
				{/if}
				<span>{dm.user.name}</span>
			</a>
		{/each}
	</nav>

	{/if}<!-- end nav -->

	<div class="user-info">
		{#if user.image}
			<img src={user.image} alt={displayName} class="avatar" />
		{:else}
			<div class="avatar-placeholder">{(displayName || '?')[0].toUpperCase()}</div>
		{/if}
		<div class="user-details">
			<div class="user-name">{displayName}</div>
			<div class="user-email">{user.email}</div>
		</div>

		<!-- ... 메뉴 버튼 -->
		<button class="menu-btn" bind:this={menuBtnEl} onclick={toggleMenu} title={t('menu.settings')} aria-label={t('menu.openLabel')}>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<circle cx="8" cy="3" r="1.4"/>
				<circle cx="8" cy="8" r="1.4"/>
				<circle cx="8" cy="13" r="1.4"/>
			</svg>
		</button>

		<!-- 팝업 메뉴 -->
		{#if showMenu}
			<div class="popup-menu" bind:this={menuEl}>
				<!-- 닉네임 변경 -->
				<button class="menu-item" onclick={openNicknameModal}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
					{t('menu.nickname')}
				</button>

				<!-- 다크/라이트 모드 -->
				<button class="menu-item" onclick={() => { themeStore.toggle(); closeMenu(); }}>
					{#if themeStore.dark}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="5"/>
							<line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
							<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
							<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
							<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
						</svg>
						{t('menu.lightMode')}
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
						</svg>
						{t('menu.darkMode')}
					{/if}
				</button>

				<!-- 언어 -->
				<button class="menu-item" onclick={openLangModal}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/>
						<line x1="2" y1="12" x2="22" y2="12"/>
						<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
					</svg>
					{t('menu.language')}
					<span class="current-lang">{localeStore.label}</span>
				</button>

				<div class="menu-divider"></div>

				<!-- 로그아웃 -->
				<button class="menu-item menu-item-danger" onclick={() => signOut()}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
						<polyline points="16,17 21,12 16,7"/>
						<line x1="21" y1="12" x2="9" y2="12"/>
					</svg>
					{t('menu.logout')}
				</button>
			</div>
		{/if}
	</div>
</aside>

<!-- 검색 모달 -->
{#if showSearchModal}
	<SearchModal
		workspaceId={workspace.id}
		workspaceSlug={workspace.slug}
		onClose={() => showSearchModal = false}
	/>
{/if}

<!-- 프로필 편집 모달 -->
{#if showNicknameModal}
<div class="modal-overlay" onclick={() => (showNicknameModal = false)} role="presentation">
  <div class="modal profile-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('profile.editTitle')}>
    <div class="modal-header">
      <span class="modal-title">{t('profile.editTitle')}</span>
      <button class="modal-close" onclick={() => (showNicknameModal = false)}>✕</button>
    </div>
    <form class="modal-body" onsubmit={submitNickname}>
      <!-- Avatar -->
      <div class="avatar-edit-row">
        {#if profileAvatarUrl}
          <img src={profileAvatarUrl} alt="avatar" class="avatar-preview" />
        {:else if user.image}
          <img src={user.image} alt="avatar" class="avatar-preview" />
        {:else}
          <div class="avatar-preview-placeholder">{(displayName || '?')[0].toUpperCase()}</div>
        {/if}
        <button type="button" class="avatar-upload-btn" onclick={() => profileAvatarFileInput.click()} disabled={profileAvatarUploading}>
          {profileAvatarUploading ? '...' : t('profile.changePhoto')}
        </button>
        <input bind:this={profileAvatarFileInput} type="file" accept="image/*" style="display:none" onchange={handleAvatarUpload} />
      </div>
      <!-- Name -->
      <div class="form-field">
        <label class="field-label">{t('nick.title')}</label>
        <input bind:value={nickName} class="modal-input" placeholder={t('nick.placeholder')} required />
      </div>
      <!-- Role title -->
      <div class="form-field">
        <label class="field-label">{t('profile.roleTitle')}</label>
        <input bind:value={profileRoleTitle} class="modal-input" placeholder={t('profile.rolePh')} />
      </div>
      <!-- Bio -->
      <div class="form-field">
        <label class="field-label">{t('profile.bio')}</label>
        <textarea bind:value={profileBio} class="modal-input modal-textarea" placeholder={t('profile.bioPh')} rows="3"></textarea>
      </div>
      <!-- Phone -->
      <div class="form-field">
        <label class="field-label">{t('profile.phone')}</label>
        <input bind:value={profilePhone} class="modal-input" placeholder={t('profile.phonePh')} type="tel" />
      </div>
      <div class="modal-actions">
        <button type="button" class="modal-cancel" onclick={() => (showNicknameModal = false)}>{t('nick.cancel')}</button>
        <button type="submit" class="modal-confirm">{t('nick.save')}</button>
      </div>
    </form>
  </div>
</div>
{/if}

<!-- 채널 추가 모달 -->
{#if showAddChannel}
<div class="modal-overlay" onclick={() => (showAddChannel = false)} role="presentation">
	<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('channel.addTitle')}>
		<div class="modal-header">
			<span class="modal-title">{t('channel.addTitle')}</span>
			<button class="modal-close" onclick={() => (showAddChannel = false)}>✕</button>
		</div>
		<form class="modal-body" onsubmit={submitAddChannel}>
			<input bind:value={newChannelName} class="modal-input" placeholder={t('channel.namePh')} maxlength="80" required />
			<label class="toggle-row">
				<span>{t('channel.private')}</span>
				<span class="ios-toggle" class:on={newChannelPrivate}>
					<input type="checkbox" bind:checked={newChannelPrivate} />
					<span class="toggle-thumb"></span>
				</span>
			</label>
			{#if newChannelPrivate}
				<p class="private-hint">{t('channel.privateHint')}</p>
			{/if}
			<div class="modal-actions">
				<button type="button" class="modal-cancel" onclick={() => (showAddChannel = false)}>{t('nick.cancel')}</button>
				<button type="submit" class="modal-confirm" disabled={addChannelLoading}>{t('channel.create')}</button>
			</div>
		</form>
	</div>
</div>
{/if}

<!-- 언어 선택 모달 -->
{#if showLangModal}
	<div class="modal-overlay" onclick={() => (showLangModal = false)} role="presentation">
		<div class="modal lang-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('menu.language')}>
			<div class="modal-header">
				<span class="modal-title">{t('menu.language')}</span>
				<button class="modal-close" onclick={() => (showLangModal = false)}>✕</button>
			</div>
			<div class="lang-list">
				{#each LANGUAGES as lang}
					<button
						class="lang-option"
						class:lang-selected={localeStore.code === lang.code}
						onclick={() => { localeStore.set(lang.code); showLangModal = false; }}
					>
						<span class="lang-check">
							{#if localeStore.code === lang.code}
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="2,7 6,11 12,3"/>
								</svg>
							{/if}
						</span>
						{lang.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.sidebar {
		width: 260px;
		min-width: 260px;
		background: var(--sidebar-bg);
		color: var(--sidebar-text);
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.workspace-header {
		padding: 0 16px 0 20px;
		border-bottom: 1px solid var(--sidebar-border);
		min-height: 60px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.workspace-name {
		font-size: 18px;
		font-weight: 700;
		color: #fff;
		flex: 1;
	}

	.mobile-close-btn {
		display: none;
		background: none;
		border: none;
		color: var(--sidebar-text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	/* 검색창 버튼 */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 8px 10px 4px;
		background: rgba(255,255,255,0.07);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 6px;
		padding: 6px 10px;
		cursor: pointer;
		width: calc(100% - 20px);
		text-align: left;
		transition: background 0.1s;
	}

	.search-bar:hover { background: rgba(255,255,255,0.11); }

	.search-icon { color: var(--sidebar-text-muted); flex-shrink: 0; }

	.search-placeholder {
		font-size: 13px;
		color: var(--sidebar-text-muted);
	}

	/* 모바일 반응형 */
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.25s ease;
			box-shadow: none;
		}

		.sidebar.mobile-open {
			transform: translateX(0);
			box-shadow: 4px 0 24px rgba(0,0,0,0.4);
		}

		.mobile-close-btn { display: flex; }
	}

	.channel-list {
		flex: 1;
		overflow-y: auto;
		padding: 12px 0;
	}

	.section-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--sidebar-text-muted);
		padding: 4px 20px 6px;
	}

	.section-label-row {
		display: flex;
		align-items: center;
		padding-right: 12px;
	}

	.section-label-row span { flex: 1; }

	.section-add-btn {
		background: none;
		border: none;
		color: var(--sidebar-text-muted);
		font-size: 18px;
		line-height: 1;
		cursor: pointer;
		padding: 0 4px;
		border-radius: 4px;
		transition: color 0.1s, background 0.1s;
	}

	.section-add-btn:hover { color: #fff; background: var(--sidebar-hover); }

	/* DM 검색 */
	.dm-search-box {
		margin: 4px 8px 6px;
		background: var(--sidebar-hover);
		border-radius: 8px;
		overflow: hidden;
	}

	.dm-search-input {
		width: 100%;
		padding: 7px 12px;
		background: transparent;
		border: none;
		color: var(--sidebar-text);
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
	}

	.dm-search-input::placeholder { color: var(--sidebar-text-muted); }

	.dm-search-results {
		max-height: 200px;
		overflow-y: auto;
		border-top: 1px solid rgba(255,255,255,0.06);
	}

	.dm-search-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 12px;
		text-decoration: none;
		color: var(--sidebar-text);
		font-size: 14px;
		transition: background 0.1s;
	}

	.dm-search-item:hover { background: rgba(255,255,255,0.08); }

	.dm-search-empty {
		padding: 10px 12px;
		font-size: 13px;
		color: var(--sidebar-text-muted);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 20px;
		text-decoration: none;
		color: var(--sidebar-text-muted);
		font-size: 15px;
		border-radius: 6px;
		margin: 1px 8px;
		transition: background 0.1s, color 0.1s;
	}

	.nav-item:hover { background: var(--sidebar-hover); color: var(--sidebar-text); }
	.nav-item.active { background: var(--sidebar-active); color: #fff; }

	.hash { font-size: 17px; opacity: 0.7; }

	.lock-icon { color: var(--sidebar-text-muted); flex-shrink: 0; }

	.dm-item { padding: 4px 20px; }

	.dm-avatar {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.dm-avatar-placeholder {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		background: var(--sidebar-active);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* 유저 영역 */
	.user-info {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--sidebar-border);
		min-height: 60px;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar-placeholder {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		background: var(--sidebar-active);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.user-details { flex: 1; overflow: hidden; }

	.user-name {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-email {
		font-size: 11px;
		color: var(--sidebar-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ... 버튼 */
	.menu-btn {
		background: none;
		border: none;
		color: var(--sidebar-text-muted);
		cursor: pointer;
		padding: 4px 5px;
		border-radius: 4px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		transition: color 0.1s, background 0.1s;
	}

	.menu-btn:hover { color: #fff; background: var(--sidebar-hover); }

	/* 팝업 메뉴 */
	.popup-menu {
		position: absolute;
		bottom: calc(100% + 4px);
		right: 8px;
		width: 220px;
		background: var(--input-bg, #fff);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
		z-index: 200;
		padding: 4px 0;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 14px;
		background: none;
		border: none;
		font-size: 13px;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
		white-space: nowrap;
	}

	.menu-item:hover { background: var(--hover-bg); }

	.menu-item.sub-open { background: var(--hover-bg); }

	.menu-item-danger { color: #e01e5a; }
	.menu-item-danger:hover { background: rgba(224, 30, 90, 0.08); }

	.menu-divider {
		height: 1px;
		background: var(--border-color);
		margin: 4px 0;
	}

	.current-lang {
		margin-left: auto;
		font-size: 12px;
		color: var(--text-secondary);
	}

	/* 언어 선택 모달 */
	.lang-modal { width: 300px; }

	.lang-list {
		padding: 8px 0;
		max-height: 400px;
		overflow-y: auto;
	}

	.lang-option {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 20px;
		background: none;
		border: none;
		font-size: 14px;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}

	.lang-option:hover { background: var(--hover-bg); }

	.lang-selected { font-weight: 700; color: var(--sidebar-active, #1264a3); }

	.lang-check {
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--sidebar-active, #1264a3);
	}

	/* 닉네임 모달 */
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
		width: 340px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.2);
		overflow: hidden;
	}

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

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.modal-cancel {
		padding: 7px 14px;
		background: none;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.modal-cancel:hover { background: var(--hover-bg); color: var(--text-primary); }

	.modal-confirm {
		padding: 7px 16px;
		background: var(--sidebar-active, #1264a3);
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		cursor: pointer;
	}

	.modal-confirm:hover { filter: brightness(1.1); }

	.toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--text-secondary); cursor: pointer; user-select: none; }

	.ios-toggle {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 26px;
		flex-shrink: 0;
	}
	.ios-toggle input {
		opacity: 0;
		width: 0;
		height: 0;
		position: absolute;
	}
	.ios-toggle::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 13px;
		background: var(--border-color, #ccc);
		transition: background 0.2s;
	}
	.ios-toggle.on::before {
		background: var(--sidebar-active, #1264a3);
	}
	.toggle-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0,0,0,0.3);
		transition: transform 0.2s;
	}
	.ios-toggle.on .toggle-thumb {
		transform: translateX(18px);
	}

	.private-hint { font-size: 12px; color: var(--text-secondary); margin: -4px 0 0; }

	.profile-modal { width: 440px; }
	.avatar-edit-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
	.avatar-preview { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; }
	.avatar-preview-placeholder { width: 64px; height: 64px; border-radius: 10px; background: var(--sidebar-active); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
	.avatar-upload-btn { padding: 6px 12px; background: none; border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
	.avatar-upload-btn:hover { background: var(--hover-bg); }
	.form-field { display: flex; flex-direction: column; gap: 4px; }
	.field-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
	.modal-textarea { resize: vertical; font-family: inherit; min-height: 72px; }
</style>
