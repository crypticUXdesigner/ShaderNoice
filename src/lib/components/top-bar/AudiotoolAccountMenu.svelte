<script lang="ts">
  /**
   * Audiotool account: display name + optional avatar from UserService; user icon fallback.
   */
  import type { AudiotoolClient } from '@audiotool/nexus';
  import Button from '../ui/button/Button.svelte';
  import DropdownMenu from '../ui/menu/DropdownMenu.svelte';
  import MenuHeader from '../ui/menu/MenuHeader.svelte';
  import { IconSvg } from '../ui/icon';
  import type { AuthenticatedClient } from '@audiotool/nexus';
  import { fetchAudiotoolUserProfileFields } from '../../../utils/audiotoolUserAvatar';
  import { withAudiotoolUserSession } from '../../../utils/audiotoolSessionRpc';

  interface Props {
    userName: string;
    onLogout: () => void;
    /** When set, loads profile (`display_name`, `avatar_url`) via UserService for the OAuth session. */
    rpcClient?: AuthenticatedClient | null;
    /** OAuth bearer rejected by RPC (expired/revoked) — clearing session chrome + toast handled by App. */
    onAudiotoolSessionInvalidated?: () => void;
  }

  let { userName, onLogout, rpcClient = null, onAudiotoolSessionInvalidated }: Props = $props();

  let menuOpen = $state(false);
  let anchorEl = $state<HTMLDivElement | null>(null);
  let fetchedAvatarUrl = $state<string | null>(null);
  let fetchedDisplayName = $state<string | null>(null);
  let avatarImageFailed = $state(false);

  const showAvatarImage = $derived(Boolean(fetchedAvatarUrl) && !avatarImageFailed);
  /** Prefer API display name; fall back to OAuth handle until loaded. */
  const identityLabel = $derived.by(() => {
    const d = fetchedDisplayName?.trim();
    if (d) return d;
    return userName.trim();
  });

  $effect(() => {
    const c = rpcClient;
    const u = userName;
    fetchedAvatarUrl = null;
    fetchedDisplayName = null;
    avatarImageFailed = false;
    if (!c || !u.trim()) return;
    let ignore = false;
    void withAudiotoolUserSession(c, (client) => fetchAudiotoolUserProfileFields(client, u)).then((result) => {
      if (ignore) return;
      if (!result.ok) {
        if (result.reason === 'session_auth_failed') {
          onAudiotoolSessionInvalidated?.();
        }
        return;
      }
      const fields = result.value;
      if (fields.avatarUrl) fetchedAvatarUrl = fields.avatarUrl;
      if (fields.displayName) fetchedDisplayName = fields.displayName;
    });
    return () => {
      ignore = true;
    };
  });
</script>

