import type { NodeSpec } from "../../types/nodeSpec";

import { MAX_PATTERN_SPARK_GRID_ONSET_LOOP } from "../arrangement/pattern/constants";

/**

 * Grid-cell sparks from recent MIDI onsets (`audioSetup.arrangementSnapshot`, compile-time bake).

 * Placeholders `{{ARRANGEMENT_PATTERN_NOTE_BAKE}}`, `{{NODE_SUFFIX}}` replaced per instance.

 */

export const velocitySparkGridNodeSpec: NodeSpec = {
  id: "velocity-spark-grid",

  category: "MIDI",

  displayName: "Flashgrid",

  description:
    "Procedural grid cells flash on recent note attacks; MIDI velocity scales dot size and brightness. Requires an imported arrangement snapshot.",

  icon: "grid",

  inputs: [
    {
      name: "in",

      type: "vec2",

      label: "UV",
    },

    {
      name: "time",

      type: "float",

      label: "Time",

      fallbackExpression: "uTimelineTime",
    },
  ],

  outputs: [
    {
      name: "out",

      type: "float",

      label: "Value",
    },

    {
      name: "cellId",

      type: "float",

      label: "Cell",
    },

    {
      name: "energy",

      type: "float",

      label: "Energy",
    },

    {
      name: "lines",

      type: "float",

      label: "Lines",
    },
  ],

  parameters: {
    gridScale: {
      type: "float",

      default: 10.0,

      min: 2.0,

      max: 48.0,

      step: 1.0,

      label: "Grid X",
    },

    gridScaleY: {
      type: "float",

      default: 10.0,

      min: 2.0,

      max: 48.0,

      step: 1.0,

      label: "Grid Y",
    },

    decay: {
      type: "float",

      default: 0.55,

      min: 0.05,

      max: 4.0,

      step: 0.05,

      label: "Decay",
    },

    dotSize: {
      type: "float",

      default: 0.5,

      min: 0.02,

      max: 1.0,

      step: 0.01,

      label: "Size",
    },

    feather: {
      type: "float",

      default: 0.08,

      min: 0.0,

      max: 0.35,

      step: 0.005,

      label: "Feather",
    },

    pitchShuffle: {
      type: "float",

      default: 1.0,

      min: 0.0,

      max: 4.0,

      step: 0.05,

      label: "Shuffle",
    },

    shape: {
      type: "int",

      default: 0,

      min: 0,

      max: 1,

      step: 1,

      label: "Shape",
    },

    velSize: {
      type: "float",

      default: 1.0,

      min: 0.0,

      max: 1.0,

      step: 0.01,

      label: "Vel size",
    },

    velBright: {
      type: "float",

      default: 0.0,

      min: 0.0,

      max: 1.0,

      step: 0.01,

      label: "Vel bright",
    },

    minVelocity: {
      type: "float",

      default: 0.0,

      min: 0.0,

      max: 1.0,

      step: 0.01,

      label: "Min vel",
    },

    blendMode: {
      type: "int",

      default: 0,

      min: 0,

      max: 1,

      step: 1,

      label: "Blend",
    },

    decayCurve: {
      type: "int",

      default: 0,

      min: 0,

      max: 1,

      step: 1,

      label: "Curve",
    },

    attack: {
      type: "float",

      default: 0.0,

      min: 0.0,

      max: 1.0,

      step: 0.01,

      label: "Attack",
    },

    trackFilterMode: {
      type: "int",

      default: 1,

      min: 0,

      max: 1,

      step: 1,

      label: "Tracks",
    },

    trackFilterList: {
      type: "string",

      default: "",

      label: "Track ids",
    },

    onsetLoopStart: {
      type: "int",

      default: 0,

      min: 0,

      max: 2048,

      step: 1,

      label: "Loop start",
    },

    onsetLoopEnd: {
      type: "int",

      default: 0,

      min: 0,

      max: 2048,

      step: 1,

      label: "Loop end",
    },
  },

  parameterGroups: [
    {
      id: "velocity-spark-tracks",

      label: "Tracks",

      parameters: [],

      collapsible: true,

      defaultCollapsed: false,
    },

    {
      id: "velocity-spark-shape",

      label: "Shape",

      parameters: [
        "gridScale",

        "gridScaleY",

        "dotSize",

        "feather",

        "pitchShuffle",

        "shape",
      ],

      collapsible: true,

      defaultCollapsed: false,
    },

    {
      id: "velocity-spark-decay",

      label: "Decay",

      parameters: ["decay", "decayCurve", "attack"],

      collapsible: true,

      defaultCollapsed: false,
    },

    {
      id: "velocity-spark-velocity",

      label: "Velocity",

      parameters: ["velSize", "velBright", "minVelocity", "blendMode"],

      collapsible: true,

      defaultCollapsed: true,
    },
  ],

  parameterLayout: {
    elements: [
      {
        type: "arrangement-track-filter",

        label: "Tracks",

        trackKinds: ["note"],

        hideEmpty: true,

        showNoteCounts: true,
      },

      {
        type: "grid",

        label: "Shape",

        parameters: [
          "gridScale",

          "gridScaleY",

          "dotSize",

          "feather",

          "pitchShuffle",

          "shape",
        ],

        parameterUI: { shape: "enum" },

        layout: { columns: "auto" },
      },

      {
        type: "grid",

        label: "Decay",

        parameters: ["decay", "decayCurve", "attack"],

        parameterUI: { decayCurve: "enum" },

        layout: { columns: "auto" },
      },

      {
        type: "grid",

        label: "Velocity",

        parameters: ["velSize", "velBright", "minVelocity", "blendMode"],

        parameterUI: { blendMode: "enum" },

        layout: { columns: "auto" },
      },
    ],

    parametersWithoutPorts: [
      "trackFilterMode",

      "trackFilterList",

      "onsetLoopStart",

      "onsetLoopEnd",
    ],

    minColumns: 3,
  },

  functions: `

struct VelocitySparkGridResult {

  float mask;

  float cellId;

  float energy;

  float lines;

};



{{ARRANGEMENT_PATTERN_NOTE_BAKE}}



vec2 velocitySparkGridUvFromP(vec2 p) {

  float aspect = uResolution.x / uResolution.y;

  return vec2(p.x / (2.0 * aspect) + 0.5, p.y * 0.5 + 0.5);

}



vec2 velocitySparkGridGridDims(float gridScaleX, float gridScaleY) {

  return vec2(max(2.0, gridScaleX), max(2.0, gridScaleY));

}



vec2 velocitySparkGridTargetCell(float pitch, float trackIndex, float pitchShuffle, vec2 gridDims) {

  vec2 seed = vec2(pitch * pitchShuffle, trackIndex);

  vec2 hash01 = vec2(arrPatternHash22(seed), arrPatternHash11(pitch + trackIndex * 17.0 + pitchShuffle));

  return floor(hash01 * gridDims);

}



float velocitySparkGridDot(
  vec2 uv,
  vec2 targetCell,
  vec2 gridDims,
  float radius,
  float feather
) {
  vec2 localUv = uv * gridDims - targetCell;
  float dist = length(localUv - 0.5);
  float halfR = max(0.0001, radius * 0.5);
  float feat = max(1e-5, feather);
  return 1.0 - smoothstep(halfR, halfR + feat, dist);
}



float velocitySparkGridCellFill(vec2 uv, vec2 gridDims, float feather) {

  vec2 cellUv = fract(uv * gridDims);

  vec2 edgeDist = min(cellUv, 1.0 - cellUv);

  float d = min(edgeDist.x, edgeDist.y);

  return 1.0 - smoothstep(0.0, max(1e-5, feather), d);

}



float velocitySparkGridSparkMask(

  vec2 uv,

  vec2 targetCell,

  vec2 gridDims,

  float radius,

  float feather,

  int shape

) {

  if (shape == 1) {

    return velocitySparkGridCellFill(uv, gridDims, feather);

  }

  return velocitySparkGridDot(uv, targetCell, gridDims, radius, feather);

}



float velocitySparkGridFade(float age, float decaySeconds, int decayCurve, float attack) {

  float safeDecay = max(decaySeconds, 0.001);

  float t = arrPatternSaturate(age / safeDecay);

  float fade = decayCurve == 1 ? (1.0 - t) : exp(-age / safeDecay);

  float attackBoost = 1.0 + attack * exp(-age / max(safeDecay * 0.08, 0.001));

  return fade * attackBoost;

}



float velocitySparkGridGridLines(vec2 uv, vec2 gridDims) {

  vec2 g = fract(uv * gridDims);

  vec2 edgeDist = min(g, 1.0 - g);

  float d = min(edgeDist.x, edgeDist.y);

  return 1.0 - smoothstep(0.0, 0.015, d);

}



VelocitySparkGridResult evalVelocitySparkGrid(

  vec2 uv,

  float timelineTime,

  float gridScaleX,

  float gridScaleY,

  float decaySeconds,

  float dotSize,

  float feather,

  float pitchShuffle,

  int shape,

  float velSize,

  float velBright,

  float minVelocity,

  int blendMode,

  int decayCurve,

  float attack,

  int onsetLoopStart,

  int onsetLoopEnd

) {

  vec2 gridDims = velocitySparkGridGridDims(gridScaleX, gridScaleY);

  float lines = velocitySparkGridGridLines(uv, gridDims);



  if (ARR_PATTERN_ONSET_COUNT_{{NODE_SUFFIX}} == 0) {

    return VelocitySparkGridResult(0.0, 0.0, 0.0, lines);

  }



  float mask = 0.0;

  float cellId = 0.0;

  float energy = 0.0;

  float brightestContrib = 0.0;

  vec2 cell = floor(uv * gridDims);

  float windowStart = timelineTime - decaySeconds;

  int loopStart = max(onsetLoopStart, 0);

  int loopEnd = min(onsetLoopEnd, ARR_PATTERN_ONSET_COUNT_{{NODE_SUFFIX}});



  for (int i = loopStart; i < loopEnd; i++) {

    if (i - loopStart >= ${MAX_PATTERN_SPARK_GRID_ONSET_LOOP}) break;

    vec4 onset = ARR_PATTERN_ONSETS_{{NODE_SUFFIX}}[i];

    float startT = onset.x;

    float pitch = onset.z;

    float velocity = onset.w;

    float trackIdx = ARR_PATTERN_ONSET_TRACK_{{NODE_SUFFIX}}[i];



    if (startT > timelineTime || startT < windowStart) continue;



    if (velocity < minVelocity) continue;



    float age = timelineTime - startT;

    if (age < 0.0 || age > decaySeconds) continue;



    vec2 targetCell = velocitySparkGridTargetCell(pitch, trackIdx, pitchShuffle, gridDims);

    if (abs(targetCell.x - cell.x) > 0.5 || abs(targetCell.y - cell.y) > 0.5) continue;



    float velSizeMul = mix(1.0, velocity, velSize);

    float velBrightMul = mix(1.0, velocity, velBright);

    float radius = dotSize * velSizeMul;

    float dot = velocitySparkGridSparkMask(uv, targetCell, gridDims, radius, feather, shape);

    float fade = velocitySparkGridFade(age, decaySeconds, decayCurve, attack);

    float contrib = dot * fade * velBrightMul;



    energy += contrib;

    if (contrib > brightestContrib) {

      brightestContrib = contrib;

      cellId = arrPatternHash22(targetCell + vec2(pitch * 0.01, trackIdx));

    }

    if (blendMode == 1) {

      mask += contrib;

    } else if (contrib > mask) {

      mask = contrib;

    }

  }



  mask = arrPatternSaturate(mask);

  energy = arrPatternSaturate(energy);



  return VelocitySparkGridResult(mask, cellId, energy, lines);

}

`,

  mainCode: `

  vec2 sparkUv = velocitySparkGridUvFromP($input.in);

  VelocitySparkGridResult spark = evalVelocitySparkGrid(

    sparkUv,

    $input.time,

    $param.gridScale,

    $param.gridScaleY,

    $param.decay,

    $param.dotSize,

    $param.feather,

    $param.pitchShuffle,

    int($param.shape),

    $param.velSize,

    $param.velBright,

    $param.minVelocity,

    int($param.blendMode),

    int($param.decayCurve),

    $param.attack,

    int($param.onsetLoopStart),

    int($param.onsetLoopEnd)

  );

  $output.out = spark.mask;

  $output.cellId = spark.cellId;

  $output.energy = spark.energy;

  $output.lines = spark.lines;

`,
};
