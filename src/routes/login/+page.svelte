<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { t } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="login-page">
	<div class="card">
		<div class="logo">💬</div>
		<h1>{t('login.welcome')}</h1>
		<p>{t('login.tagline')}</p>
		<button onclick={() => signIn('google', { redirectTo: '/' })} class="google-btn">
			<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
					fill="#4285F4"
				/>
				<path
					d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
					fill="#34A853"
				/>
				<path
					d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
					fill="#FBBC05"
				/>
				<path
					d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
					fill="#EA4335"
				/>
			</svg>
			{t('login.google')}
		</button>
		<div class="byline">
			<a href="https://rainygirl.com" target="_blank" rel="noopener noreferrer">Made by rainygirl</a>
			<a href="https://github.com/rainygirl/tight" target="_blank" rel="noopener noreferrer">github.com/rainygirl/tight</a>
		</div>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8f8f8;
	}

	.card {
		background: #fff;
		border-radius: 12px;
		padding: 48px 40px;
		text-align: center;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
		width: 100%;
		max-width: 400px;
	}

	.logo {
		font-size: 48px;
		margin-bottom: 16px;
	}

	h1 {
		font-size: 24px;
		font-weight: 700;
		color: #1d1c1d;
		margin-bottom: 8px;
	}

	p {
		color: #616061;
		font-size: 15px;
		margin-bottom: 32px;
	}

	.google-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 12px 20px;
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 600;
		color: #1d1c1d;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.google-btn:hover {
		background: #f8f8f8;
		border-color: #bbb;
	}

	.byline {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 20px;
	}

	.byline a {
		font-size: 12px;
		color: #aaa;
		text-decoration: none;
	}

	.byline a:hover {
		color: #888;
		text-decoration: underline;
	}
</style>
