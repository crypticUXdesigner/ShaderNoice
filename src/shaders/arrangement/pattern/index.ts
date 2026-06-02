export {

  ARRANGEMENT_PATTERN_NODE_TYPES,

  ARRANGEMENT_PATTERN_NOTE_BAKE_NODE_TYPES,

  ARRANGEMENT_PATTERN_ONSET_NODE_TYPES,

  ARRANGEMENT_PATTERN_REGION_NODE_TYPES,

  ARRANGEMENT_PATTERN_TRACK_ENERGY_NODE_TYPES,

  DEFAULT_PATTERN_BIN_WIDTH_SECONDS,

  MAX_PATTERN_ACTIVE_SITES,

  MAX_PATTERN_BOUNDARY_EVENTS,

  MAX_PATTERN_BOUNDARY_LOOP,

  MAX_PATTERN_SHUTTER_BOUNDARY_LOOP,

  MAX_PATTERN_ONSET_LOOP,
  MAX_PATTERN_COMET_ONSET_LOOP,
  MAX_PATTERN_SPARK_GRID_ONSET_LOOP,

  MAX_PATTERN_RELEASE_BIN_LOOP,

  MAX_PATTERN_WINDOW_BIN_LOOP,

  MAX_PATTERN_PC_BAKE_VEC4S,

  MAX_PATTERN_TIME_BINS,

  MAX_PATTERN_TRACK_LOOP,

  graphUsesArrangementPatternSharedHelpers,

  isArrangementPatternNodeType,

  isArrangementPatternNoteBakeNodeType,

  isArrangementPatternOnsetNodeType,

  isArrangementPatternRegionNodeType,

  isArrangementPatternTrackEnergyNodeType,

  type ArrangementPatternNodeType,

  type ArrangementPatternOnsetNodeType,

} from './constants';



export {

  arrangementPatternOnsetVisibleTimeWindow,

  clampOnsetLoopRangeForPreviewBudget,

  filterNotePatternForNode,

  findOnsetIndexRangeForWindow,

  packArrangementActiveNoteBinsForGlsl,

  packArrangementNoteOnsetsForGlsl,

  packArrangementNotePatternData,

  packArrangementNoteTimeBinsForGlsl,

  packArrangementPitchClassEnergyForGlsl,

  readArrangementPatternPackOptions,

  resetNotePatternBakeDiagnosticsForTests,

  resolvePatternBinLayout,

  resolvePatternOnsetPreviewLoopBudget,

  sampleNoteDensityWindow,

  samplePitchClassEnergyAt,
  samplePitchClassCompassSectorEnergyAt,
  midiPitchToPatternSector,
  countActivePitchClassesAt,

  durationCometDurationScale,

  durationCometTrailLength,

  type NotePatternActiveBin,

  type NotePatternPackResult,

  type NotePatternTimeBin,

  type PackedPatternOnset,

} from './notePatternBake';



export {

  ARRANGEMENT_PATTERN_NOTE_BAKE_PLACEHOLDER,

  buildNotePatternGlslBake,

  buildNotePatternWgslBake,

  buildNoteRippleFieldWgslNodeHelper,

  buildPitchClassCompassWgslNodeHelper,

  buildRhythmStripeFieldWgslNodeHelper,

  buildVelocitySparkGridWgslNodeHelper,

  buildDurationCometTrailsWgslNodeHelper,

  buildNoteGravityWarpWgslNodeHelper,

  buildChordVoronoiBloomWgslNodeHelper,

  injectArrangementPatternNoteBake,

} from './notePatternBakeGlsl';



export {

  findBoundaryIndexRangeForWindow,

  filterRegionPatternForNode,

  packArrangementRegionBoundariesForGlsl,

  packArrangementRegionPatternData,

  packArrangementTrackEnergyBinsForGlsl,

  readRegionKindFilterOptions,

  sampleTrackEnergyAt,

  type PackedPatternBoundary,

  type RegionPatternPackResult,

  type TrackEnergyBin,

} from './regionBoundaryBake';



export {

  ARRANGEMENT_PATTERN_REGION_BAKE_PLACEHOLDER,

  buildRegionPatternGlslBake,

  buildRegionPatternWgslBake,

  buildBoundaryShutterRaysWgslNodeHelper,

  buildTrackHaloLatticeWgslNodeHelper,

  injectArrangementPatternRegionBake,

} from './regionBoundaryBakeGlsl';



export {

  emitArrangementPatternHelpersGlsl,

  emitArrangementPatternHelpersWgsl,

  registerArrangementPatternSharedWgslHelpers,

} from './arrangementPatternHelpersGlsl';


