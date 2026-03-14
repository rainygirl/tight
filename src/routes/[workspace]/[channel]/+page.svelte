<script lang="ts">
	import ChatView from '$lib/components/ChatView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ChatView
	channelId={data.channel.id}
	channelName={data.channel.name}
	initialMessages={data.initialMessages}
	userId={data.userId}
	members={data.members}
	channels={data.channels}
	workspaceSlug={data.workspace.slug}
	channelIsPrivate={data.channel.isPrivate}
	channelIsOwner={data.channel.isOwner}
/>
