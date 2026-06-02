import { describe, expect, it } from 'vitest';
import {
  formatDriverLiveValue,
  summarizeTrackChipsForHeader,
} from './driverFocusedHeaderUtils';

describe('formatDriverLiveValue', () => {
  it('formats to three decimals', () => {
    expect(formatDriverLiveValue(0.7421)).toBe('0.742');
  });
});

describe('summarizeTrackChipsForHeader', () => {
  const row = (id: string, label: string) => ({
    id,
    label,
    kind: 'note' as const,
    noteCount: 1,
    regionCount: 0,
    enabled: true,
  });

  it('returns all labels when at most two tracks', () => {
    expect(
      summarizeTrackChipsForHeader([row('a', 'Drums'), row('b', 'Bass')])
    ).toEqual({
      chips: [
        { id: 'a', label: 'Drums' },
        { id: 'b', label: 'Bass' },
      ],
      overflowCount: 0,
    });
  });

  it('keeps distinct ids when labels repeat', () => {
    expect(
      summarizeTrackChipsForHeader([row('a', 'Piano'), row('b', 'Piano')])
    ).toEqual({
      chips: [
        { id: 'a', label: 'Piano' },
        { id: 'b', label: 'Piano' },
      ],
      overflowCount: 0,
    });
  });

  it('truncates with overflow count', () => {
    expect(
      summarizeTrackChipsForHeader([
        row('a', 'Drums'),
        row('b', 'Bass'),
        row('c', 'Keys'),
        row('d', 'Vox'),
      ])
    ).toEqual({
      chips: [
        { id: 'a', label: 'Drums' },
        { id: 'b', label: 'Bass' },
      ],
      overflowCount: 2,
    });
  });
});
