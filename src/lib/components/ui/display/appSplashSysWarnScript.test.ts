import { describe, expect, it } from 'vitest';

import {
  SHADERNOICE_CODENAME,
  SPLASH_AUTH_BOOT_MIDDLE_LINES,
  SPLASH_AUTH_BOOT_UPSTREAM_LINES,
  SPLASH_AUTH_PROMPT,
  SPLASH_BRIEF_BOOT_LINES,
  SPLASH_DISMISS_PROMPT,
  buildSplashAuthIntroSequence,
  buildSplashAuthMenuSequence,
  buildSplashBriefIntroSequence,
  buildSplashHandoffSequence,
  buildSplashOAuthReturnSequence,
  buildSplashSignInHandoffSequence,
  SPLASH_SIGNIN_HANDOFF_LINE,
  buildSplashReadyPromptSequence,
  buildSplashStaticLines,
  buildSplashSysWarnTypingSequence,
  buildSysWarnErrorSequence,
  buildSysWarnTypingSequence,
  pickSplashAuthBootLines,
  pickSplashTagline,
  SPLASH_AUTH_AWAIT_STATUS,
  SPLASH_AUTH_INTRO_PRELUDE_DELAY_MS,
  SPLASH_BOOT_STATUS,
  SPLASH_DISMISS_AWAIT_STATUS,
  SPLASH_HANDOFF_STATUS,
  SPLASH_OAUTH_RETURN_STATUS,
  SPLASH_SYS_WARN_PRELUDE_DELAY_MS,
  SPLASH_TAGLINES,
} from './appSplashSysWarnScript';

describe('buildSysWarnTypingSequence', () => {
  it('includes boot lines before the tagline', () => {
    const actions = buildSysWarnTypingSequence('Compile queue: still non-empty.');

    const bootChars = actions.filter(
      (action) => action.kind === 'char' && action.line.variant === 'boot',
    );

    expect(bootChars.length).toBeGreaterThan(0);
    expect(actions.some((action) => action.kind === 'complete')).toBe(true);
  });

  it('uses a longer prelude delay on the splash sequence', () => {
    const splash = buildSplashSysWarnTypingSequence('Compile queue: still non-empty.');
    const generic = buildSysWarnTypingSequence('Compile queue: still non-empty.');
    const splashPrelude = splash.find((action) => action.kind === 'delay');
    const genericPrelude = generic.find((action) => action.kind === 'delay');

    expect(splashPrelude).toEqual({ kind: 'delay', ms: SPLASH_SYS_WARN_PRELUDE_DELAY_MS });
    expect(genericPrelude).toEqual({ kind: 'delay', ms: 420 });
    expect(SPLASH_SYS_WARN_PRELUDE_DELAY_MS).toBeGreaterThan(420);
  });

  it('inserts a correction beat for Fries taglines', () => {
    const actions = buildSysWarnTypingSequence('Fries GPUs for breakfast.');

    let buffer = '';
    for (const action of actions) {
      if (action.kind === 'char' && action.line.variant === 'msg') {
        buffer += action.char;
      }
      if (action.kind === 'backspace' && action.line.variant === 'msg') {
        buffer = buffer.slice(0, -1);
      }
    }

    expect(buffer).toBe('Fries GPUs for breakfast.');
    expect(actions.some((action) => action.kind === 'backspace')).toBe(true);
  });

  it('appends an error line via the error sequence helper', () => {
    const actions = buildSysWarnErrorSequence('OAuth failed');
    const errorChars = actions
      .filter((action) => action.kind === 'char' && action.line.variant === 'error')
      .map((action) => (action.kind === 'char' ? action.char : ''))
      .join('');

    expect(errorChars).toBe('OAuth failed');
  });
});

