import type { NodeSpec } from '../../types/nodeSpec';
import {
  MAX_PATTERN_RELEASE_BIN_LOOP,
  MAX_PATTERN_TRACK_LOOP,
} from '../arrangement/pattern/constants';

/**
 * Per-track lattice halos from arrangement track energy bins (compile-time bake).
 * Placeholders `{{ARRANGEMENT_PATTERN_REGION_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const trackHaloLatticeNodeSpec: NodeSpec = {
  id: 'track-halo-lattice',
  category: 'MIDI',
  displayName: 'Track Halo Lattice',
  description:
    'Each track drives a golden-angle offset lattice layer; per-track energy bins make cell halos glow. Requires an imported arrangement snapshot.',
  icon: 'grid-nine',
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
      name: 'trackMask',
      type: 'float',
      label: 'Track',
    },
  ],
  parameters: {
    latticeScale: {
      type: 'float',
      default: 7.0,
      min: 1.0,
      max: 48.0,
      step: 0.5,
      label: 'Scale',
    },
    haloSize: {
      type: 'float',
      default: 0.18,
      min: 0.02,
      max: 0.6,
      step: 0.01,
      label: 'Halo',
    },
    decay: {
      type: 'float',
      default: 0.8,
      min: 0.05,
      max: 4.0,
      step: 0.05,
      label: 'Decay',
    },
    trackSpread: {
      type: 'float',
      default: 0.27,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Spread',
    },
    contrast: {
      type: 'float',
      default: 1.4,
      min: 0.1,
      max: 4.0,
      step: 0.05,
      label: 'Contrast',
    },
    maxTracks: {
      type: 'int',
      default: 16,
      min: 1,
      max: 16,
      step: 1,
      label: 'Tracks',
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
      id: 'track-halo-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'track-halo-shape',
      label: 'Shape',
      parameters: ['latticeScale', 'haloSize', 'decay', 'trackSpread', 'contrast', 'maxTracks'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'track-halo-center',
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
        parameters: ['latticeScale', 'haloSize', 'decay', 'trackSpread', 'contrast', 'maxTracks'],
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
const float TRACK_HALO_GOLDEN = 2.39996322972865332;

struct TrackHaloLatticeResult {
  float mask;
  float trackMask;
};

{{ARRANGEMENT_PATTERN_REGION_BAKE}}

vec2 trackHaloLatticeUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

vec3 trackHaloLatticeReadBin(int trackIndex, int binIndex) {
  int binCount = ARR_PATTERN_TRACK_BIN_COUNT_{{NODE_SUFFIX}};
  int idx = trackIndex * binCount + binIndex;
  return ARR_PATTERN_TRACK_ENERGY_{{NODE_SUFFIX}}[idx];
}

float trackHaloLatticeEnergyAt(int trackIndex, float time, float decaySeconds, out float meanPitch) {
  meanPitch = 60.0;
  if (ARR_PATTERN_TRACK_BIN_COUNT_{{NODE_SUFFIX}} == 0) return 0.0;

  float rel = max(decaySeconds, 0.001);
  float t0 = max(0.0, time - rel);
  int i0 = clamp(int(floor(t0 / ARR_PATTERN_TRACK_BIN_WIDTH_{{NODE_SUFFIX}})), 0, ARR_PATTERN_TRACK_BIN_COUNT_{{NODE_SUFFIX}} - 1);
  int i1 = clamp(int(floor(time / ARR_PATTERN_TRACK_BIN_WIDTH_{{NODE_SUFFIX}})), 0, ARR_PATTERN_TRACK_BIN_COUNT_{{NODE_SUFFIX}} - 1);
  float energy = 0.0;

  for (int i = i0; i <= i1; i++) {
    if (i - i0 >= ${MAX_PATTERN_RELEASE_BIN_LOOP}) break;
    float binCenter = (float(i) + 0.5) * ARR_PATTERN_TRACK_BIN_WIDTH_{{NODE_SUFFIX}};
    float age = time - binCenter;
    if (age < 0.0 || age > rel) continue;
    float decayFactor = 1.0 - age / rel;
    vec3 bin = trackHaloLatticeReadBin(trackIndex, i);
    float e = bin.x * decayFactor;
    if (e > energy) {
      energy = e;
      meanPitch = bin.y;
    }
  }

  return energy;
}

float trackHaloLatticeCell(vec2 latticeUv, float haloSize) {
  vec2 cell = fract(latticeUv);
  float dist = length(cell - 0.5);
  float halfExtent = max(0.0001, haloSize * 0.5);
  return 1.0 - smoothstep(halfExtent * 0.35, halfExtent, dist);
}

TrackHaloLatticeResult evalTrackHaloLattice(
  vec2 uv,
  float timelineTime,
  float latticeScale,
  float haloSize,
  float decaySeconds,
  float trackSpread,
  float contrast,
  int maxTracks,
  vec2 center
) {
  float mask = 0.0;
  float trackMask = 0.0;
  int trackCount = min(ARR_PATTERN_TRACK_COUNT_{{NODE_SUFFIX}}, maxTracks);
  float bestEnergy = 0.0;
  int bestTrack = 0;

  for (int t = 0; t < trackCount; t++) {
    if (t >= ${MAX_PATTERN_TRACK_LOOP}) break;

    float meanPitch;
    float energy = trackHaloLatticeEnergyAt(t, timelineTime, decaySeconds, meanPitch);
    if (energy <= 0.0) continue;

    float angle = float(t) * TRACK_HALO_GOLDEN + arrPatternPitchToAngle(meanPitch);
    vec2 offset = trackSpread * vec2(cos(angle), sin(angle));
    vec2 latticeUv = (uv - center + offset) * latticeScale;
    float halo = trackHaloLatticeCell(latticeUv, haloSize);
    float contrib = arrPatternSaturate(halo * energy * contrast);

    mask = max(mask, contrib);

    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestTrack = t;
    }
  }

  if (bestEnergy > 0.0) {
    trackMask = arrPatternTrackOrderNorm(
      float(bestTrack),
      float(ARR_PATTERN_TRACK_COUNT_{{NODE_SUFFIX}})
    );
  }

  return TrackHaloLatticeResult(mask, trackMask);
}
`,
  mainCode: `
  vec2 haloUv = trackHaloLatticeUvFromP($input.in);
  vec2 haloCenter = vec2($param.centerX, $param.centerY);
  TrackHaloLatticeResult halo = evalTrackHaloLattice(
    haloUv,
    $input.time,
    $param.latticeScale,
    $param.haloSize,
    $param.decay,
    $param.trackSpread,
    $param.contrast,
    int($param.maxTracks),
    haloCenter
  );
  $output.out = halo.mask;
  $output.trackMask = halo.trackMask;
`,
};
