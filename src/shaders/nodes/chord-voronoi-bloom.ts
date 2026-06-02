import type { NodeSpec } from '../../types/nodeSpec';
import {
  MAX_PATTERN_ACTIVE_SITES,
  MAX_PATTERN_RELEASE_BIN_LOOP,
} from '../arrangement/pattern/constants';

/**
 * Harmonic Voronoi cells from active pitch-class energy (`audioSetup.arrangementSnapshot`).
 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const chordVoronoiBloomNodeSpec: NodeSpec = {
  id: 'chord-voronoi-bloom',
  category: 'MIDI',
  displayName: 'Chord Voronoi Bloom',
  description:
    'Active chord tones become Voronoi sites that re-tessellate the frame into glowing cells with pitch-class colors. Requires an imported arrangement snapshot.',
  icon: 'cell',
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
    {
      name: 'seed',
      type: 'float',
      label: 'Seed',
      fallbackExpression: '0.0',
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
    release: {
      type: 'float',
      default: 0.25,
      min: 0.05,
      max: 4.0,
      step: 0.05,
      label: 'Release',
    },
    edgeWidth: {
      type: 'float',
      default: 0.035,
      min: 0.005,
      max: 0.2,
      step: 0.005,
      label: 'Edge',
    },
    siteJitter: {
      type: 'float',
      default: 0.12,
      min: 0.0,
      max: 0.5,
      step: 0.01,
      label: 'Jitter',
    },
    fill: {
      type: 'float',
      default: 0.4,
      min: 0.0,
      max: 1.0,
      step: 0.05,
      label: 'Fill',
    },
    maxSites: {
      type: 'float',
      default: 24.0,
      min: 1.0,
      max: 24.0,
      step: 1.0,
      label: 'Sites',
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
  },
  parameterGroups: [
    {
      id: 'chord-voronoi-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'chord-voronoi-shape',
      label: 'Shape',
      parameters: ['release', 'edgeWidth', 'siteJitter', 'fill', 'maxSites'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'chord-voronoi-center',
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
        label: 'Shape',
        parameters: ['release', 'edgeWidth', 'siteJitter', 'fill', 'maxSites'],
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
    parametersWithoutPorts: ['trackFilterMode', 'trackFilterList'],
    minColumns: 3,
  },
  functions: `
struct ChordVoronoiBloomResult {
  float mask;
  vec4 color;
};

{{ARRANGEMENT_PATTERN_NOTE_BAKE}}

vec2 chordVoronoiBloomUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

float chordVoronoiReadPcEnergy(int binIndex, int pitchClass) {
  int base = binIndex * 3;
  int pc = pitchClass % 12;
  vec4 row0 = ARR_PATTERN_PC_{{NODE_SUFFIX}}[base];
  vec4 row1 = ARR_PATTERN_PC_{{NODE_SUFFIX}}[base + 1];
  vec4 row2 = ARR_PATTERN_PC_{{NODE_SUFFIX}}[base + 2];
  if (pc < 4) return row0[pc];
  if (pc < 8) return row1[pc - 4];
  return row2[pc - 8];
}

float chordVoronoiPcEnergyAt(float time, float release, int pitchClass) {
  if (ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} == 0) return 0.0;
  float rel = max(release, 0.001);
  float t0 = max(0.0, time - rel);
  int i0 = clamp(int(floor(t0 / ARR_PATTERN_BIN_WIDTH_{{NODE_SUFFIX}})), 0, ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} - 1);
  int i1 = clamp(int(floor(time / ARR_PATTERN_BIN_WIDTH_{{NODE_SUFFIX}})), 0, ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} - 1);
  float energy = 0.0;
  for (int i = i0; i <= i1; i++) {
    if (i - i0 >= ${MAX_PATTERN_RELEASE_BIN_LOOP}) break;
    float binCenter = (float(i) + 0.5) * ARR_PATTERN_BIN_WIDTH_{{NODE_SUFFIX}};
    float age = time - binCenter;
    if (age < 0.0 || age > rel) continue;
    float decay = 1.0 - age / rel;
    float e = chordVoronoiReadPcEnergy(i, pitchClass);
    energy = max(energy, e * decay);
  }
  return energy;
}

vec2 chordVoronoiSitePos(int pitchClass, float seed, float siteJitter, vec2 center) {
  float angle = float(pitchClass) * ARR_PATTERN_TAU / 12.0 + seed * 0.17;
  float radius = 0.38;
  vec2 base = center + vec2(cos(angle), sin(angle)) * radius;
  vec2 jitSeed = vec2(float(pitchClass) + seed * 13.0, seed * 7.0);
  vec2 jitter = (vec2(arrPatternHash22(jitSeed), arrPatternHash11(seed + float(pitchClass))) - 0.5) * siteJitter;
  return base + jitter;
}

ChordVoronoiBloomResult evalChordVoronoiBloom(
  vec2 uv,
  float timelineTime,
  float seed,
  float release,
  float edgeWidth,
  float siteJitter,
  float fill,
  float maxSites,
  vec2 center
) {
  if (ARR_PATTERN_BIN_COUNT_{{NODE_SUFFIX}} == 0) {
    return ChordVoronoiBloomResult(0.0, vec4(0.0));
  }

  float f1 = 1e5;
  float f2 = 1e5;
  int winnerPc = 0;
  float winnerEnergy = 0.0;
  int siteCount = 0;
  int maxSitesI = clamp(int(maxSites), 1, ${MAX_PATTERN_ACTIVE_SITES});

  for (int pc = 0; pc < 12; pc++) {
    if (siteCount >= maxSitesI) break;
    float energy = chordVoronoiPcEnergyAt(timelineTime, release, pc);
    if (energy < 0.02) continue;
    siteCount++;
    vec2 site = chordVoronoiSitePos(pc, seed, siteJitter, center);
    float wd = length(uv - site) / max(energy, 0.08);
    if (wd < f1) {
      f2 = f1;
      f1 = wd;
      winnerPc = pc;
      winnerEnergy = energy;
    } else if (wd < f2) {
      f2 = wd;
    }
  }

  if (siteCount == 0) {
    return ChordVoronoiBloomResult(0.0, vec4(0.0));
  }

  float edge = 0.0;
  if (siteCount >= 2) {
    edge = 1.0 - smoothstep(0.0, max(edgeWidth, 0.001), f2 - f1);
  }
  float fillCore = arrPatternSaturate(1.0 - f1 * (2.0 + fill * 6.0));
  float mask = max(edge * winnerEnergy, fillCore * fill * winnerEnergy);
  vec3 rgb = arrPatternPitchClassColor(float(winnerPc));
  return ChordVoronoiBloomResult(mask, vec4(rgb, winnerEnergy));
}
`,
  mainCode: `
  vec2 bloomUv = chordVoronoiBloomUvFromP($input.in);
  vec2 bloomCenter = vec2($param.centerX, $param.centerY);
  ChordVoronoiBloomResult bloom = evalChordVoronoiBloom(
    bloomUv,
    $input.time,
    $input.seed,
    $param.release,
    $param.edgeWidth,
    $param.siteJitter,
    $param.fill,
    $param.maxSites,
    bloomCenter
  );
  $output.out = bloom.mask;
  $output.color = bloom.color;
`,
};
