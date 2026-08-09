/**
 * Neutral WebGPU / platform capability policy shared by data-model validation
 * and shader compilers. Lives outside `shaders/` so `src/data-model/` does not
 * import compilation allowlists (arch-perf-followups task 03 / A6).
 */

export {
  GENERIC_RAYMARCHER_WEBGPU_MVP_SDF_TYPES,
  genericRaymarcherWebGpuMvpSdfAllowedListSentence,
} from './genericRaymarcherWebGpuMvpAllowlist';
