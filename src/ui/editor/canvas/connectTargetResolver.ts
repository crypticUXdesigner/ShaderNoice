/**
 * Magnetic nearest-port resolution while dragging a connection wire.
 * Shared by hover, preview snap, and release fallback so all paths stay in sync.
 */

import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { NodeRenderMetrics } from '../NodeRenderer';
import { canConvertShaderPortTypes } from '../../../utils/shaderPortTypes';
import { getConnectMagneticRadiusScreen, screenHitRadiusToCanvas } from './portHitRadius';

export interface PortHit {
  nodeId: string;
  port: string;
  isOutput: boolean;
  parameter?: string;
  snapPosition?: { x: number; y: number };
}

export interface ConnectSource {
  nodeId: string;
  port: string;
  isOutput: boolean;
  parameter?: string | null;
}

export interface ConnectTargetResolverDeps {
  graph: NodeGraph;
  nodeSpecs: Map<string, NodeSpec>;
  nodeMetrics: Map<string, NodeRenderMetrics>;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  getViewState: () => { panX: number; panY: number; zoom: number };
  hitTestPort: (screenX: number, screenY: number) => PortHit | null;
  getParamPortPositionsFromDOM?: () => Map<string, { x: number; y: number }>;
  getHeaderOutputPortPositionsFromDOM?: () => Map<string, { x: number; y: number }>;
}

function paramHasPort(spec: NodeSpec, paramName: string): boolean {
  return !spec.parameterLayout?.parametersWithoutPorts?.includes(paramName);
}

function getSourceOutputType(
  source: ConnectSource,
  graph: NodeGraph,
  nodeSpecs: Map<string, NodeSpec>
): string | null {
  const node = graph.nodes.find((n) => n.id === source.nodeId);
  if (!node) return null;
  const spec = nodeSpecs.get(node.type);
  if (!spec) return null;
  if (source.isOutput) {
    const output = spec.outputs.find((p) => p.name === source.port);
    return output?.type ?? null;
  }
  return null;
}

function getSourceInputType(
  source: ConnectSource,
  graph: NodeGraph,
  nodeSpecs: Map<string, NodeSpec>
): string | null {
  const node = graph.nodes.find((n) => n.id === source.nodeId);
  if (!node) return null;
  const spec = nodeSpecs.get(node.type);
  if (!spec) return null;
  if (!source.isOutput) {
    const input = spec.inputs.find((p) => p.name === source.port);
    return input?.type ?? null;
  }
  return null;
}

function getTargetInputType(
  target: PortHit,
  graph: NodeGraph,
  nodeSpecs: Map<string, NodeSpec>
): string | null {
  const node = graph.nodes.find((n) => n.id === target.nodeId);
  if (!node) return null;
  const spec = nodeSpecs.get(node.type);
  if (!spec) return null;
  if (target.parameter) {
    const paramSpec = spec.parameters[target.parameter];
    if (!paramSpec || (paramSpec.type !== 'float' && paramSpec.type !== 'int')) return null;
    return paramSpec.type;
  }
  if (!target.isOutput) {
    const input = spec.inputs.find((p) => p.name === target.port);
    return input?.type ?? null;
  }
  return null;
}

function getTargetOutputType(
  target: PortHit,
  graph: NodeGraph,
  nodeSpecs: Map<string, NodeSpec>
): string | null {
  const node = graph.nodes.find((n) => n.id === target.nodeId);
  if (!node) return null;
  const spec = nodeSpecs.get(node.type);
  if (!spec || !target.isOutput) return null;
  const output = spec.outputs.find((p) => p.name === target.port);
  return output?.type ?? null;
}

/** Direction + type compatibility for a connect drag target. */
export function isValidConnectTarget(
  source: ConnectSource,
  target: PortHit,
  deps: ConnectTargetResolverDeps
): boolean {
  if (target.nodeId === source.nodeId) return false;

  if (source.isOutput) {
    if (target.isOutput) return false;
    const outputType = getSourceOutputType(source, deps.graph, deps.nodeSpecs);
    const inputType = getTargetInputType(target, deps.graph, deps.nodeSpecs);
    if (!outputType || !inputType) return false;
    return canConvertShaderPortTypes(outputType, inputType);
  }

  if (!target.isOutput) return false;
  const outputType = getTargetOutputType(target, deps.graph, deps.nodeSpecs);
  const inputType = getSourceInputType(source, deps.graph, deps.nodeSpecs);
  if (!outputType || !inputType) return false;
  return canConvertShaderPortTypes(outputType, inputType);
}

