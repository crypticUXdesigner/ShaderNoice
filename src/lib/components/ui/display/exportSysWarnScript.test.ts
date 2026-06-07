import { describe, expect, it } from 'vitest';
import {
  buildExportFocusLines,
  buildExportSysWarnTypingSequence,
  exportFocusStatusLabel,
  EXPORT_FOCUS_MESSAGES,
  pickExportFocusMessage,
} from './exportSysWarnScript';

describe('buildExportSysWarnTypingSequence', () => {
  it('includes export boot lines before the focus message', () => {
    const actions = buildExportSysWarnTypingSequence('Do not alt-tab. Audio will judder.');
    const bootChars = actions.filter(
      (action) => action.kind === 'char' && action.line.variant === 'boot',
    );
    expect(bootChars.length).toBeGreaterThan(0);
    expect(actions.some((action) => action.kind === 'complete')).toBe(true);
  });
});

describe('buildExportFocusLines', () => {
  it('includes boot trace and msg line', () => {
    const lines = buildExportFocusLines('Do not alt-tab. Audio will judder.');
    expect(lines).toHaveLength(3);
    expect(lines[0]?.variant).toBe('boot');
    expect(lines[2]).toEqual({
      prefix: 'msg>',
      text: 'Do not alt-tab. Audio will judder.',
      variant: 'msg',
    });
  });
});

describe('exportFocusStatusLabel', () => {
  it('maps progress to encode phases', () => {
    expect(exportFocusStatusLabel(undefined)).toBe('::hold');
    expect(exportFocusStatusLabel(0)).toBe('::hold');
    expect(exportFocusStatusLabel(0.5)).toBe('::encode');
    expect(exportFocusStatusLabel(0.95)).toBe('::mux');
  });
});

describe('pickExportFocusMessage', () => {
  it('returns a known message', () => {
    expect(EXPORT_FOCUS_MESSAGES).toContain(pickExportFocusMessage());
  });
});
