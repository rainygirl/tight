<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="setup-page">
	<div class="card">
		<div class="logo">💬</div>
		<h1>{t('setup.title')}</h1>
		<p>{t('setup.desc')}</p>

		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<form method="POST" use:enhance>
			<div class="field">
				<label for="name">{t('setup.label')}</label>
				<input
					id="name"
					name="name"
					type="text"
					placeholder={t('setup.placeholder')}
					required
					minlength="2"
				/>
			</div>
			<button type="submit" class="submit-btn">{t('setup.submit')}</button>
		</form>
	</div>
</div>

<style>
	.setup-page {
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

	.error {
		background: #fdecea;
		color: #c0392b;
		border-radius: 6px;
		padding: 10px 14px;
		margin-bottom: 16px;
		font-size: 14px;
	}

	.field {
		text-align: left;
		margin-bottom: 16px;
	}

	label {
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: #1d1c1d;
		margin-bottom: 6px;
	}

	input {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 15px;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: #1264a3;
		box-shadow: 0 0 0 3px rgba(18, 100, 163, 0.15);
	}

	.submit-btn {
		width: 100%;
		padding: 12px;
		background: #007a5a;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.submit-btn:hover {
		background: #006044;
	}
</style>
