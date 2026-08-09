/**
 * Neutral compile IR / pass-plan contract shared by shaders (emit) and runtime (consume).
 *
 * Lives outside `runtime/` so `src/shaders/` does not import runtime types for IR.
 * Runtime may re-export these from `runtime/types` during a transition window (task 02 / 08).
 */

/**
 * What drives live preview updates for a compiled program (plan §4).
 * Snapshot at compile success; runtime must not re-infer from the graph each frame.
 */
export interface PreviewDependencyMask {
  usesWallTime: boolean;
  usesTimelineTime: boolean;
  usesAudioUniforms: boolean;
  /**
   * Radial pulse `pulseDrive` spawn uses JS + analyser values; the shader may omit band/remap uniforms
   * when Drive is the only consumer. Still needs the same periodic analyser pass as audio uniforms.
   */
  usesRadialPulseVirtualDrive: boolean;
  /**
   * True when `applyRadialPulseSpawnUniforms` may write spawn slots (virtual Drive and/or preview loop
   * interval on a reachable radial-pulse). Keeps that pass on the wall-clock tick, not only analyser cadence.
   */
  usesRadialPulseSpawnUniformPass: boolean;
  usesResolutionUniform: boolean;
  usesMouseUniforms: boolean;
  usesFrameIndex: boolean;
}

/**
 * Uniform metadata from compiler output.
 */
export interface UniformMetadata {
  // Uniform identifier in shader
  name: string; // e.g., "uNodeN1Scale"

  // Source information
  nodeId: string; // e.g., "node-123"
  paramName: string; // e.g., "scale"

  // Type information
  type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4';

  // Default value (from node parameter default)
  defaultValue: number | [number, number] | [number, number, number] | [number, number, number, number];
}

export type RenderBackendKind = 'webgl' | 'webgpu';

export type CompileTargetOptions = {
  /**
   * Requested output backend for emitted `CompilationResult.code`.
   * When omitted, compilers should default to WebGL for compatibility.
   */
  backend?: RenderBackendKind;
};

/**
 * Deterministic mapping from parameter key -> packed index for GPU parameter buffers.
 * Key format is stable and backend-agnostic: `${nodeId}.${paramName}`.
 *
 * WebGPU intent (task 02B): params are packed as `array<vec4<f32>>` and scalars use `.x`.
 */
export type ParamLayout = Record<string, number>;

export type ShaderResourceDecl =
  | { kind: 'texture2d-f32'; key: string }
  | { kind: 'sampler'; key: string };

/**
 * Cloneable resource descriptors used in compiler→runtime contracts.
 * These must remain structured-clone compatible (plain objects + numbers/strings).
 */
export type WebGpuTextureSizeDesc =
  | { kind: 'fixed'; width: number; height: number }
  | { kind: 'canvas' };

export type WebGpuTextureDesc = {
  size: WebGpuTextureSizeDesc;
  /** e.g. 'rgba8unorm' */
  format: GPUTextureFormat;
  /** GPUTextureUsageFlags is a number at runtime and cloneable. */
  usage: GPUTextureUsageFlags;
  sampleCount?: number;
  label?: string;
};

