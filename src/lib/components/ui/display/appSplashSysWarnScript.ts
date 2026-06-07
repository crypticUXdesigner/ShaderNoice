/** Codified runtime identity shown during splash boot. */

export const SHADERNOICE_CODENAME = 'SHDR_N0ICE';

/** Brief boot trace typed before the splash tagline. */

export const SPLASH_BOOT_LINES = [
  { prefix: '>', text: `identity: ${SHADERNOICE_CODENAME}.kernel` },
  { prefix: '>', text: 'stack: node-graph → glsl|wgsl' },
  { prefix: '>', text: 'probe: gpu.raster backends...' },
] as const;

/** Shorter boot set for click-to-dismiss intro (keeps total beat brief). */

export const SPLASH_BRIEF_BOOT_LINES = SPLASH_BOOT_LINES.slice(0, 2);

/** Auth splash middle boot lines — one picked per session. */

export const SPLASH_AUTH_BOOT_MIDDLE_LINES = [
  'node-graph compiler .. ready',
  'wgsl|glsl codegen ..... linked',
  'shader registry ...... loaded',
  'preset index ......... warm',
  'uniform buffers ...... armed',
] as const;

/** Auth splash upstream lines — audiotool.com only; one picked per session. */

export const SPLASH_AUTH_BOOT_UPSTREAM_LINES = [
  'audiotool.com .......... handshake',
  'audiotool.com .......... session pending',
  'audiotool.com OAuth .... awaiting link',
  'audiotool.com API ...... reachable',
] as const;

export interface SplashAuthBootLine {
  prefix: string;
  text: string;
}

const AUTH_BOOT_MIDDLE_IDX_KEY = 'shadernoice-splash-auth-boot-mid-idx';
const AUTH_BOOT_UPSTREAM_IDX_KEY = 'shadernoice-splash-auth-boot-up-idx';

function pickRotatingPoolItem<T>(storageKey: string, pool: readonly T[]): T {
  if (pool.length === 0) {
    throw new Error('pickRotatingPoolItem requires a non-empty pool');
  }

  if (typeof window === 'undefined') return pool[0];

  try {
    const raw = sessionStorage.getItem(storageKey);
    const last = raw != null ? Number.parseInt(raw, 10) : Number.NaN;
    const next = Number.isFinite(last)
      ? (last + 1) % pool.length
      : Math.floor(Math.random() * pool.length);
    sessionStorage.setItem(storageKey, String(next));
    return pool[next] ?? pool[0];
  } catch {
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  }
}

/** Auth boot trace for this session — init line fixed, middle/upstream rotate. */

export function pickSplashAuthBootLines(): readonly SplashAuthBootLine[] {
  return [
    { prefix: '[init]', text: `${SHADERNOICE_CODENAME}.kernel` },
    { prefix: '      ', text: pickRotatingPoolItem(AUTH_BOOT_MIDDLE_IDX_KEY, SPLASH_AUTH_BOOT_MIDDLE_LINES) },
    {
      prefix: '      ',
      text: pickRotatingPoolItem(AUTH_BOOT_UPSTREAM_IDX_KEY, SPLASH_AUTH_BOOT_UPSTREAM_LINES),
    },
  ];
}

export const SPLASH_TAGLINES = [
  'Fries GPUs for breakfast.',
  'Compile queue: still non-empty.',
  'WebGPU requested. CPU nervous.',
  'Uniform buffers armed. Vibes exported.',
] as const;

export const SPLASH_AUTH_PROMPT = 'select session mode:';

export const SPLASH_DISMISS_PROMPT = 'click or Esc to continue';

export const SPLASH_BOOT_STATUS = '::boot';

export const SPLASH_AUTH_AWAIT_STATUS = '::user.req';

export const SPLASH_DISMISS_AWAIT_STATUS = '::user.req';

export const SPLASH_HANDOFF_STATUS = '::xfer';

export const SPLASH_OAUTH_RETURN_STATUS = '::linked';

/** Set before OAuth redirect; consumed on return for splash part 3. */
export const SPLASH_OAUTH_HANDOFF_SESSION_KEY = 'shadernoice-splash-oauth-handoff';

/** Readable dwell after sign-in handoff lines finish (part 2). */
export const SPLASH_SIGNIN_HANDOFF_MIN_HOLD_MS = 1100;

