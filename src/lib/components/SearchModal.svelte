<script lang="ts">
	import { goto } from '$app/navigation';
	import { flashStore } from '$lib/stores/flash.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { t } from '$lib/i18n';

	let {
		workspaceId,
		workspaceSlug,
		onClose
	}: {
		workspaceId: string;
		workspaceSlug: string;
		onClose: () => void;
	} = $props();

	interface SearchResult {
		id: string;
		body: string;
		channelId: string;
		channelName: string;
		channelIsDm: boolean;
		authorName: string;
		authorAvatar: string | null;
		createdAt: string | null;
	}

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let selectedIndex = $state(-1);
	let inputEl: HTMLInputElement;
	let listEl: HTMLDivElement;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function previewText(body: string): string {
		return body
			.replace(/@\[([^:\]]+):([^\]]+)\]/g, '@$2')
			.replace(/#\[([^:\]]+):([^\]]+)\]/g, '#$2')
			.replace(/\*\*(.+?)\*\*/g, '$1')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.trim();
	}

	function formatTime(createdAt: string | null): string {
		if (!createdAt) return '';
		const d = new Date(createdAt);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
		if (diffDays === 0) {
			return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		} else if (diffDays < 7) {
			return d.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	async function doSearch(q: string) {
		if (!q.trim()) { results = []; loading = false; return; }
		loading = true;
		try {
			const res = await fetch(`/api/search?workspaceId=${workspaceId}&q=${encodeURIComponent(q)}`);
			if (res.ok) {
				results = await res.json();
				selectedIndex = results.length > 0 ? 0 : -1;
			}
		} finally {
			loading = false;
		}
	}

	function onInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		selectedIndex = -1;
		const q = query;
		if (!q.trim()) { results = []; loading = false; return; }
		loading = true;
		debounceTimer = setTimeout(() => doSearch(q), 280);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { onClose(); return; }
		if (results.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % results.length;
			scrollToSelected();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + results.length) % results.length;
			scrollToSelected();
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			selectResult(results[selectedIndex]);
		}
	}

	function scrollToSelected() {
		requestAnimationFrame(() => {
			const el = listEl?.querySelector(`[data-idx="${selectedIndex}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	function selectResult(result: SearchResult) {
		flashStore.flash(result.id);
		sidebarStore.hide();
		onClose();
		goto(`/${workspaceSlug}/${result.channelId}`);
	}

	function mountInput(el: HTMLInputElement) {
		el.focus();
	}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} />

<div class="search-overlay" onclick={onClose} role="presentation">
	<div class="search-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('search.title')}>
		<!-- 검색 입력 -->
		<div class="search-header">
			<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
			</svg>
			<input
				class="search-main-input"
				placeholder={t('search.title') + '...'}
				bind:this={inputEl}
				bind:value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				use:mountInput
				autocomplete="off"
				spellcheck="false"
			/>
			{#if query && !loading}
				<button class="search-clear-btn" onclick={() => { query = ''; results = []; selectedIndex = -1; inputEl?.focus(); }}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			{/if}
			{#if loading}
				<div class="search-spinner"></div>
			{/if}
			<kbd class="esc-hint">ESC</kbd>
		</div>

		<!-- 결과 영역 -->
		<div class="search-body" bind:this={listEl}>
			{#if !query.trim()}
				<div class="search-empty-state">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary)">
						<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
					</svg>
					<p>{t('search.hint')}</p>
				</div>
			{:else if !loading && results.length === 0}
				<div class="search-empty-state">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary)">
						<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
					</svg>
					<p>{t('search.noResults', { query })}</p>
				</div>
			{:else if results.length > 0}
				<div class="results-header">
					<span>{t('search.results', { count: String(results.length) })}</span>
					<span class="nav-hint"><kbd>↑</kbd><kbd>↓</kbd> {t('search.navMove')} <kbd>↵</kbd> {t('search.navSelect')}</span>
				</div>
				{#each results as result, i}
					<button
						class="result-item"
						class:selected={i === selectedIndex}
						data-idx={i}
						onclick={() => selectResult(result)}
						onmouseenter={() => selectedIndex = i}
					>
						<div class="result-channel-badge">
							<span class="channel-prefix">{result.channelIsDm ? '@' : '#'}</span>
							<span class="channel-name">{result.channelName}</span>
						</div>
						<div class="result-content">
							<div class="result-meta">
								{#if result.authorAvatar}
									<img src={result.authorAvatar} alt={result.authorName} class="result-avatar" />
								{:else}
									<div class="result-avatar-ph">{result.authorName[0]?.toUpperCase()}</div>
								{/if}
								<span class="result-author">{result.authorName}</span>
								<span class="result-time">{formatTime(result.createdAt)}</span>
							</div>
							<div class="result-body">{previewText(result.body)}</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.search-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		z-index: 2000;
		padding-top: 80px;
		animation: overlay-in 0.12s ease;
	}

	@keyframes overlay-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	.search-modal {
		width: 100%;
		max-width: 640px;
		background: var(--main-bg);
		border: 1px solid var(--border-color);
		border-radius: 14px;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 120px);
		animation: modal-in 0.15s ease;
		margin: 0 16px;
	}

	@keyframes modal-in {
		from { opacity: 0; transform: translateY(-12px) scale(0.98); }
		to   { opacity: 1; transform: none; }
	}

	/* 검색 입력 영역 */
	.search-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color);
	}

	.search-icon {
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.search-main-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 17px;
		color: var(--text-primary);
		outline: none;
		min-width: 0;
		caret-color: var(--sidebar-active);
	}

	.search-main-input::placeholder {
		color: var(--text-secondary);
		opacity: 0.7;
	}

	.search-clear-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		transition: color 0.1s;
	}

	.search-clear-btn:hover { color: var(--text-primary); }

	.search-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color);
		border-top-color: var(--sidebar-active);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.esc-hint {
		background: var(--hover-bg);
		border: 1px solid var(--border-color);
		border-radius: 4px;
		padding: 2px 6px;
		font-size: 11px;
		color: var(--text-secondary);
		font-family: inherit;
		flex-shrink: 0;
		cursor: pointer;
	}

	/* 결과 영역 */
	.search-body {
		overflow-y: auto;
		flex: 1;
		min-height: 120px;
	}

	.search-empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 20px;
		color: var(--text-secondary);
	}

	.search-empty-state p {
		font-size: 14px;
		color: var(--text-secondary);
		margin: 0;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px 6px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.nav-hint {
		display: flex;
		align-items: center;
		gap: 4px;
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
	}

	.nav-hint kbd,
	.esc-hint {
		background: var(--hover-bg);
		border: 1px solid var(--border-color);
		border-radius: 4px;
		padding: 1px 5px;
		font-size: 11px;
		color: var(--text-secondary);
		font-family: inherit;
	}

	/* 결과 아이템 */
	.result-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		width: 100%;
		padding: 10px 20px;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: background 0.08s;
		border-top: 1px solid transparent;
		border-bottom: 1px solid var(--border-color);
	}

	.result-item:last-child {
		border-bottom: none;
	}

	.result-item:hover,
	.result-item.selected {
		background: var(--hover-bg);
	}

	.result-item.selected {
		border-top-color: var(--border-color);
		border-bottom-color: var(--border-color);
	}

	.result-channel-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		min-width: 52px;
		padding-top: 2px;
		flex-shrink: 0;
	}

	.channel-prefix {
		font-size: 16px;
		font-weight: 700;
		color: var(--sidebar-active);
		line-height: 1;
	}

	.channel-name {
		font-size: 10px;
		color: var(--text-secondary);
		max-width: 52px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
	}

	.result-content {
		flex: 1;
		min-width: 0;
	}

	.result-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}

	.result-avatar {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.result-avatar-ph {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		background: var(--sidebar-active);
		color: #fff;
		font-size: 10px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.result-author {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.result-time {
		font-size: 11px;
		color: var(--text-secondary);
		margin-left: auto;
	}

	.result-body {
		font-size: 14px;
		color: var(--text-primary);
		line-height: 1.5;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	@media (max-width: 768px) {
		.search-overlay { padding-top: 0; align-items: flex-end; }
		.search-modal {
			max-height: 80vh;
			border-radius: 16px 16px 0 0;
			margin: 0;
		}
	}
</style>
