import { describe, expect, it, vi } from 'vitest';
import {
  waitForWebGlExportCommands,
  waitForWebGlExportCommandsAsync,
  WEBGL_EXPORT_SYNC_TIMEOUT_NS,
} from './waitForWebGlExportCommands';

type SyncObject = { __brand: 'WebGLSync' };

function createMockGl(overrides: Partial<WebGL2RenderingContext> = {}): WebGL2RenderingContext {
  const sync = { __brand: 'WebGLSync' } as SyncObject;
  const mock = {
    SYNC_GPU_COMMANDS_COMPLETE: 0x9117,
    SYNC_FLUSH_COMMANDS_BIT: 0x0001,
    ALREADY_SIGNALED: 0x911a,
    TIMEOUT_EXPIRED: 0x911b,
    CONDITION_SATISFIED: 0x911c,
    WAIT_FAILED: 0x911d,
    fenceSync: vi.fn(() => sync),
    clientWaitSync: vi.fn(() => 0x911c), // CONDITION_SATISFIED
    deleteSync: vi.fn(),
    flush: vi.fn(),
    finish: vi.fn(),
    ...overrides,
  };
  return mock as unknown as WebGL2RenderingContext;
}

describe('waitForWebGlExportCommands', () => {
  it('uses fence + clientWaitSync and does not call finish when signaled', () => {
    const gl = createMockGl();
    const result = waitForWebGlExportCommands(gl);

    expect(result).toEqual({ method: 'fence' });
    expect(gl.fenceSync).toHaveBeenCalledWith(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    expect(gl.flush).toHaveBeenCalledOnce();
    expect(gl.clientWaitSync).toHaveBeenCalledWith(
      expect.anything(),
      gl.SYNC_FLUSH_COMMANDS_BIT,
      WEBGL_EXPORT_SYNC_TIMEOUT_NS
    );
    expect(gl.deleteSync).toHaveBeenCalledOnce();
    expect(gl.finish).not.toHaveBeenCalled();
  });

  it('falls back to finish when fenceSync returns null', () => {
    const gl = createMockGl({ fenceSync: vi.fn(() => null) } as Partial<WebGL2RenderingContext>);
    const result = waitForWebGlExportCommands(gl);

    expect(result).toEqual({ method: 'finish', fallbackReason: 'no-fence' });
    expect(gl.finish).toHaveBeenCalledOnce();
    expect(gl.clientWaitSync).not.toHaveBeenCalled();
  });

  it('falls back to finish on WAIT_FAILED', () => {
    const gl = createMockGl({
      clientWaitSync: vi.fn(() => 0x911d), // WAIT_FAILED
    } as Partial<WebGL2RenderingContext>);
    const result = waitForWebGlExportCommands(gl);

    expect(result).toEqual({ method: 'finish', fallbackReason: 'wait-failed' });
    expect(gl.finish).toHaveBeenCalledOnce();
    expect(gl.deleteSync).toHaveBeenCalledOnce();
  });

  it('falls back to finish on TIMEOUT_EXPIRED', () => {
    const gl = createMockGl({
      clientWaitSync: vi.fn(() => 0x911b), // TIMEOUT_EXPIRED
    } as Partial<WebGL2RenderingContext>);
    const result = waitForWebGlExportCommands(gl);

    expect(result).toEqual({ method: 'finish', fallbackReason: 'timeout' });
    expect(gl.finish).toHaveBeenCalledOnce();
  });

  it('falls back to finish when fence APIs are missing', () => {
    const gl = createMockGl({
      fenceSync: undefined,
      clientWaitSync: undefined,
    } as Partial<WebGL2RenderingContext>);
    const result = waitForWebGlExportCommands(gl);

    expect(result).toEqual({ method: 'finish', fallbackReason: 'unsupported' });
    expect(gl.finish).toHaveBeenCalledOnce();
  });
});

describe('waitForWebGlExportCommandsAsync', () => {
  it('resolves via fence after a timed-out poll then a signaled poll', async () => {
    const gl = createMockGl({
      clientWaitSync: vi
        .fn()
        .mockReturnValueOnce(0x911b) // TIMEOUT_EXPIRED
        .mockReturnValueOnce(0x911a), // ALREADY_SIGNALED
    } as Partial<WebGL2RenderingContext>);

    const result = await waitForWebGlExportCommandsAsync(gl, { timeoutMs: 50, pollTimeoutNs: 0 });

    expect(result).toEqual({ method: 'fence' });
    expect(gl.clientWaitSync).toHaveBeenCalledTimes(2);
    expect(gl.finish).not.toHaveBeenCalled();
    expect(gl.deleteSync).toHaveBeenCalledOnce();
  });

  it('falls back to finish when the overall async budget elapses', async () => {
    const gl = createMockGl({
      clientWaitSync: vi.fn(() => 0x911b), // always TIMEOUT_EXPIRED
    } as Partial<WebGL2RenderingContext>);

    const result = await waitForWebGlExportCommandsAsync(gl, { timeoutMs: 5, pollTimeoutNs: 0 });

    expect(result).toEqual({ method: 'finish', fallbackReason: 'timeout' });
    expect(gl.finish).toHaveBeenCalledOnce();
    expect(gl.deleteSync).toHaveBeenCalledOnce();
  });
});