export const SPLASH_SIGNIN_HANDOFF_LINE = 'opening audiotool.com for sign-in';

/** Readable dwell after OAuth return lines finish (part 3). */
export const SPLASH_OAUTH_RETURN_MIN_HOLD_MS = 2000;

export function markSplashOAuthHandoffPending(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SPLASH_OAUTH_HANDOFF_SESSION_KEY, 'pending');
  } catch {
    /* private browsing / quota */
  }
}

export function isSplashOAuthHandoffPending(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(SPLASH_OAUTH_HANDOFF_SESSION_KEY) === 'pending';
  } catch {
    return false;
  }
}

export function clearSplashOAuthHandoffPending(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SPLASH_OAUTH_HANDOFF_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

const TAGLINE_STORAGE_KEY = 'shadernoice-splash-tagline-idx';

export function pickSplashTagline(): string {
  if (typeof window === 'undefined') return SPLASH_TAGLINES[0];

  try {
    const raw = sessionStorage.getItem(TAGLINE_STORAGE_KEY);
    const last = raw != null ? Number.parseInt(raw, 10) : Number.NaN;
    const next = Number.isFinite(last)
      ? (last + 1) % SPLASH_TAGLINES.length
      : Math.floor(Math.random() * SPLASH_TAGLINES.length);
    sessionStorage.setItem(TAGLINE_STORAGE_KEY, String(next));
    return SPLASH_TAGLINES[next] ?? SPLASH_TAGLINES[0];
  } catch {
    return SPLASH_TAGLINES[Math.floor(Math.random() * SPLASH_TAGLINES.length)] ?? SPLASH_TAGLINES[0];
  }
}

export type SysWarnLineVariant = 'boot' | 'msg' | 'error' | 'prompt' | 'menu';

export type SysWarnMenuAction = 'signin' | 'guest';

export interface SysWarnDisplayLine {
  prefix: string;
  text: string;
  variant: SysWarnLineVariant;
  menuAction?: SysWarnMenuAction;
}

interface LineMeta {
  prefix: string;
  variant: SysWarnLineVariant;
  menuAction?: SysWarnMenuAction;
}

export type SysWarnTypingPace = 'default' | 'boot';

export type SysWarnTypingAction =
  | { kind: 'delay'; ms: number }
  | { kind: 'header' }
  | { kind: 'line'; line: SysWarnDisplayLine }
  | { kind: 'char'; char: string; line: LineMeta; pace?: SysWarnTypingPace }
  | { kind: 'backspace'; line: LineMeta }
  | { kind: 'lineBreak'; line: LineMeta }
  | { kind: 'complete' };

function pushChars(
  actions: SysWarnTypingAction[],
  text: string,
  line: LineMeta,
  pace: SysWarnTypingPace = 'default',
): void {
  for (const char of text) {
    actions.push({
      kind: 'char',
      char,
      line: {
        prefix: line.prefix,
        variant: line.variant,
        ...(line.menuAction != null ? { menuAction: line.menuAction } : {}),
      },
      ...(pace !== 'default' ? { pace } : {}),
    });
  }
}

export function splashAuthSignInMenuText(signInLabel: string): string {
  return signInLabel.toLowerCase().includes('retry')
    ? '[A] Retry connect to audiotool.com'
    : '[A] Connect to audiotool.com';
}

function pushMsgLine(actions: SysWarnTypingAction[], text: string): void {
  const line: LineMeta = { prefix: 'msg>', variant: 'msg' };

  if (text.startsWith('Fries')) {
    const rest = text.slice('Fries'.length);
    pushChars(actions, 'Fires', line);
    actions.push({ kind: 'delay', ms: 195 });
    for (let i = 0; i < 4; i++) {
      actions.push({ kind: 'backspace', line });
    }
    pushChars(actions, `ries${rest}`, line);
    return;
  }

  pushChars(actions, text, line);
}

function pushBootLines(
  actions: SysWarnTypingAction[],
  bootLines: readonly { prefix: string; text: string }[],
  lineDelayMs = 68,
  pace: SysWarnTypingPace = 'default',
): void {
  for (const boot of bootLines) {
    const line: LineMeta = { prefix: boot.prefix, variant: 'boot' };
    pushChars(actions, boot.text, line, pace);
    actions.push({ kind: 'lineBreak', line });
    actions.push({ kind: 'delay', ms: lineDelayMs });
  }
}

/** Hold before the splash sys-warn panel enters (logo/title beat). */

export const SPLASH_SYS_WARN_PRELUDE_DELAY_MS = 900;

/** Fast prelude for auth intro — boot typing starts quickly but still reads as a sequence. */

export const SPLASH_AUTH_INTRO_PRELUDE_DELAY_MS = 100;

/** Pause between auth boot lines while characters stream in. */

export const SPLASH_AUTH_BOOT_LINE_DELAY_MS = 48;

const DEFAULT_SYS_WARN_PRELUDE_DELAY_MS = 420;

/** Short settle after intro completes (before transition typing). */

export const SPLASH_INTRO_SETTLE_MS = 75;

/** Imperative typing sequence for the tagline (error lines append separately at runtime). */

export function buildSysWarnTypingSequence(
  tagline: string,
  bootLines: readonly { prefix: string; text: string }[] = SPLASH_BOOT_LINES,
  preludeDelayMs = DEFAULT_SYS_WARN_PRELUDE_DELAY_MS,
): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [
    { kind: 'delay', ms: preludeDelayMs },
    { kind: 'header' },
    { kind: 'delay', ms: 480 },
  ];

  pushBootLines(actions, bootLines, 160);
  actions.push({ kind: 'delay', ms: 280 });
  pushMsgLine(actions, tagline);
  actions.push({ kind: 'lineBreak', line: { prefix: 'msg>', variant: 'msg' } });
  actions.push({ kind: 'complete' });
  return actions;
}

