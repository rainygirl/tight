<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import ChatView from '$lib/components/ChatView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 레이아웃 load는 페이지 load보다 먼저 실행되므로,
	// DM 채널이 이 페이지에서 새로 생성됐을 때 사이드바 DM 목록에 반영되지 않는다.
	// 마운트 후 invalidateAll()로 레이아웃을 재실행해 DM 목록을 최신화한다.
	onMount(() => { invalidateAll(); });
</script>

<ChatView
	channelId={data.channel.id}
	channelName={data.otherUser.name}
	isDm={true}
	otherUser={data.otherUser}
	initialMessages={data.initialMessages}
	userId={data.userId}
	members={data.members ?? []}
	channels={data.channels ?? []}
	workspaceSlug={data.workspace.slug}
	uploadDisabled={data.uploadDisabled}
/>
