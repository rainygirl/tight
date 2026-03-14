<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

{#if sidebarStore.isOpen}
	<div class="sidebar-backdrop" onclick={sidebarStore.hide} role="presentation"></div>
{/if}

<div class="app-layout">
	<Sidebar
		workspace={data.workspace}
		channels={data.channels}
		dms={data.dms}
		user={data.user ?? {}}
		userId={data.userId ?? ''}
		members={data.members ?? []}
	/>
	<main class="main">
		{@render children()}
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--main-bg);
	}

	.sidebar-backdrop {
		display: none;
	}

	@media (max-width: 768px) {
		.sidebar-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 49;
		}
	}
</style>
