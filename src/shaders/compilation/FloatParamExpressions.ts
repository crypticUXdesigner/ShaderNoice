import type { NodeGraph } from '../../data-model/types';
import type { NodeSpec } from '../../types/nodeSpec';
import { automationLaneHasEvaluableRegions } from '../../utils/automationEvaluator';
import { formatParamLiteralForGlsl } from './MainCodeGeneratorUtils';
import { resolveFloatParameterInputVarsFromConnections } from './resolveFloatParameterInputVarsFromConnections';

export type FloatParamExpressionMap = Record<string, string> & {
  __hasInputConnections?: boolean;
};

function clampFloatExpression(expr: string, paramSpec: NodeSpec['parameters'][string] | undefined): string {
  if (!paramSpec || paramSpec.type !== 'float') return expr;
  const min = typeof paramSpec.min === 'number' ? paramSpec.min : 0;
  const max = typeof paramSpec.max === 'number' ? paramSpec.max : 1;
  const minStr = formatParamLiteralForGlsl(min, { type: 'float' });
  const maxStr = formatParamLiteralForGlsl(max, { type: 'float' });
  return `clamp((${expr}), ${minStr}, ${maxStr})`;
}

export function getAutomationExpressionForParam(
  nodeId: string,
  paramName: string,
  graph: NodeGraph,
  paramSpec: NodeSpec['parameters'][string] | undefined
): string | null {
  if (paramSpec?.type !== 'float' || !graph?.automation?.lanes) return null;
  const lane = graph.automation.lanes.find(
    (l) => l.nodeId === nodeId && l.paramName === paramName
  );
  if (!lane || !automationLaneHasEvaluableRegions(lane)) return null;
  return `evalAutomation_${sanitizeAutomationLaneId(lane.id)}(uTimelineTime)`;
}

function sanitizeAutomationLaneId(laneId: string): string {
  let id = laneId.replace(/[^a-zA-Z0-9]/g, '_');
  if (!id) id = 'lane';
  if (/^\d/.test(id)) id = 'a' + id;
  return id;
}

export function buildFloatParamExpressions(
  node: NodeGraph['nodes'][number],
  nodeSpec: NodeSpec,
  graph: NodeGraph,
  executionOrder: string[],
  uniformNames: Map<string, string>,
  variableNames: Map<string, Map<string, string>>,
  nodeSpecs: Map<string, NodeSpec>,
  generateParameterCombination: (
    configValue: string,
    inputValue: string,
    mode: 'override' | 'add' | 'subtract' | 'multiply',
    paramType: 'float' | 'int'
  ) => string,
  // Reserved for future use; included so callers can share the same helper signature
  // across compilation components that may need regex escaping.
  _escapeRegex: (str: string) => string
): FloatParamExpressionMap {
  const expressions: FloatParamExpressionMap = {} as FloatParamExpressionMap;

  const parameterInputVars = resolveFloatParameterInputVarsFromConnections(
    node,
    nodeSpec,
    graph,
    executionOrder,
    variableNames,
    uniformNames,
    nodeSpecs
  );

  // Best-effort check: list declared node output globals (same names FunctionGenerator will validate).
  const allValidVars = new Set<string>();
  for (const nodeVars of variableNames.values()) {
    for (const varName of nodeVars.values()) {
      allValidVars.add(varName);
    }
  }

  const paramVarNamePattern = /\bnode_[a-zA-Z0-9_]+_[a-zA-Z0-9_]+\b/g;
  for (const [paramName, varRef] of parameterInputVars.entries()) {
    const matches = varRef.match(paramVarNamePattern);
    if (!matches) continue;
    for (const varName of matches) {
      if (!allValidVars.has(varName)) {
        // Do not drop the mapping: dropping makes $param.* fall through to 0.0 in function bodies
        // (e.g. box-torus-sdf sceneSDF) while the UI still shows a correct CPU-evaluated live value.
        // FunctionGenerator already replaces undeclared node_* refs with 0.0 when truly invalid.
        console.warn(
          `[NodeShaderCompiler] Parameter ${paramName} on ${node.id} (${nodeSpec.id}): ` +
            `GLSL expression "${varRef}" references "${varName}" which is not in the emitted output set. ` +
            `If this is a false positive, the connection is kept; otherwise compilation may warn or substitute 0.0.`
        );
      }
    }
  }

  let hasInputConnections = false;

  // Build final expressions for float parameters, preserving existing precedence rules
  for (const paramName of Object.keys(nodeSpec.parameters)) {
    const paramSpec = nodeSpec.parameters[paramName];
    if (paramSpec.type !== 'float') {
      continue;
    }

    const paramInputVar = parameterInputVars.get(paramName);
    if (paramInputVar) {
      hasInputConnections = true;
      const inputMode =
        node.parameterInputModes?.[paramName] ||
        paramSpec.inputMode ||
        'override';
      if (inputMode === 'override') {
        expressions[paramName] = clampFloatExpression(paramInputVar, paramSpec);
      } else {
        const automationExpr = getAutomationExpressionForParam(
          node.id,
          paramName,
          graph,
          paramSpec
        );
        const uniformName = uniformNames.get(`${node.id}.${paramName}`);
        const configValue =
          automationExpr ??
          uniformName ??
          String(
            node.parameters[paramName] ??
              paramSpec?.default ??
              '0.0'
          );
        const paramType: 'float' | 'int' = 'float';
        const combinedExpr = generateParameterCombination(
          configValue,
          paramInputVar,
          inputMode,
          paramType
        );
        expressions[paramName] = clampFloatExpression(combinedExpr, paramSpec);
      }
    } else {
      const automationExpr = getAutomationExpressionForParam(
        node.id,
        paramName,
        graph,
        paramSpec
      );
      if (automationExpr) {
        expressions[paramName] = clampFloatExpression(automationExpr, paramSpec);
      } else {
        const uniformName = uniformNames.get(`${node.id}.${paramName}`);
        if (uniformName) {
          expressions[paramName] = clampFloatExpression(uniformName, paramSpec);
        }
      }
    }
  }

  if (hasInputConnections) {
    expressions.__hasInputConnections = true;
  }

  return expressions;
}

