import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AudioSetup } from '../../data-model/audioSetupTypes';
import { RuntimePlaybackHandler } from './RuntimePlaybackHandler';
import type { IAudioManager } from '../types';
import { SyntheticTransport } from '../timeline/SyntheticTransport';

function makeUploadSetup(filePath: string): AudioSetup {
  const fileId = 'file-upload-1';
  const file = { id: fileId, name: 't', filePath, autoPlay: false };
  return {
    files: [file],
    bands: [],
    remappers: [],
    primarySource: { type: 'upload', file },
  };
}

describe('RuntimePlaybackHandler', () => {
  const loadGates: Array<{ resolve: () => void; promise: Promise<void> }> = [];
  let audioManager: Pick<IAudioManager, 'getAudioNodeState' | 'loadAudioFile'>;
  let handler: RuntimePlaybackHandler;
  const setAudioSetupOnManager = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    loadGates.length = 0;
    audioManager = {
      getAudioNodeState: vi.fn(() => undefined),
      loadAudioFile: vi.fn(() => {
        let resolve!: () => void;
        const promise = new Promise<void>((r) => {
          resolve = r;
        });
        loadGates.push({ resolve, promise });
        return promise;
      }),
    };
    handler = new RuntimePlaybackHandler({
      audioManager: audioManager as unknown as IAudioManager,
      getCurrentAudioSetup: () => null,
      getCurrentGraph: () => null,
      getOnPlaylistAdvance: () => undefined,
      syntheticTransport: new SyntheticTransport(),
    });
  });

  it('drops stale upload load completion when a newer loadPrimary run supersedes it', async () => {
    const setup1 = makeUploadSetup('/a.mp3');
    const setup2 = makeUploadSetup('/b.mp3');
    const id = 'file-upload-1';

    void handler.loadPrimaryAndMaybePlay(id, setup1, false, setAudioSetupOnManager);
    void handler.loadPrimaryAndMaybePlay(id, setup2, false, setAudioSetupOnManager);

    expect(audioManager.loadAudioFile).toHaveBeenCalledTimes(2);
    expect(loadGates).toHaveLength(2);

    loadGates[0]!.resolve();
    await loadGates[0]!.promise;
    await Promise.resolve();

    expect(setAudioSetupOnManager).not.toHaveBeenCalled();

    loadGates[1]!.resolve();
    await loadGates[1]!.promise;
    await Promise.resolve();

    expect(setAudioSetupOnManager).toHaveBeenCalledTimes(1);
    expect(setAudioSetupOnManager).toHaveBeenCalledWith(setup2);
  });
});
