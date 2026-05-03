/**
 * Preview dependency summary for compile output (plan §4).
 * When in doubt for safety-critical motion (audio-driven preview), prefer true for `usesAudioUniforms`
 * only if panel audio uniforms are actually present in `uniforms` (wired into the shader).
 */

import type { NodeGraph } from '../../data-model/types';
import type { NodeSpec } from '../../types/nodeSpec';
import type { AudioSetup } from '../../data-model/audioSetupTypes';
import type { PreviewDependencyMask, UniformMetadata } from '../../runtime/types';
import { isAudioNode } from './NodeShaderCompilerHelpers';

/** Primary audio file uniforms drive transport-dependent preview. */
const PRIMARY_AUDIO_UNIFORM_PARAMS = new Set(['currentTime', 'duration', 'isPlaying']);

/**
 * Derive preview dependency flags from compiled shader artifacts.
 * @param shaderCode - Final fragment shader source (globals may appear only here, not in `uniforms`).
 */
export function computePreviewDependencyMask(
  graph: NodeGraph,
  uniforms: UniformMetadata[],
  shaderCode: string,
  nodeSpecs: Map<string, NodeSpec>,
  _audioSetup: AudioSetup | null | undefined
): PreviewDependencyMask {
  const code = shaderCode;

  const usesWallTime = /\buTime\b/.test(code);
  const usesTimelineTime = /\buTimelineTime\b/.test(code);
  const usesResolutionUniform = /\buResolution\b/.test(code);

  let usesAudioUniforms = false;
  for (const u of uniforms) {
    if (u.paramName === 'band' || u.paramName === 'remap') {
      usesAudioUniforms = true;
      break;
    }
    if (u.nodeId.startsWith('remap-') && u.paramName === 'out') {
      usesAudioUniforms = true;
      break;
    }
    if (PRIMARY_AUDIO_UNIFORM_PARAMS.has(u.paramName)) {
      usesAudioUniforms = true;
      break;
    }
    const node = graph.nodes.find((n) => n.id === u.nodeId);
    const spec = node ? nodeSpecs.get(node.type) : undefined;
    if (spec && isAudioNode(spec)) {
      usesAudioUniforms = true;
      break;
    }
  }

  let usesMouseUniforms = false;
  let usesFrameIndex = false;
  for (const node of graph.nodes) {
    const t = node.type.toLowerCase();
    if (t.includes('mouse') || t.includes('pointer') || t.includes('cursor')) {
      usesMouseUniforms = true;
    }
    if (t.includes('frame') && t.includes('index')) {
      usesFrameIndex = true;
    }
  }

  return {
    usesWallTime,
    usesTimelineTime,
    usesAudioUniforms,
    usesResolutionUniform,
    usesMouseUniforms,
    usesFrameIndex
  };
}