export type WebGpuPassPlan =
  | {
      /**
       * Task 10B: Separable Gaussian blur post-effect pass plan, executed by the WebGPU runtime.
       *
       * Pipeline (4 passes):
       *   1. `inputWgsl` (fullscreen fragment) → tex0  (renders the upstream subgraph)
       *   2. blur horizontal sampling tex0 → tex1
       *   3. blur vertical sampling tex1 → tex0
       *   4. present tex0 to swapchain
       *
       * Contract:
       * - `inputWgsl` is an inline WGSL fragment program with the same bindings as the
       *   single-pass MVP (`globals` uniform + `params` storage). The compiler generates it
       *   from the upstream subgraph (everything except the blur node and `final-output`).
       * - `blurWgsl` uses two extra bindings for the source texture + sampler beyond the
       *   shared globals/params pair. Runtime invokes the same module with two entry points
       *   (`fsBlurH` and `fsBlurV`).
       * - All resources (intermediate textures, ping-pong, params buffer) are owned by the
       *   runtime; the plan only declares descriptors so the resource pool can size them.
       */
      kind: 'pass.blur.gaussian-separable.v1';
      /** Owning blur node id for param-layout keys (`${nodeId}.${paramName}`). */
      nodeId: string;

      /**
       * Inline WGSL fragment program for the upstream subgraph. Outputs the source color
       * for the blur input. Runtime bindings:
       * - @group(0) @binding(0) globals uniform (v0 time/res, v1 flags)
       * - @group(0) @binding(1) params (read-only storage `array<vec4<f32>>`)
       * Entry points: `vs` / `fs`.
       */
      inputWgsl: string;

      /**
       * Blur WGSL fragment program (separable Gaussian; horizontal + vertical entry points).
       * Runtime bindings:
       * - @group(0) @binding(0) globals uniform
       * - @group(0) @binding(1) params (read-only storage)
       * - @group(0) @binding(2) blurInputTex (texture_2d<f32>)
       * - @group(0) @binding(3) blurInputSamp (sampler)
       * Entry points: `vs`, `fsBlurH`, `fsBlurV`.
       */
      blurWgsl: string;

      /**
       * Present WGSL fragment program (samples the final blurred texture to the swapchain).
       * Runtime bindings:
       * - @group(0) @binding(0) presentTex (texture_2d<f32>)
       * - @group(0) @binding(1) presentSamp (sampler)
       * Entry points: `vs`, `fs`.
       */
      presentWgsl: string;

      /** Intermediate (offscreen + ping-pong) texture descriptor; canvas-sized in practice. */
      intermediateTexture: WebGpuTextureDesc;

      /**
       * Deterministic param slots for the blur node. Scalars live in `.x` of the indexed vec4 slot.
       */
      paramSlots: {
        amount: number;
        radius: number;
        type: number;
        direction: number;
        centerX: number;
        centerY: number;
      };
    }
  | {
      /**
       * Glow/bloom post-effect pass plan, executed by the WebGPU runtime.
       *
       * Pipeline (5 passes):
       *   1. `inputWgsl` (fullscreen fragment) -> source texture
       *   2. threshold bright pixels from source -> bright texture
       *   3. horizontal Gaussian blur bright -> blur texture
       *   4. vertical Gaussian blur blur -> bright texture
       *   5. combine source + blurred bright texture -> swapchain/export target
       */
      kind: 'pass.glow-bloom.v1';
      /** Owning glow-bloom node id for param-layout keys (`${nodeId}.${paramName}`). */
      nodeId: string;
      /** Inline WGSL fragment program for the upstream subgraph. Entry points: `vs` / `fs`. */
      inputWgsl: string;
      /** Bright-pass WGSL. Entry points: `vs` / `fs`. */
      thresholdWgsl: string;
      /** Bloom blur WGSL. Entry points: `vs`, `fsBlurH`, `fsBlurV`. */
      blurWgsl: string;
      /** Final combine WGSL. Entry points: `vs` / `fs`. */
      combineWgsl: string;
      /** Intermediate offscreen textures; canvas-sized in practice. */
      intermediateTexture: WebGpuTextureDesc;
      /** Deterministic param slots for the glow-bloom node. Scalars live in `.x`. */
      paramSlots: {
        threshold: number;
        intensity: number;
        radius: number;
        strength: number;
      };
    }
  | {
      /**
       * Bokeh post-effect pass plan, executed by the WebGPU runtime.
       *
       * Pipeline (4 passes):
       *   1. `inputWgsl` (fullscreen fragment) -> source texture
       *   2. bright-pass threshold from source -> bright texture
       *   3. shaped bokeh blur bright -> blur texture
       *   4. combine source + blurred bright texture -> swapchain/export target
       */
      kind: 'pass.bokeh.v1';
      /** Owning bokeh node id for param-layout keys (`${nodeId}.${paramName}`). */
      nodeId: string;
      /** Inline WGSL fragment program for the upstream subgraph. Entry points: `vs` / `fs`. */
      inputWgsl: string;
      /** Bright-pass WGSL. Entry points: `vs` / `fs`. */
      thresholdWgsl: string;
      /** Bokeh blur WGSL. Entry points: `vs` / `fs`. */
      blurWgsl: string;
      /** Final combine WGSL. Entry points: `vs` / `fs`. */
      combineWgsl: string;
      /** Intermediate offscreen textures; canvas-sized in practice. */
      intermediateTexture: WebGpuTextureDesc;
      /** Deterministic param slots for the bokeh node. Scalars live in `.x`. */
      paramSlots: {
        threshold: number;
        intensity: number;
        radius: number;
        strength: number;
        blades: number;
        rotation: number;
      };
    }
  | {
      /**
       * Crepuscular-rays ("god rays") post-effect pass plan, executed by the WebGPU runtime.
       *
       * Pipeline (4 passes):
       *   1. `inputWgsl` (fullscreen fragment) -> source texture (upstream subgraph color image)
       *   2. occluder pass: luminance × procedural angular ray-stripe pattern -> mask texture
       *   3. radial sweep pass: per-fragment march from fragment to source point, accumulating
       *      mask samples with per-step decay -> rays texture
       *   4. combine pass: source.rgb + rays.rgb * intensity -> swapchain / export target
       *
       * Runtime supplies all crepuscular params via `globals.v1`/`v2`/`v3`; the pass plan does not
       * need to know the global param-layout indices (mirrors the blur pass plan convention).
       */
      kind: 'pass.crepuscular-rays.v1';
      /** Owning crepuscular-rays node id for param-layout keys (`${nodeId}.${paramName}`). */
      nodeId: string;
      /** Inline WGSL fragment program for the upstream subgraph. Entry points: `vs` / `fs`. */
      inputWgsl: string;
      /** Occluder mask WGSL (luma × ray stripes). Entry points: `vs` / `fs`. */
      occluderWgsl: string;
      /** Radial sweep WGSL (march from fragment to source). Entry points: `vs` / `fs`. */
      sweepWgsl: string;
      /** Final combine WGSL. Entry points: `vs` / `fs`. */
      combineWgsl: string;
      /** Intermediate offscreen textures; canvas-sized in practice. */
      intermediateTexture: WebGpuTextureDesc;
      /** Deterministic param slots for the crepuscular-rays node. Scalars live in `.x`. */
      paramSlots: {
        sourceX: number;
        sourceY: number;
        distanceFalloff: number;
        intensity: number;
        rayCount: number;
        spread: number;
        width: number;
        rotationSpeed: number;
        rotationOffset: number;
      };
    };