export function buildSplashSysWarnTypingSequence(tagline: string): SysWarnTypingAction[] {
  return buildSysWarnTypingSequence(tagline, SPLASH_BOOT_LINES, SPLASH_SYS_WARN_PRELUDE_DELAY_MS);
}

/** Brief splash intro for click-to-dismiss (no auth gate). */

export function buildSplashBriefIntroSequence(tagline: string): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [
    { kind: 'delay', ms: 125 },
    { kind: 'header' },
    { kind: 'delay', ms: 62 },
  ];

  pushBootLines(actions, SPLASH_BRIEF_BOOT_LINES, 58);
  actions.push({ kind: 'delay', ms: 110 });
  pushMsgLine(actions, tagline);
  actions.push({ kind: 'lineBreak', line: { prefix: 'msg>', variant: 'msg' } });
  actions.push({ kind: 'complete' });
  return actions;
}

/** Prompt line once the editor is ready and the splash awaits a click. */

export function buildSplashReadyPromptSequence(): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [{ kind: 'delay', ms: 110 }];
  const promptLine: LineMeta = { prefix: '>>>', variant: 'prompt' };
  pushChars(actions, SPLASH_DISMISS_PROMPT, promptLine, 'boot');
  actions.push({ kind: 'lineBreak', line: promptLine });
  actions.push({ kind: 'complete' });
  return actions;
}

export interface SplashAuthMenuOptions {
  showSignIn: boolean;
  showGuest: boolean;
  signInLabel: string;
}

function pushAuthMenuLines(
  actions: SysWarnTypingAction[],
  menu: SplashAuthMenuOptions | undefined,
  preludeDelayMs = 110,
): void {
  if (!menu || (!menu.showSignIn && !menu.showGuest)) return;

  actions.push({ kind: 'delay', ms: preludeDelayMs });

  if (menu.showSignIn) {
    const signInLine: LineMeta = { prefix: '      ', variant: 'menu', menuAction: 'signin' };
    pushChars(actions, splashAuthSignInMenuText(menu.signInLabel), signInLine, 'boot');
    actions.push({ kind: 'lineBreak', line: signInLine });
    actions.push({ kind: 'delay', ms: 72 });
  }

  if (menu.showGuest) {
    const guestLine: LineMeta = { prefix: '      ', variant: 'menu', menuAction: 'guest' };
    pushChars(actions, '[G] Continue as guest', guestLine, 'boot');
    actions.push({ kind: 'lineBreak', line: guestLine });
  }
}

