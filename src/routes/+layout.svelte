<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { localeStore } from '$lib/stores/locale.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	onMount(() => { themeStore.init(); localeStore.init(); });
</script>

{#if data.missingEnv && data.missingEnv.length > 0}
	<div class="setup-page">
		<div class="card">
			<div class="icon">⚙️</div>
			<h1>환경 변수 설정이 필요합니다</h1>
			<p>프로젝트 루트의 <code>.env</code> 파일에 아래 값들을 설정하고 서버를 재시작해주세요.</p>

			<div class="env-list">
				{#each data.missingEnv as item}
					<div class="env-item">
						<div class="env-key">{item.label}</div>
						<div class="env-hint">{item.hint}</div>
					</div>
				{/each}
			</div>

			<div class="code-block">
				<div class="code-header">.env</div>
				<pre><code># 1. AUTH_SECRET 생성
AUTH_SECRET=$(openssl rand -base64 32)

# 2. Google Cloud Console에서 발급
#    https://console.cloud.google.com/apis/credentials
#    승인된 리디렉션 URI: http://localhost:5173/auth/callback/google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# 3. Cloudflare R2 (선택)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=tight-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev</code></pre>
			</div>

			<div class="steps">
				<div class="step">
					<span class="step-num">1</span>
					<span>.env.example 파일을 .env로 복사 → <code>cp .env.example .env</code></span>
				</div>
				<div class="step">
					<span class="step-num">2</span>
					<span>위 값들을 채워넣은 뒤 <code>npm run dev</code>를 다시 실행</span>
				</div>
				<div class="step">
					<span class="step-num">3</span>
					<span>Google Console에서 리디렉션 URI <code>http://localhost:5173/auth/callback/google</code> 추가</span>
				</div>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(:root) {
		--sidebar-bg: #1a1d21;
		--sidebar-text: #d1d2d3;
		--sidebar-text-muted: #9b9ea4;
		--sidebar-active: #1264a3;
		--sidebar-hover: #2c2f36;
		--sidebar-border: #2d3139;

		--main-bg: #ffffff;
		--text-primary: #1d1c1d;
		--text-secondary: #616061;
		--border-color: #e8e8e8;
		--hover-bg: #f8f8f8;
		--input-bg: #ffffff;
		--input-border: #c9cacc;
		--input-border-focus: #1264a3;
		--mention-bg: #e8f4fd;
		--mention-color: #1264a3;
		--link-color: #1264a3;
	}

	:global([data-theme='dark']) {
		--main-bg: #222529;
		--text-primary: #d1d2d3;
		--text-secondary: #9b9ea4;
		--border-color: #2d3139;
		--hover-bg: #2c2f36;
		--input-bg: #1a1d21;
		--input-border: #3d4148;
		--input-border-focus: #1264a3;
		--mention-bg: rgba(126,200,247,0.15);
		--mention-color: #7ec8f7;
		--link-color: #7ec8f7;
		--reply-count-bg: rgba(126,200,247,0.1);
		--reply-count-border: rgba(126,200,247,0.3);
		--reply-count-hover: rgba(126,200,247,0.18);
		--reply-count-color: #7ec8f7;
		--flash-bg: rgba(126, 200, 247, 0.18);
	}

	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
		height: 100vh;
		overflow: hidden;
		background: var(--main-bg);
		color: var(--text-primary);
	}

	/* 모바일 반응형: 모달 */
	@media (max-width: 768px) {
		:global(.modal-overlay) {
			align-items: flex-end !important;
			padding: 0 !important;
		}
		:global(.modal),
		:global(.profile-modal),
		:global(.members-modal),
		:global(.lang-modal) {
			width: 100% !important;
			max-width: 100% !important;
			border-radius: 16px 16px 0 0 !important;
			max-height: 90vh;
			overflow-y: auto;
		}
	}

	/* ── 환경변수 안내 화면 ── */
	.setup-page {
		min-height: 100vh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		background: #f4f5f7;
		padding: 40px 20px;
		overflow-y: auto;
		height: 100vh;
	}

	.card {
		background: #fff;
		border-radius: 12px;
		padding: 40px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
		width: 100%;
		max-width: 640px;
	}

	.icon { font-size: 40px; margin-bottom: 16px; }

	h1 { font-size: 22px; font-weight: 700; color: #1d1c1d; margin-bottom: 8px; }

	p { color: #616061; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }

	code {
		background: #f0f0f0;
		padding: 1px 5px;
		border-radius: 4px;
		font-family: 'Menlo', 'Monaco', monospace;
		font-size: 13px;
	}

	.env-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }

	.env-item {
		background: #fff8e1;
		border: 1px solid #ffe082;
		border-radius: 8px;
		padding: 12px 16px;
	}

	.env-key {
		font-family: 'Menlo', 'Monaco', monospace;
		font-size: 13px;
		font-weight: 700;
		color: #b45309;
		margin-bottom: 4px;
	}

	.env-hint { font-size: 13px; color: #616061; }

	.code-block { background: #1d1c1d; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }

	.code-header {
		background: #2d2c2d;
		padding: 8px 16px;
		font-size: 12px;
		color: #9b9ea4;
		font-family: 'Menlo', 'Monaco', monospace;
	}

	.code-block pre { padding: 16px; overflow-x: auto; }

	.code-block code {
		background: none;
		padding: 0;
		font-size: 12px;
		color: #d1d2d3;
		line-height: 1.7;
	}

	.steps { display: flex; flex-direction: column; gap: 10px; }

	.step {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		font-size: 14px;
		color: #1d1c1d;
		line-height: 1.5;
	}

	.step-num {
		background: #1264a3;
		color: #fff;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 700;
		flex-shrink: 0;
		margin-top: 1px;
	}
</style>
