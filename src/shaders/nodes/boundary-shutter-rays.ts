import type { NodeSpec } from '../../types/nodeSpec';
import { MAX_PATTERN_SHUTTER_BOUNDARY_LOOP } from '../arrangement/pattern/constants';

/**
 * Radial shutter rays at region start/end boundaries from `audioSetup.arrangementSnapshot`.
 * Placeholders `{{ARRANGEMENT_PATTERN_REGION_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.
 */
export const boundaryShutterRaysNodeSpec: NodeSpec = {
  id: 'boundary-shutter-rays',
  category: 'MIDI',
  displayName: 'Boundary Shutter Rays',
  description:
    'Region start and end times trigger radial shutter rays from center; abstract section transitions, not DAW blocks. Requires an imported arrangement snapshot.',
  icon: 'sunrise',
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
  ],
  parameters: {
    window: {
      type: 'float',
      default: 2.0,
      min: 0.1,
      max: 32.0,
      step: 0.1,
      label: 'Window',
    },
    rayCount: {
      type: 'int',
      default: 18,
      min: 2,
      max: 64,
      step: 1,
      label: 'Rays',
    },
    width: {
      type: 'float',
      default: 0.12,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: 'Width',
    },
    spin: {
      type: 'float',
      default: 0.35,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      label: 'Spin',
      knobPolarity: 'two-sided',
    },
    endPolarity: {
      type: 'float',
      default: -0.5,
      min: -1.0,
      max: 1.0,
      step: 0.01,
      label: 'End pol',
      knobPolarity: 'two-sided',
    },
    kindFilter: {
      type: 'int',
      default: -1,
      min: -1,
      max: 2,
      step: 1,
      label: 'Kind',
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
      id: 'boundary-shutter-tracks',
      label: 'Tracks',
      parameters: [],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'boundary-shutter-motion',
      label: 'Motion',
      parameters: ['window', 'rayCount', 'width', 'spin', 'endPolarity', 'kindFilter'],
      collapsible: true,
      defaultCollapsed: false,
    },
    {
      id: 'boundary-shutter-center',
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
        hideEmpty: true,
      },
      {
        type: 'grid',
        label: 'Motion',
        parameters: ['window', 'rayCount', 'width', 'spin', 'endPolarity', 'kindFilter'],
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
{{ARRANGEMENT_PATTERN_REGION_BAKE}}

vec2 boundaryShutterRaysUvFromP(vec2 p) {
  float aspect = uResolution.x / uResolution.y;
  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);
}

float boundaryShutterRaysSpoke(float theta, float phase, int rayCount, float width) {
  float spoke = fract((theta + phase) / ARR_PATTERN_TAU * float(rayCount));
  float spokeDist = min(spoke, 1.0 - spoke) * 2.0;
  return 1.0 - smoothstep(width * 0.5, width, spokeDist);
}

float evalBoundaryShutterRays(
  vec2 uv,
  float timelineTime,
  float window,
  int rayCount,
  float width,
  float spin,
  float endPolarity,
  int kindFilter,
  vec2 center
) {
  vec2 d = uv - center;
  float theta = atan(d.y, d.x);
  float r = length(d);

  float mask = 0.0;
  int count = ARR_PATTERN_BOUNDARY_COUNT_{{NODE_SUFFIX}};

  for (int i = 0; i < count; i++) {
    if (i >= ${MAX_PATTERN_SHUTTER_BOUNDARY_LOOP}) break;

    vec4 boundary = ARR_PATTERN_BOUNDARIES_{{NODE_SUFFIX}}[i];
    float bTime = boundary.x;
    float kind = boundary.z;
    float isEnd = boundary.w;

    if (kindFilter >= 0 && int(kind + 0.5) != kindFilter) continue;

    float age = timelineTime - bTime;
    if (age < 0.0 || age > window) continue;

    float phase = spin * age;
    if (isEnd >= 0.5) {
      phase += endPolarity * ARR_PATTERN_TAU;
    }

    float ray = boundaryShutterRaysSpoke(theta, phase, rayCount, width);

    float expand = age / max(window, 0.001);
    float gateR = expand * 0.55 + 0.08;
    float radialGate = smoothstep(gateR - 0.06, gateR, r) * (1.0 - smoothstep(0.92, 0.98, r));

    float fade = 1.0 - age / max(window, 0.001);
    float contrib = ray * radialGate * fade;

    mask = max(mask, contrib);
  }

  return mask;
}
`,
  mainCode: `
  vec2 shutterUv = boundaryShutterRaysUvFromP($input.in);
  vec2 shutterCenter = vec2($param.centerX, $param.centerY);
  $output.out = evalBoundaryShutterRays(
    shutterUv,
    $input.time,
    $param.window,
    $param.rayCount,
    $param.width,
    $param.spin,
    $param.endPolarity,
    int($param.kindFilter),
    shutterCenter
  );
`,
};
