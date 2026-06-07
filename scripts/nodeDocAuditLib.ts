/**
 * Shared helpers for node-documentation audits (coverage + quality).
 * Uses nodeSystemSpecs + layout-derived exposed controls (mirrors NodeBody).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { nodeSystemSpecs } from '../src/shaders/nodes/index';
import { autoGenerateLayout } from '../src/utils/layoutMigration';
import { getParameterUIRegistry } from '../src/ui/editor/rendering/ParameterUIRegistry';
import { isEnumParameter } from '../src/utils/parameterEnumMappings';
import {
  layoutParameterVisible,
  layoutSectionVisible,
} from '../src/utils/parameterVisibility';
import type { NodeInstance } from '../src/data-model/types';
import type {
  LayoutElement,
  NodeSpec,
  ParameterLayout,
  ParameterUISelection,
} from '../src/types/nodeSpec';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, '..');
export const NODE_DOC_PATH = path.join(REPO_ROOT, 'src/data/node-documentation.json');

export type NodeDocumentationFile = {
  helpItems: Record<string, NodeHelpItem>;
};

export type NodeHelpItem = {
  title?: string;
  titleType?: string;
  tagline?: string;
  description?: string;
  inputs?: unknown[];
  outputs?: unknown[];
  parameters?: Array<{ name: string; description?: string }>;
  examples?: string[];
  advanced?: string;
  relatedItems?: string[];
};

export type JargonIssue = {
  id: string;
  term: string;
};

export type QualityReport = {
  registryCount: number;
  missingDoc: string[];
  longDesc: Array<{ id: string; len: number; category: string }>;
  noExamples: string[];
  needsExamples: string[];
  controlsMismatch: Array<{
    id: string;
    category: string;
    exposed: string[];
    doc: string[];
    missingInDoc: string[];
    extraInDoc: string[];
  }>;
  missingControlsDoc: Array<{ id: string; category: string; exposedCount: number }>;
  jargonWithoutGloss: JargonIssue[];
  byCategory: Record<
    string,
    { total: number; longDesc: number; noExamples: number; controlsMismatch: number }
  >;
};

const JARGON_CHECKS: Array<{ term: RegExp; glossHint: RegExp; label: string }> = [
  { term: /\bSDF\b/, glossHint: /signed distance/i, label: 'SDF' },
  { term: /\bFBM\b/i, glossHint: /fractal|brownian/i, label: 'FBM' },
  { term: /\bfBm\b/, glossHint: /fractal|brownian/i, label: 'fBm' },
  { term: /\braymarch/i, glossHint: /march|distance field|step along/i, label: 'raymarch' },
  { term: /\bWorley\b/, glossHint: /cellular|cell noise|nearest point/i, label: 'Worley' },
  { term: /\bOKLCH\b/, glossHint: /lightness|chroma|hue|perceptual/i, label: 'OKLCH' },
];

function paramLabel(spec: NodeSpec, paramName: string): string {
  return spec.parameters[paramName]?.label ?? paramName;
}

function defaultNodeForSpec(spec: NodeSpec): NodeInstance {
  const parameters: Record<string, number | number[][]> = {};
  for (const [name, p] of Object.entries(spec.parameters)) {
    const def = p.default;
    if (Array.isArray(def)) {
      parameters[name] = def as number[][];
    } else if (typeof def === 'number' && Number.isFinite(def)) {
      parameters[name] = def;
    } else {
      parameters[name] = 0;
    }
  }
  return { parameters } as NodeInstance;
}

function getParamUIType(
  spec: NodeSpec,
  paramName: string,
  parameterUI?: Record<string, ParameterUISelection>,
): ParameterUISelection {
  const override = parameterUI?.[paramName];
  if (override) return override;
  if (isEnumParameter(spec.id, paramName)) return 'enum';
  return getParameterUIRegistry()
    .getRenderer(spec, paramName)
    .getUIType() as ParameterUISelection;
}

function addParamLabels(
  spec: NodeSpec,
  paramNames: string[],
  parameterUI: Record<string, ParameterUISelection> | undefined,
  labels: string[],
): void {
  for (const paramName of paramNames) {
    if (!spec.parameters[paramName]) continue;
    const uiType = getParamUIType(spec, paramName, parameterUI);
    if (uiType === 'bezier' || uiType === 'range') continue;
    labels.push(paramLabel(spec, paramName));
  }
}

function collectFromElement(
  spec: NodeSpec,
  element: LayoutElement,
  node: NodeInstance,
  labels: string[],
): void {
  switch (element.type) {
    case 'grid': {
      if (!layoutSectionVisible(element.visibleWhen, node, spec)) break;
      const headerToggle = element.headerToggleParameter;
      const headerToggleSpec = headerToggle ? spec.parameters[headerToggle] : undefined;
      const headerToggleUi =
        headerToggle && headerToggleSpec
          ? getParamUIType(spec, headerToggle, element.parameterUI)
          : null;
      const useHeaderToggle = Boolean(
        element.label && headerToggle && headerToggleSpec && headerToggleUi === 'toggle',
      );
      if (useHeaderToggle && headerToggle) {
        labels.push(paramLabel(spec, headerToggle));
      }
      for (const paramName of element.parameters) {
        if (!spec.parameters[paramName]) continue;
        if (useHeaderToggle && paramName === headerToggle) continue;
        if (!layoutParameterVisible(element.parameterVisibleWhen?.[paramName], node, spec)) {
          continue;
        }
        addParamLabels(spec, [paramName], element.parameterUI, labels);
      }
      break;
    }
    case 'auto-grid': {
      addParamLabels(spec, Object.keys(spec.parameters), undefined, labels);
      break;
    }
    case 'remap-range': {
      addParamLabels(spec, ['inMin', 'inMax', 'outMin', 'outMax'], undefined, labels);
      break;
    }
    case 'bezier-editor': {
      const params = element.parameters ?? ['x1', 'y1', 'x2', 'y2'];
      addParamLabels(spec, params, undefined, labels);
      break;
    }
    case 'bezier-editor-row': {
      for (const editorParams of element.editors) {
        addParamLabels(spec, editorParams, undefined, labels);
      }
      break;
    }
    case 'coord-pad': {
      addParamLabels(spec, element.parameters, undefined, labels);
      break;
    }
    case 'color-picker': {
      const params = element.parameters ?? ['l', 'c', 'h'];
      addParamLabels(spec, params, undefined, labels);
      break;
    }
    case 'color-picker-row':
    case 'color-picker-row-with-ports': {
      for (const picker of element.pickers) {
        addParamLabels(spec, picker, undefined, labels);
      }
      if (spec.parameters.swapColors) {
        labels.push(paramLabel(spec, 'swapColors'));
      }
      break;
    }
    case 'color-map-preview':
      break;
    case 'frequency-range': {
      const paramSpec = spec.parameters[element.parameter];
      if (paramSpec?.label) labels.push(paramSpec.label);
      else labels.push(element.parameter);
      break;
    }
    case 'arrangement-track-filter': {
      if (spec.parameters.trackFilterMode) {
        labels.push(element.label ?? paramLabel(spec, 'trackFilterMode'));
      }
      if (spec.id === 'arrangement-notes' && spec.parameters.noteColorMode) {
        labels.push(paramLabel(spec, 'noteColorMode'));
      }
      break;
    }
    case 'custom':
      break;
    default:
      break;
  }
}

/** UI-exposed control labels for Guide Controls parity (layout-aware). */
export function getExposedParamLabels(spec: NodeSpec): string[] {
  const layout: ParameterLayout = spec.parameterLayout ?? autoGenerateLayout(spec);
  const node = defaultNodeForSpec(spec);
  const labels: string[] = [];
  for (const element of layout.elements) {
    collectFromElement(spec, element, node, labels);
  }
  return [...new Set(labels)];
}