function getPortCanvasPosition(
  nodeId: string,
  port: string,
  isOutput: boolean,
  parameter: string | undefined,
  deps: ConnectTargetResolverDeps
): { x: number; y: number } | null {
  const metrics = deps.nodeMetrics.get(nodeId);
  if (!metrics) return null;

  if (parameter) {
    const domPos = deps.getParamPortPositionsFromDOM?.().get(`${nodeId}:${parameter}`);
    return domPos ?? metrics.parameterInputPortPositions.get(parameter) ?? null;
  }

  if (isOutput) {
    const domPos = deps.getHeaderOutputPortPositionsFromDOM?.().get(`${nodeId}:output:${port}`);
    return domPos ?? metrics.portPositions.get(`output:${port}`) ?? null;
  }

  return metrics.portPositions.get(`input:${port}`) ?? null;
}

/**
 * Nearest type-compatible port within a screen-space radius (excluding same node).
 */
export function findNearestConnectTarget(
  source: ConnectSource,
  screenX: number,
  screenY: number,
  deps: ConnectTargetResolverDeps,
  maxScreenDist?: number
): PortHit | null {
  const maxRadiusScreen = maxScreenDist ?? getConnectMagneticRadiusScreen();
  const maxCanvasDist = screenHitRadiusToCanvas(maxRadiusScreen, deps.getViewState().zoom);

  let best: { hit: PortHit; dist: number } | null = null;

  // Front-to-back (reverse graph order): closest wins; ties keep topmost node.
  for (let i = deps.graph.nodes.length - 1; i >= 0; i--) {
    const node = deps.graph.nodes[i];
    const spec = deps.nodeSpecs.get(node.type);
    const metrics = deps.nodeMetrics.get(node.id);
    if (!spec || !metrics || node.id === source.nodeId) continue;

    const nodeCandidates: PortHit[] = [];

    if (source.isOutput) {
      for (const input of spec.inputs) {
        nodeCandidates.push({ nodeId: node.id, port: input.name, isOutput: false });
      }
      for (const [paramName, paramSpec] of Object.entries(spec.parameters)) {
        if (
          (paramSpec.type === 'float' || paramSpec.type === 'int') &&
          paramHasPort(spec, paramName)
        ) {
          const snapPosition =
            deps.getParamPortPositionsFromDOM?.().get(`${node.id}:${paramName}`) ??
            metrics.parameterInputPortPositions.get(paramName);
          nodeCandidates.push({
            nodeId: node.id,
            port: '',
            isOutput: false,
            parameter: paramName,
            snapPosition: snapPosition ?? undefined,
          });
        }
      }
    } else {
      for (const output of spec.outputs) {
        nodeCandidates.push({ nodeId: node.id, port: output.name, isOutput: true });
      }
    }

    for (const candidate of nodeCandidates) {
      if (!isValidConnectTarget(source, candidate, deps)) continue;

      const portCanvas = getPortCanvasPosition(
        candidate.nodeId,
        candidate.port,
        candidate.isOutput,
        candidate.parameter,
        deps
      );
      if (!portCanvas) continue;

      const pointerCanvas = deps.screenToCanvas(screenX, screenY);
      const canvasDist = Math.hypot(pointerCanvas.x - portCanvas.x, pointerCanvas.y - portCanvas.y);
      if (canvasDist > maxCanvasDist) continue;
      const dist = canvasDist * (Number.isFinite(deps.getViewState().zoom) && deps.getViewState().zoom > 0
        ? deps.getViewState().zoom
        : 1);

      const hit: PortHit = {
        ...candidate,
        snapPosition: candidate.parameter
          ? candidate.snapPosition ?? portCanvas
          : candidate.snapPosition,
      };

      if (!best || dist < best.dist) {
        best = { hit, dist };
      }
    }
  }

  return best?.hit ?? null;
}

/**
 * Resolve connect target: prefer strict hitTestPort when valid, else magnetic nearest.
 */
export function resolveConnectTarget(
  source: ConnectSource,
  screenX: number,
  screenY: number,
  deps: ConnectTargetResolverDeps,
  maxScreenDist?: number
): PortHit | null {
  const strictHit = deps.hitTestPort(screenX, screenY);
  if (strictHit && isValidConnectTarget(source, strictHit, deps)) {
    if (strictHit.parameter && !strictHit.snapPosition) {
      const snap =
        deps.getParamPortPositionsFromDOM?.().get(`${strictHit.nodeId}:${strictHit.parameter}`) ??
        deps.nodeMetrics.get(strictHit.nodeId)?.parameterInputPortPositions.get(strictHit.parameter);
      if (snap) {
        return { ...strictHit, snapPosition: snap };
      }
    }
    return strictHit;
  }

  return findNearestConnectTarget(source, screenX, screenY, deps, maxScreenDist);
}
