import type { NodeSpec } from '../../types/nodeSpec';
import { MAX_PATTERN_ONSET_LOOP } from '../arrangement/pattern/constants';

/**
 * MIDI onset compass from `audioSetup.arrangementSnapshot` (compile-time onset bake).
 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const pitchClassCompassNodeSpec: NodeSpec = {
  id: 'pitch-class-compass',
  category: 'MIDI',
  displayName: 'Pitch Wheel',
  description:
    'Twelve or fewer angular sectors pulse on note onsets from the arrangement snapshot; velocity scales brightness and decay sets how long each hit lingers. Requires an imported arrangement snapshot.',
  icon: 'radioactive',
  inputs: [
    {
      name: 'in',
      type: 'vec2',
      label: 'UV',
    },
    {
      name: 'time',
      type: 'float',
      label: 'Time',
      fallbackExpression: 'uTimelineTime',
    },
  ],
  outputs: [
    {
      name: 'out',
      type: 'float',
      label: 'Value',
    },
    {
      name: 'color',
      type: 'vec4',
      label: 'Color',
    },
  ],
  parameters: {
    windowSeconds: {
      type: 'float',
      default: 2.0,
      min: 0.1,
      max: 8.0,
      step: 0.05,
      label: 'Window',
    },
    decay: {
      type: 'float',
      default: 0.35,
      min: 0.05,
      max: 4.0,
      step: 0.05,
      label: 'Decay',
    },
    sectors: {
      type: 'float',
      default: 12.0,
      min: 2.0,
      max: 24.0,
      step: 1.0,
      label: 'Sectors',
    },
    innerRadius: {
      type: 'float',
      default: 0.12,
      min: 0.0,
      max: 0.5,
      step: 0.01,
      label: 'Inner',
    },
    outerRadius: {
      type: 'float',
      default: 0.72,
      min: 0.1,
      max: 1.2,
      step: 0.01,
      label: 'Outer',
    },
    sectorSoftness: {
      type: 'float',
      default: 0.08,
      min: 0.0,
      max: 0.5,
      step: 0.01,
      label: 'Soft',
    },
    radialBands: {
      type: 'float',
      default: 3.0,
      min: 0.0,
      max: 24.0,
      step: 0.5,
      label: 'Bands',
    },
    centerX: {
      type: 'float',
      default: 0.5,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Center X',
    },
    centerY: {
      type: 'float',
      default: 0.5,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Center Y',
    },
    trackFilterMode: {
      type: 'int',
      default: 1,
      min: 0,
      max: 1,
      step: 1,
      label: 'Tracks',
    },
    trackFilterList: {
      type: 'string',
      default: '',
      label: 'Track ids',
    },
    onsetLoopStart: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2048,
      step: 1,
      label: 'Loop start',
    },
    onsetLoopEnd: {
      type: 'int',
      default: 0,
      min: 0,
      max: 2048,
      step: 1,
      label: 'Loop end',
    },
  },
  parameterGroups: [
    {
      id: 'pitch-compass-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'pitch-compass-onsets',
      label: 'Onsets',
      parameters: ['windowSeconds', 'decay', 'sectors'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'pitch-compass-shape',
      label: 'Shape',
      parameters: ['innerRadius', 'outerRadius', 'sectorSoftness', 'radialBands'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'pitch-compass-center',
      label: 'Center',
      parameters: ['centerX', 'centerY'],
      collapsible: true,
      defaultCollapsed: false,
    },
  ],
  parameterLayout: {
    elements: [
      {
        type: 'arrangement-track-filter',
        label: 'Tracks',
        trackKinds: ['note'],
        hideEmpty: true,
        showNoteCounts: true,
      },
      {
        type: 'grid',
        label: 'Onsets',
        parameters: ['windowSeconds', 'decay', 'sectors'],
        layout: { columns: 'auto' },
      },
      {
        type: 'grid',
        label: 'Shape',
        parameters: ['innerRadius', 'outerRadius', 'sectorSoftness', 'radialBands'],
        layout: { columns: 'auto' },
      },
      {
        type: 'grid',
        label: 'Center',
        parameters: ['centerX', 'centerY'],
        parameterUI: { centerX: 'coords', centerY: 'coords' },
        layout: { columns: 2, coordsSpan: 2 },
      },
    ],
    parametersWithoutPorts: [
      'trackFilterMode',
      'trackFilterList',
      'onsetLoopStart',
      'onsetLoopEnd',
    ],
    minColumns: 3,
  },
  functions: `
struct PitchClassCompassResult {
  float mask;
  vec4 color;
};

{{ARRANGEMENT_PATTERN_NOTE_BAKE}}

vec2 pitchClassCompassUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

PitchClassCompassResult evalPitchClassCompass(
  vec2 uv,
  float timelineTime,
  float windowSeconds,
  float decay,
  float sectors,
  float innerRadius,
  float outerRadius,
  float sectorSoftness,
  float radialBands,
  vec2 center,
  int onsetLoopStart,
  int onsetLoopEnd
) {
  int sectorCount = clamp(int(floor(sectors + 0.5)), 2, 24);
  vec2 offset = uv - center;
  float r = length(offset);
  float theta = atan(offset.y, offset.x);
  float angle01 = fract(theta / ARR_PATTERN_TAU + 0.5);
  float sectorF = angle01 * float(sectorCount);
  int pixelSector = int(floor(sectorF)) % sectorCount;
  float sectorFrac = fract(sectorF);

  float radialSoft = 0.02;
  float radialMask = smoothstep(innerRadius - radialSoft, innerRadius, r)
    * (1.0 - smoothstep(outerRadius, outerRadius + radialSoft, r));

  float distToEdge = min(sectorFrac, 1.0 - sectorFrac);
  float sectorMask = smoothstep(0.0, sectorSoftness, distToEdge);

  float windowStart = timelineTime - windowSeconds;
  float rel = max(decay, 0.001);
  float energy = 0.0;
  int loopStart = max(onsetLoopStart, 0);
  int loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_{{NODE_SUFFIX}});

  for (int i = loopStart; i < loopEnd; i++) {
    if (i - loopStart >= ${MAX_PATTERN_ONSET_LOOP}) break;
    vec4 onset = ARR_PATTERN_ONSETS_{{NODE_SUFFIX}}[i];
    float startT = onset.x;
    float pitch = onset.z;
    float velocity = onset.w;

    if (startT > timelineTime || startT < windowStart) continue;

    float age = timelineTime - startT;
    if (age < 0.0 || age > rel) continue;

    int onsetSector = arrPatternPitchToSector(pitch, sectorCount);
    if (onsetSector != pixelSector) continue;

    float pulse = (1.0 - age / rel) * velocity;
    energy = max(energy, pulse);
  }

  float bands = radialBands > 0.0 ? 0.5 + 0.5 * sin(r * radialBands * ARR_PATTERN_TAU) : 1.0;
  float mask = radialMask * sectorMask * energy * bands;

  float palettePc = arrPatternPitchClassForSector(float(pixelSector), float(sectorCount));
  vec3 rgb = arrPatternPitchClassColor(palettePc);
  vec4 color = vec4(rgb, energy);

  return PitchClassCompassResult(mask, color);
}
`,
  mainCode: `
  vec2 compassUv = pitchClassCompassUvFromP($input.in);
  vec2 compassCenter = vec2($param.centerX, $param.centerY);
  PitchClassCompassResult compass = evalPitchClassCompass(
    compassUv,
    $input.time,
    $param.windowSeconds,
    $param.decay,
    $param.sectors,
    $param.innerRadius,
    $param.outerRadius,
    $param.sectorSoftness,
    $param.radialBands,
    compassCenter,
    int($param.onsetLoopStart),
    int($param.onsetLoopEnd)
  );
  $output.out = compass.mask;
  $output.color = compass.color;
`,
};