/** Type selectable session options after the auth prompt settles. */
export function buildSplashAuthMenuSequence(options: SplashAuthMenuOptions): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [{ kind: 'delay', ms: 135 }];
  pushAuthMenuLines(actions, options, 0);
  actions.push({ kind: 'complete' });
  return actions;
}

/** Fast auth intro: typed boot trace, typed prompt, then command options. */

export function buildSplashAuthIntroSequence(
  bootLines: readonly SplashAuthBootLine[] = pickSplashAuthBootLines(),
  menu?: SplashAuthMenuOptions,
): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [
    { kind: 'delay', ms: SPLASH_AUTH_INTRO_PRELUDE_DELAY_MS },
    { kind: 'header' },
    { kind: 'delay', ms: 52 },
  ];

  pushBootLines(actions, bootLines, SPLASH_AUTH_BOOT_LINE_DELAY_MS, 'boot');
  actions.push({ kind: 'delay', ms: 68 });

  const promptLine: LineMeta = { prefix: '>>>', variant: 'prompt' };
  pushChars(actions, SPLASH_AUTH_PROMPT, promptLine, 'boot');
  actions.push({ kind: 'lineBreak', line: promptLine });
  pushAuthMenuLines(actions, menu);
  actions.push({ kind: 'complete' });
  return actions;
}

export type SplashHandoffKind = 'guest' | 'signin';

/** Part 2 — user chose Audiotool sign-in; hold before browser redirect. */
export function buildSplashSignInHandoffSequence(): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [{ kind: 'delay', ms: 60 }];
  const prompt: LineMeta = { prefix: '>>>', variant: 'prompt' };
  pushChars(actions, SPLASH_SIGNIN_HANDOFF_LINE, prompt, 'boot');
  actions.push({ kind: 'lineBreak', line: prompt });
  actions.push({ kind: 'complete' });
  return actions;
}

/** Part 3 — OAuth callback landed with a linked session. */
export function buildSplashOAuthReturnSequence(): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [
    { kind: 'delay', ms: 100 },
    { kind: 'header' },
    { kind: 'delay', ms: 55 },
  ];

  const linked: LineMeta = { prefix: '[link]', variant: 'boot' };
  pushChars(actions, 'audiotool.com .......... session linked', linked, 'boot');
  actions.push({ kind: 'lineBreak', line: linked });
  actions.push({ kind: 'delay', ms: SPLASH_AUTH_BOOT_LINE_DELAY_MS });

  const token: LineMeta = { prefix: '      ', variant: 'boot' };
  pushChars(actions, 'token exchange ......... complete', token, 'boot');
  actions.push({ kind: 'lineBreak', line: token });
  actions.push({ kind: 'delay', ms: SPLASH_AUTH_BOOT_LINE_DELAY_MS });

  const load: LineMeta = { prefix: '>>>', variant: 'prompt' };
  pushChars(actions, 'loading editor assets', load, 'boot');
  actions.push({ kind: 'lineBreak', line: load });
  actions.push({ kind: 'complete' });
  return actions;
}

/** Post-click transition lines while the app handoff runs. */

export function buildSplashHandoffSequence(kind: SplashHandoffKind, tagline: string): SysWarnTypingAction[] {
  if (kind === 'signin') {
    return buildSplashSignInHandoffSequence();
  }

  const actions: SysWarnTypingAction[] = [{ kind: 'delay', ms: 85 }];
  const guest: LineMeta = { prefix: '[mode]', variant: 'boot' };
  pushChars(actions, 'guest — local session only', guest);
  actions.push({ kind: 'lineBreak', line: guest });
  const load: LineMeta = { prefix: '      ', variant: 'boot' };
  pushChars(actions, 'loading node-graph + preset registry...', load);
  actions.push({ kind: 'lineBreak', line: load });
  actions.push({ kind: 'delay', ms: 68 });
  pushMsgLine(actions, tagline);
  actions.push({ kind: 'lineBreak', line: { prefix: 'msg>', variant: 'msg' } });
  pushBootLines(actions, [SPLASH_BOOT_LINES[2]], 50);

  actions.push({ kind: 'complete' });
  return actions;
}

