<script lang="ts">
  import { t } from '$lib/i18n';

  let {
    userId,
    onClose,
    workspaceSlug = '',
    currentUserId = '',
  }: {
    userId: string;
    onClose: () => void;
    workspaceSlug?: string;
    currentUserId?: string;
  } = $props();

  interface Profile {
    id: string; name: string; email: string; avatarUrl: string | null;
    bio: string | null; roleTitle: string | null; phone: string | null;
  }

  let profile = $state<Profile | null>(null);
  let loading = $state(true);

  $effect(() => {
    userId; // track
    loading = true;
    fetch(`/api/users/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { profile = d; loading = false; });
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="overlay" onclick={onClose} role="presentation">
  <div class="card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    {#if loading || !profile}
      <div class="loading">···</div>
    {:else}
      <button class="close-btn" onclick={onClose}>✕</button>
      <!-- Avatar + name -->
      <div class="card-header">
        {#if profile.avatarUrl}
          <img src={profile.avatarUrl} alt={profile.name} class="avatar" />
        {:else}
          <div class="avatar-placeholder">{profile.name[0].toUpperCase()}</div>
        {/if}
        <div class="name-area">
          <div class="name">{profile.name}</div>
          {#if profile.roleTitle}
            <div class="role-title">{profile.roleTitle}</div>
          {/if}
        </div>
      </div>
      <!-- Fields -->
      <div class="fields">
        {#if profile.bio}
          <div class="field">
            <div class="field-label">{t('profile.bio')}</div>
            <div class="field-value">{profile.bio}</div>
          </div>
        {/if}
        {#if profile.phone}
          <div class="field">
            <div class="field-label">{t('profile.phone')}</div>
            <div class="field-value">{profile.phone}</div>
          </div>
        {/if}
        <div class="field">
          <div class="field-label">{t('profile.email')}</div>
          <div class="field-value">{profile.email}</div>
        </div>
      </div>
      <!-- DM button (only for other users) -->
      {#if currentUserId && userId !== currentUserId && workspaceSlug}
        <div class="card-footer">
          <a class="dm-btn" href="/{workspaceSlug}/dm/{userId}" onclick={onClose}>
            {t('profile.sendDm')}
          </a>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1500;
  }
  .card {
    background: var(--main-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    width: 340px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    position: relative;
  }
  .loading { text-align: center; color: var(--text-secondary); padding: 32px; }
  .close-btn {
    position: absolute;
    top: 12px; right: 14px;
    background: none; border: none;
    font-size: 14px; color: var(--text-secondary);
    cursor: pointer; padding: 4px 6px; border-radius: 4px;
  }
  .close-btn:hover { background: var(--hover-bg); color: var(--text-primary); }
  .card-header {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 20px;
  }
  .avatar {
    width: 56px; height: 56px;
    border-radius: 10px; object-fit: cover; flex-shrink: 0;
  }
  .avatar-placeholder {
    width: 56px; height: 56px;
    border-radius: 10px;
    background: var(--sidebar-active);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700; flex-shrink: 0;
  }
  .name { font-size: 17px; font-weight: 700; color: var(--text-primary); }
  .role-title { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
  .fields { display: flex; flex-direction: column; gap: 12px; }
  .field {}
  .field-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .field-value { font-size: 14px; color: var(--text-primary); word-break: break-all; }
  .card-footer { margin-top: 20px; }
  .dm-btn {
    display: block; text-align: center;
    background: var(--sidebar-active); color: #fff;
    border-radius: 6px; padding: 9px 0;
    font-size: 14px; font-weight: 600;
    text-decoration: none;
  }
  .dm-btn:hover { filter: brightness(1.1); }
</style>