export function loadNodeDocumentation(): NodeDocumentationFile {
  return JSON.parse(fs.readFileSync(NODE_DOC_PATH, 'utf8')) as NodeDocumentationFile;
}

export function getRegistrySpecs(): NodeSpec[] {
  return nodeSystemSpecs;
}

export function getRegistryIds(): string[] {
  return nodeSystemSpecs.map((s) => s.id).sort();
}

export function getDocNodeIds(doc: NodeDocumentationFile): string[] {
  return Object.keys(doc.helpItems)
    .filter((k) => k.startsWith('node:'))
    .map((k) => k.slice('node:'.length))
    .sort();
}

export function findJargonIssues(id: string, description: string): JargonIssue[] {
  const issues: JargonIssue[] = [];
  for (const { term, glossHint, label } of JARGON_CHECKS) {
    if (term.test(description) && !glossHint.test(description)) {
      issues.push({ id, term: label });
    }
  }
  return issues;
}

export function buildQualityReport(doc: NodeDocumentationFile): QualityReport {
  const items = doc.helpItems;
  const missingDoc: string[] = [];
  const longDesc: QualityReport['longDesc'] = [];
  const noExamples: string[] = [];
  const needsExamples: string[] = [];
  const controlsMismatch: QualityReport['controlsMismatch'] = [];
  const missingControlsDoc: QualityReport['missingControlsDoc'] = [];
  const jargonWithoutGloss: JargonIssue[] = [];
  const byCategory: QualityReport['byCategory'] = {};

  for (const spec of nodeSystemSpecs) {
    const id = spec.id;
    const cat = spec.category ?? 'unknown';
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, longDesc: 0, noExamples: 0, controlsMismatch: 0 };
    }
    byCategory[cat].total++;

    const help = items[`node:${id}`];
    if (!help) {
      missingDoc.push(id);
      continue;
    }

    const descLen = (help.description ?? '').length;
    if (descLen > 400) {
      longDesc.push({ id, len: descLen, category: cat });
      byCategory[cat].longDesc++;
    }

    const exampleCount = help.examples?.length ?? 0;
    if (exampleCount === 0) {
      noExamples.push(id);
      byCategory[cat].noExamples++;
    }

    const exposed = getExposedParamLabels(spec);
    const inputCount = spec.inputs?.length ?? 0;
    if ((exposed.length >= 2 || inputCount >= 2) && exampleCount < 2) {
      needsExamples.push(id);
    }

    const docParams = (help.parameters ?? []).map((p) => p.name.trim());
    const docLower = new Set(docParams.map((n) => n.toLowerCase()));
    const exposedLower = exposed.map((l) => l.toLowerCase());

    if (exposed.length > 0 && docParams.length === 0) {
      missingControlsDoc.push({ id, category: cat, exposedCount: exposed.length });
      byCategory[cat].controlsMismatch++;
    } else if (exposed.length > 0 && docParams.length > 0) {
      const missingInDoc = exposed.filter((l) => !docLower.has(l.toLowerCase()));
      const exposedSet = new Set(exposedLower);
      const extraInDoc = docParams.filter((l) => !exposedSet.has(l.toLowerCase()));
      if (missingInDoc.length || extraInDoc.length) {
        controlsMismatch.push({
          id,
          category: cat,
          exposed,
          doc: docParams,
          missingInDoc,
          extraInDoc,
        });
        byCategory[cat].controlsMismatch++;
      }
    }

    jargonWithoutGloss.push(...findJargonIssues(id, help.description ?? ''));
  }

  return {
    registryCount: nodeSystemSpecs.length,
    missingDoc,
    longDesc,
    noExamples,
    needsExamples,
    controlsMismatch,
    missingControlsDoc,
    jargonWithoutGloss,
    byCategory,
  };
}