export function buildSplashStaticLines(
  tagline: string,
  errorText?: string | null,
  mode:
    | 'auth-intro'
    | 'brief'
    | 'brief-ready'
    | 'handoff-guest'
    | 'handoff-signin'
    | 'oauth-return' = 'brief',
  authBootLines: readonly SplashAuthBootLine[] = pickSplashAuthBootLines(),
  authMenu?: SplashAuthMenuOptions,
): SysWarnDisplayLine[] {
  const lines: SysWarnDisplayLine[] = [];

  if (mode === 'auth-intro') {
    lines.push(
      ...authBootLines.map((boot) => ({
        prefix: boot.prefix,
        text: boot.text,
        variant: 'boot' as const,
      })),
      { prefix: '>>>', text: SPLASH_AUTH_PROMPT, variant: 'prompt' },
    );
    if (authMenu?.showSignIn) {
      lines.push({
        prefix: '      ',
        text: splashAuthSignInMenuText(authMenu.signInLabel),
        variant: 'menu',
        menuAction: 'signin',
      });
    }
    if (authMenu?.showGuest) {
      lines.push({
        prefix: '      ',
        text: '[G] Continue as guest',
        variant: 'menu',
        menuAction: 'guest',
      });
    }
  } else if (mode === 'brief') {
    lines.push(
      ...SPLASH_BRIEF_BOOT_LINES.map((boot) => ({
        prefix: boot.prefix,
        text: boot.text,
        variant: 'boot' as const,
      })),
      { prefix: 'msg>', text: tagline, variant: 'msg' },
    );
  } else if (mode === 'brief-ready') {
    lines.push(
      ...SPLASH_BRIEF_BOOT_LINES.map((boot) => ({
        prefix: boot.prefix,
        text: boot.text,
        variant: 'boot' as const,
      })),
      { prefix: 'msg>', text: tagline, variant: 'msg' },
      { prefix: '>>>', text: SPLASH_DISMISS_PROMPT, variant: 'prompt' },
    );
  } else if (mode === 'handoff-signin') {
    lines.push({ prefix: '>>>', text: SPLASH_SIGNIN_HANDOFF_LINE, variant: 'prompt' });
  } else if (mode === 'oauth-return') {
    lines.push(
      { prefix: '[link]', text: 'audiotool.com .......... session linked', variant: 'boot' },
      { prefix: '      ', text: 'token exchange ......... complete', variant: 'boot' },
      { prefix: '>>>', text: 'loading editor assets', variant: 'prompt' },
    );
  } else {
    lines.push(
      { prefix: '[mode]', text: 'guest — local session only', variant: 'boot' },
      { prefix: '      ', text: 'loading node-graph + preset registry...', variant: 'boot' },
      { prefix: 'msg>', text: tagline, variant: 'msg' },
      {
        prefix: SPLASH_BOOT_LINES[2].prefix,
        text: SPLASH_BOOT_LINES[2].text,
        variant: 'boot' as const,
      },
    );
  }

  const trimmed = errorText?.trim();
  if (trimmed) {
    lines.push({ prefix: '[ERR]', text: trimmed, variant: 'error' });
  }

  return lines;
}

export function buildSysWarnErrorSequence(errorText: string): SysWarnTypingAction[] {
  const actions: SysWarnTypingAction[] = [{ kind: 'delay', ms: 170 }];
  const errLine: LineMeta = { prefix: '[ERR]', variant: 'error' };
  pushChars(actions, errorText, errLine);
  actions.push({ kind: 'lineBreak', line: errLine });
  actions.push({ kind: 'complete' });
  return actions;
}

export function charTypingDelay(
  char: string,
  rush: boolean,
  pace: SysWarnTypingPace = 'default',
): number {
  let delay = 18 + Math.random() * 24;
  if (char === ' ') delay = 34 + Math.random() * 26;
  if (char === ',' || char === ';') delay = 90 + Math.random() * 50;
  if (char === '.' || char === '!' || char === '?') delay = 140 + Math.random() * 75;
  if (char === ':') delay = 58 + Math.random() * 32;

  if (pace === 'boot' && !rush) {
    delay = Math.max(10, Math.round(delay * 0.45));
  }

  if (rush) return Math.max(8, Math.round(delay * 0.22));
  return delay;
}

export function actionDelay(ms: number, rush: boolean): number {
  if (rush) return Math.max(12, Math.round(ms * 0.25));
  return ms;
}