/**
 * Compilation result from the shader compiler.
 */
export interface CompilationResult {
  /**
   * Which backend the emitted `code` targets.
   * Today, the compiler emits WebGL/GLSL only; WebGPU/WGSL is introduced in later tasks.
   */
  backend: RenderBackendKind;

  /**
   * Coverage / support signal for the requested backend.
   * Must be explicit so runtime can fall back per-graph without relying on exceptions.
   */
  supported: boolean;
  unsupportedReasons?: string[];

  /**
   * Backend shader code. For WebGL, this is GLSL ES 3.00 fragment source.
   * `shaderCode` is kept for backward compatibility with the existing WebGL runtime.
   */
  code: string;

  // GLSL shader code
  shaderCode: string;

  // Uniform metadata
  uniforms: UniformMetadata[];

  // Compilation metadata
  metadata: {
    warnings: string[];
    errors: string[];
    executionOrder: string[]; // Node IDs in execution order
    finalOutputNodeId: string | null; // ID of final output node
    /** Present on successful compiles; omitted when compilation failed early. */
    previewDependencies?: PreviewDependencyMask;
  };

  /**
   * Deterministic index mapping for parameters that can be stored in a GPU param buffer.
   */
  paramLayout: ParamLayout;

  /**
   * Optional declared resources (future WebGPU binding layout; cloneable).
   */
  resources?: ShaderResourceDecl[];

  /**
   * Optional WebGPU pass plan (Task 09/10). When present, a WebGPU backend may render using passes
   * instead of the single fullscreen fragment program in `code`.
   */
  webgpuPassPlan?: WebGpuPassPlan;
}