<div class="audiotool-account">
  <div bind:this={anchorEl} class="audiotool-account__anchor">
    <Button
      variant="ghost"
      size="sm"
      mode="icon-only"
      rounded
      class="audiotool-account__trigger"
      title={identityLabel ? `Account (${identityLabel})` : 'Account'}
      aria-label={identityLabel ? `Account menu, ${identityLabel}` : 'Account menu'}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      onclick={() => (menuOpen = !menuOpen)}
    >
      <span class="audiotool-account__badge" aria-hidden="true">
        {#if showAvatarImage}
          <img
            class="audiotool-account__avatar-img"
            src={fetchedAvatarUrl!}
            alt=""
            loading="lazy"
            decoding="async"
            onerror={() => {
              avatarImageFailed = true;
            }}
          />
        {:else}
          <span class="audiotool-account__icon-wrap">
            <IconSvg name="user" variant="filled" class="audiotool-account__user-icon" />
          </span>
        {/if}
      </span>
    </Button>
  </div>
  <DropdownMenu
    open={menuOpen}
    anchor={anchorEl}
    openAbove={false}
    onClose={() => (menuOpen = false)}
    class="audiotool-account-dropdown"
  >
    {#snippet children()}
      <MenuHeader text="Connected to Audiotool" />
      <div class="audiotool-account__identity" title={identityLabel}>
        <div class="audiotool-account__identity-main">
          <span class="audiotool-account__identity-badge" aria-hidden="true">
            {#if showAvatarImage}
              <img
                class="audiotool-account__avatar-img audiotool-account__identity-avatar-img"
                src={fetchedAvatarUrl!}
                alt=""
                loading="lazy"
                decoding="async"
                onerror={() => {
                  avatarImageFailed = true;
                }}
              />
            {:else}
              <span class="audiotool-account__identity-icon-wrap">
                <IconSvg name="user" variant="filled" class="audiotool-account__identity-user-icon" />
              </span>
            {/if}
          </span>
          <span class="audiotool-account__identity-name">{identityLabel}</span>
        </div>
        <Button
          variant="warning"
          size="sm"
          mode="both"
          class="audiotool-account__sign-out"
          onclick={(e) => {
            e.stopPropagation();
            menuOpen = false;
            onLogout();
          }}
        >
          <IconSvg name="sign-out" />
          <span>Sign out</span>
        </Button>
      </div>
    {/snippet}
  </DropdownMenu>
</div>

<style>
  .audiotool-account {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .audiotool-account__anchor {
    display: flex;
  }

  /* Ghost account trigger: full-bleed avatar + ring/shadow accents on hover & active */
  /* Size: inherits `sm` icon-only → width `--size-md` (36px), height `--size-sm` (24px). */

  :global(button.audiotool-account__trigger.ghost:not(:disabled)) {
    padding: 0;
    overflow: hidden;
    border-radius: var(--radius-md);
    transition:
      box-shadow var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      background-color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing),
      color var(--motion-effects-fast-duration) var(--motion-effects-fast-easing);
  }

  :global(button.audiotool-account__trigger.ghost:not(:disabled):hover) {
    box-shadow:
      0 0 1px 0.5px var(--ghost-print-hover),
      0 1px 12px -4px var(--ghost-print-hover);
  }

  :global(button.audiotool-account__trigger.ghost:not(:disabled):active),
  :global(button.audiotool-account__trigger.ghost:not(:disabled).is-active) {
    box-shadow:
      0 0 1px 0.5px var(--ghost-print-active),
      inset 0 2px 12px -2px var(--ghost-print-active);
  }

  .audiotool-account__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: color-mix(in srgb, var(--color-violet-90) 35%, var(--color-gray-30));
    border: 1px solid color-mix(in srgb, var(--print-light) 12%, transparent);
    box-sizing: border-box;
  }

  .audiotool-account__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .audiotool-account__icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--print-light);
  }

  :global(.audiotool-account__user-icon) {
    font-size: var(--icon-size-sm);
  }

  /* Dropdown is portaled: scope menu-only rules under panel class */
  :global(.audiotool-account-dropdown .audiotool-account__identity) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pd-sm);
    padding: var(--pd-xs) var(--pd-md) var(--pd-md);
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  :global(.audiotool-account-dropdown .audiotool-account__identity-main) {
    display: flex;
    align-items: center;
    gap: var(--pd-md);
    min-width: 0;
    flex: 1;
  }

  :global(.audiotool-account-dropdown .audiotool-account__sign-out:not(:disabled)) {
    flex-shrink: 0;
  }

  :global(.audiotool-account-dropdown .audiotool-account__identity-badge) {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--print-light) 12%, transparent);
    box-sizing: border-box;
    background: color-mix(in srgb, var(--color-violet-90) 35%, var(--color-gray-30));
  }

  :global(.audiotool-account-dropdown .audiotool-account__identity-avatar-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.audiotool-account-dropdown .audiotool-account__identity-icon-wrap) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--print-light);
  }

  :global(.audiotool-account-dropdown .audiotool-account__identity-user-icon) {
    font-size: 1rem;
  }

  :global(.audiotool-account-dropdown .audiotool-account__identity-name) {
    font-size: var(--text-md);
    color: var(--print-highlight);
    font-weight: 500;
    min-width: 0;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