describe('splash phased sequences', () => {
  it('exposes ShaderNoice codename and gamified status labels', () => {
    expect(SHADERNOICE_CODENAME).toBe('SHDR_N0ICE');
    expect(SPLASH_BOOT_STATUS).toBe('::boot');
    expect(SPLASH_AUTH_AWAIT_STATUS).toBe('::user.req');
    expect(SPLASH_DISMISS_AWAIT_STATUS).toBe('::user.req');
    expect(SPLASH_HANDOFF_STATUS).toBe('::xfer');
    expect(SPLASH_OAUTH_RETURN_STATUS).toBe('::linked');
    expect(SPLASH_AUTH_PROMPT).toBe('select session mode:');
    expect(SPLASH_DISMISS_PROMPT).toBe('click or Esc to continue');
  });

  it('auth intro types boot lines, the prompt, and menu options', () => {
    const bootLines = pickSplashAuthBootLines();
    const actions = buildSplashAuthIntroSequence(bootLines, {
      showSignIn: true,
      showGuest: true,
      signInLabel: 'Sign in',
    });
    const prelude = actions.find((action) => action.kind === 'delay');

    expect(prelude).toEqual({ kind: 'delay', ms: SPLASH_AUTH_INTRO_PRELUDE_DELAY_MS });
    expect(
      actions.some(
        (action) =>
          action.kind === 'char' &&
          action.line.variant === 'boot' &&
          action.pace === 'boot' &&
          bootLines.some((boot) => boot.text.includes(action.char)),
      ),
    ).toBe(true);
    expect(
      actions.some(
        (action) =>
          action.kind === 'char' && action.line.variant === 'prompt' && action.pace === 'boot',
      ),
    ).toBe(true);
    expect(
      actions.some(
        (action) => action.kind === 'char' && action.line.variant === 'menu' && action.pace === 'boot',
      ),
    ).toBe(true);
    expect(actions.some((action) => action.kind === 'complete')).toBe(true);
  });

  it('pickSplashAuthBootLines rotates middle and upstream pools', () => {
    const boot = pickSplashAuthBootLines();

    expect(boot).toHaveLength(3);
    expect(boot[0]?.text).toContain(SHADERNOICE_CODENAME);
    expect(SPLASH_AUTH_BOOT_MIDDLE_LINES).toContain(boot[1]?.text);
    expect(SPLASH_AUTH_BOOT_UPSTREAM_LINES).toContain(boot[2]?.text);
    expect(boot[2]?.text).toContain('audiotool.com');
  });

  it('brief intro types boot lines and the tagline', () => {
    const actions = buildSplashBriefIntroSequence('WebGPU requested. CPU nervous.');

    const bootChars = actions.filter(
      (action) => action.kind === 'char' && action.line.variant === 'boot',
    );
    const msgChars = actions.filter(
      (action) => action.kind === 'char' && action.line.variant === 'msg',
    );

    expect(bootChars.length).toBeGreaterThan(0);
    expect(msgChars.length).toBeGreaterThan(0);
  });

  it('ready prompt sequence types the dismiss prompt', () => {
    const actions = buildSplashReadyPromptSequence();
    const prompt = actions
      .filter((action) => action.kind === 'char' && action.line.variant === 'prompt')
      .map((action) => (action.kind === 'char' ? action.char : ''))
      .join('');

    expect(prompt).toBe(SPLASH_DISMISS_PROMPT);
    expect(
      actions.some(
        (action) => action.kind === 'char' && action.line.variant === 'prompt' && action.line.prefix === '>>>',
      ),
    ).toBe(true);
  });

  it('auth menu sequence types selectable options after the prompt', () => {
    const actions = buildSplashAuthMenuSequence({
      showSignIn: true,
      showGuest: true,
      signInLabel: 'Sign in',
    });

    const menuText = actions
      .filter((action) => action.kind === 'char' && action.line.variant === 'menu')
      .map((action) => (action.kind === 'char' ? action.char : ''))
      .join('');

    expect(menuText).toContain('[A] Connect to audiotool.com');
    expect(menuText).toContain('[G] Continue as guest');
    expect(actions.some((action) => action.kind === 'complete')).toBe(true);
  });

  it('handoff sequences cover guest and sign-in paths', () => {
    const guest = buildSplashHandoffSequence('guest', 'Fries GPUs for breakfast.');
    const signin = buildSplashSignInHandoffSequence();
    const signinViaHandoff = buildSplashHandoffSequence('signin', 'Fries GPUs for breakfast.');

    expect(guest.some((action) => action.kind === 'complete')).toBe(true);
    expect(signin.some((action) => action.kind === 'complete')).toBe(true);
    expect(signinViaHandoff).toEqual(signin);
    const handoffText = signin
      .filter((action) => action.kind === 'char')
      .map((action) => (action.kind === 'char' ? action.char : ''))
      .join('');
    expect(handoffText).toBe(SPLASH_SIGNIN_HANDOFF_LINE);
  });

  it('oauth return sequence types linked session lines', () => {
    const actions = buildSplashOAuthReturnSequence();
    const body = actions
      .filter((action) => action.kind === 'char')
      .map((action) => (action.kind === 'char' ? action.char : ''))
      .join('');

    expect(body).toContain('session linked');
    expect(body).toContain('token exchange');
    expect(body).toContain('loading editor assets');
    expect(actions.some((action) => action.kind === 'complete')).toBe(true);
  });

  it('builds static splash output per mode', () => {
    const auth = buildSplashStaticLines('Tagline', null, 'auth-intro', pickSplashAuthBootLines(), {
      showSignIn: true,
      showGuest: true,
      signInLabel: 'Sign in',
    });

    expect(auth.some((line) => line.variant === 'prompt')).toBe(true);
    expect(auth.some((line) => line.variant === 'menu' && line.menuAction === 'signin')).toBe(true);
    expect(auth.some((line) => line.text.includes(SHADERNOICE_CODENAME))).toBe(true);
    expect(auth.some((line) => line.text.includes('audiotool.com'))).toBe(true);

    const guest = buildSplashStaticLines('Tagline', null, 'handoff-guest');

    expect(guest.some((line) => line.text.includes('guest'))).toBe(true);

    const ready = buildSplashStaticLines('Tagline', null, 'brief-ready');

    expect(ready.some((line) => line.text === SPLASH_DISMISS_PROMPT)).toBe(true);
  });
});

describe('pickSplashTagline', () => {
  it('returns a known tagline', () => {
    expect(SPLASH_TAGLINES).toContain(pickSplashTagline());
  });
});
