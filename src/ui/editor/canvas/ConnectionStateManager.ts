/**
 * ConnectionStateManager
 * 
 * Manages connection state and temporary connection rendering for the node editor canvas.
 * Handles connection preview rendering, connection state variables, and connection hover logic.
 */

import type { NodeGraph } from '../../../data-model/types';
import type { NodeSpec } from '../../../types/nodeSpec';
import type { NodeRenderMetrics } from '../NodeRenderer';
import { getCSSColor, getCSSVariableAsNumber, getCSSColorRGBA } from '../../../utils/cssTokens';
import {
  computeConnectionBezierControlPoints,
  connectionPreviewMarchForward,
  portSideFromEndpoint,
  previewTargetPortSide,
} from '../connectionBezier';
import {
  ConnectionPreviewAnimator,
  CONNECTION_PREVIEW_DASH_PATTERN,
} from '../ConnectionPreviewAnimator';
import { getConnectionDragPreviewThresholdCanvas } from './portHitRadius';
import type { ConnectSource, PortHit } from './connectTargetResolver';

export interface ConnectionState {
  isConnecting: boolean;
  connectionStartNodeId: string | null;
  connectionStartPort: string | null;
  connectionStartParameter: string | null;
  connectionStartIsOutput: boolean;
  /** DOM-derived source port position (canvas coords). Use when connecting from param port - metrics can mismatch DOM layout. */
  connectionStartSnapPosition?: { x: number; y: number };
  connectionMouseX: number;
  connectionMouseY: number;
  hoveredPort: {
    nodeId: string;
    port: string;
    isOutput: boolean;
    parameter?: string;
    snapPosition?: { x: number; y: number };
  } | null;
}

export interface ConnectionStateManagerDependencies {
  graph: NodeGraph;
  nodeSpecs: Map<string, NodeSpec>;
  nodeMetrics: Map<string, NodeRenderMetrics>;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  getViewState: () => { panX: number; panY: number; zoom: number };
  ctx: CanvasRenderingContext2D;
  hitTestPort: (screenX: number, screenY: number) => {
    nodeId: string;
    port: string;
    isOutput: boolean;
    parameter?: string;
    snapPosition?: { x: number; y: number };
  } | null;
  resolveConnectTarget?: (
    source: ConnectSource,
    screenX: number,
    screenY: number
  ) => PortHit | null;
  requestRender?: () => void;
  onConnectingChange?: (isConnecting: boolean) => void;
}

export class ConnectionStateManager {
  private state: ConnectionState;
  private dependencies: ConnectionStateManagerDependencies;
  private previewAnimator: ConnectionPreviewAnimator;

  constructor(dependencies: ConnectionStateManagerDependencies) {
    this.dependencies = dependencies;
    this.previewAnimator = new ConnectionPreviewAnimator(() => {
      this.dependencies.requestRender?.();
    });
    this.state = {
      isConnecting: false,
      connectionStartNodeId: null,
      connectionStartPort: null,
      connectionStartParameter: null,
      connectionStartIsOutput: false,
      connectionMouseX: 0,
      connectionMouseY: 0,
      hoveredPort: null
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Set connection state
   */
  setState(state: Partial<ConnectionState>): void {
    const wasConnecting = this.state.isConnecting;
    this.state = { ...this.state, ...state };
    const isConnecting = this.state.isConnecting;

    if (state.isConnecting === true && !wasConnecting) {
      this.previewAnimator.setMarchForward(connectionPreviewMarchForward(this.state.connectionStartIsOutput));
      this.previewAnimator.start(connectionPreviewMarchForward(this.state.connectionStartIsOutput));
      this.dependencies.onConnectingChange?.(true);
    } else if (state.isConnecting === false && wasConnecting) {
      this.previewAnimator.stop();
      this.dependencies.onConnectingChange?.(false);
    } else if (isConnecting && state.connectionStartIsOutput !== undefined) {
      this.previewAnimator.setMarchForward(connectionPreviewMarchForward(this.state.connectionStartIsOutput));
    }
  }

  /**
   * Get whether currently connecting
   */
  getIsConnecting(): boolean {
    return this.state.isConnecting;
  }

  /**
   * Get connection start node ID
   */
  getConnectionStartNodeId(): string | null {
    return this.state.connectionStartNodeId;
  }

  /**
   * Get connection start port
   */
  getConnectionStartPort(): string | null {
    return this.state.connectionStartPort;
  }

  /**
   * Get connection start parameter
   */
  getConnectionStartParameter(): string | null {
    return this.state.connectionStartParameter;
  }

  /**
   * Get whether connection start is output
   */
  getConnectionStartIsOutput(): boolean {
    return this.state.connectionStartIsOutput;
  }

  /**
   * Get connection mouse position
   */
  getConnectionMousePosition(): { x: number; y: number } {
    return {
      x: this.state.connectionMouseX,
      y: this.state.connectionMouseY
    };
  }

  /**
   * Get hovered port
   */
  getHoveredPort(): {
    nodeId: string;
    port: string;
    isOutput: boolean;
    parameter?: string;
  } | null {
    return this.state.hoveredPort;
  }

  /**
   * Update hovered port based on mouse position
   * This handles connection hover logic during connection drag
   */
  updateHoveredPort(mouseX: number, mouseY: number): void {
    if (!this.state.isConnecting || !this.state.connectionStartNodeId) {
      this.state.hoveredPort = null;
      return;
    }

    const source = this.getConnectSource();
    if (!source) {
      this.state.hoveredPort = null;
      return;
    }

    this.state.hoveredPort =
      this.dependencies.resolveConnectTarget?.(source, mouseX, mouseY) ?? null;
  }

  private getConnectSource(): ConnectSource | null {
    if (!this.state.connectionStartNodeId) return null;
    return {
      nodeId: this.state.connectionStartNodeId,
      port: this.state.connectionStartPort ?? '',
      isOutput: this.state.connectionStartIsOutput,
      parameter: this.state.connectionStartParameter,
    };
  }

  /**
   * Update connection mouse position
   */
  updateConnectionMousePosition(mouseX: number, mouseY: number): void {
    this.state.connectionMouseX = mouseX;
    this.state.connectionMouseY = mouseY;
  }

  /**
   * Start connection from a port
   */
  startConnection(
    nodeId: string,
    port: string,
    parameter: string | null,
    isOutput: boolean,
    mouseX: number,
    mouseY: number
  ): void {
    this.setState({
      isConnecting: true,
      connectionStartNodeId: nodeId,
      connectionStartPort: port,
      connectionStartParameter: parameter,
      connectionStartIsOutput: isOutput,
      connectionMouseX: mouseX,
      connectionMouseY: mouseY,
      hoveredPort: null
    });
  }

  /**
   * End connection
   */
  endConnection(): void {
    this.setState({
      isConnecting: false,
      connectionStartNodeId: null,
      connectionStartPort: null,
      connectionStartParameter: null,
      connectionStartIsOutput: false,
      connectionStartSnapPosition: undefined,
      connectionMouseX: 0,
      connectionMouseY: 0,
      hoveredPort: null
    });
  }

  /**
   * Update dependencies (called when graph or metrics change)
   */
  updateDependencies(dependencies: Partial<ConnectionStateManagerDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
  }

  /**
   * Render temporary connection preview during connection drag
   * This renders the connection line from the source port to the mouse cursor
   * @param ctx - Optional context to render to (e.g. top overlay). Uses main canvas ctx when omitted.
   */
  renderTemporaryConnection(ctx?: CanvasRenderingContext2D): void {
    if (!this.state.connectionStartNodeId) return;
    const targetCtx = ctx ?? this.dependencies.ctx;
    
    const sourceNode = this.dependencies.graph.nodes.find(n => n.id === this.state.connectionStartNodeId);
    if (!sourceNode) return;
    
    const sourceSpec = this.dependencies.nodeSpecs.get(sourceNode.type);
    const sourceMetrics = this.dependencies.nodeMetrics.get(sourceNode.id);
    if (!sourceSpec || !sourceMetrics) return;
    
    // Get actual port position
    let sourcePortPos: { x: number; y: number } | undefined;
    
    if (this.state.connectionStartParameter) {
      // Parameter port: prefer DOM-derived snap position (matches actual layout); fallback to metrics
      sourcePortPos = this.state.connectionStartSnapPosition ?? sourceMetrics.parameterInputPortPositions.get(this.state.connectionStartParameter);
    } else if (this.state.connectionStartPort) {
      // Regular port
      const portKey = `${this.state.connectionStartIsOutput ? 'output' : 'input'}:${this.state.connectionStartPort}`;
      sourcePortPos = sourceMetrics.portPositions.get(portKey);
    }
    
    if (!sourcePortPos) return;
    
    const canvasPos = this.dependencies.screenToCanvas(this.state.connectionMouseX, this.state.connectionMouseY);
    let targetX = canvasPos.x;
    let targetY = canvasPos.y;
    let targetSide = previewTargetPortSide(this.state.connectionStartIsOutput);
    
    let isSnapped = false;
    
    // Use hoveredPort when set by PortConnectHandler; otherwise resolve (strict + magnetic).
    const source = this.getConnectSource();
    const portHit =
      this.state.hoveredPort ??
      (source
        ? this.dependencies.resolveConnectTarget?.(source, this.state.connectionMouseX, this.state.connectionMouseY) ?? null
        : this.dependencies.hitTestPort(this.state.connectionMouseX, this.state.connectionMouseY));
    if (portHit && portHit.nodeId !== this.state.connectionStartNodeId) {
      // Check if this is a valid target port
      const isValidTarget = this.state.connectionStartIsOutput 
        ? !portHit.isOutput  // Dragging from output: can connect to input ports or parameters
        : portHit.isOutput;  // Dragging from input: can connect to output ports
      
      if (isValidTarget) {
        // Get the port position and snap to it
        let snappedPortPos: { x: number; y: number } | undefined;

        if (portHit.parameter && portHit.snapPosition) {
          // Parameter port: use DOM-derived position (canvas metrics mismatch DOM layout)
          snappedPortPos = portHit.snapPosition;
        } else {
          const targetNode = this.dependencies.graph.nodes.find(n => n.id === portHit.nodeId);
          const targetSpec = this.dependencies.nodeSpecs.get(targetNode?.type || '');
          const targetMetrics = this.dependencies.nodeMetrics.get(portHit.nodeId);

          if (targetNode && targetSpec && targetMetrics) {
            if (portHit.parameter) {
              snappedPortPos = targetMetrics.parameterInputPortPositions.get(portHit.parameter);
            } else {
              const portKey = `${portHit.isOutput ? 'output' : 'input'}:${portHit.port}`;
              snappedPortPos = targetMetrics.portPositions.get(portKey);
            }
          }
        }

        if (snappedPortPos) {
          targetX = snappedPortPos.x;
          targetY = snappedPortPos.y;
          targetSide = portSideFromEndpoint(portHit.isOutput);
          isSnapped = true;
        }
      }
    }
    
    const sourceX = sourcePortPos.x;
    const sourceY = sourcePortPos.y;
    
    // Don't show preview until user has dragged beyond threshold (avoids flash on click/double-click)
    const dragThreshold = getConnectionDragPreviewThresholdCanvas(this.dependencies.getViewState().zoom);
    const distFromStart = Math.hypot(canvasPos.x - sourceX, canvasPos.y - sourceY);
    if (distFromStart < dragThreshold) return;

    const sourceSide = portSideFromEndpoint(this.state.connectionStartIsOutput);
    const { cp1, cp2 } = computeConnectionBezierControlPoints(
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
      sourceSide,
      targetSide
    );
    
    // Get connection color based on source port type
    let portType: string = 'float';
    if (this.state.connectionStartParameter) {
      // For parameter connections, get type from parameter spec
      const paramSpec = sourceSpec.parameters[this.state.connectionStartParameter];
      if (paramSpec) {
        // Map parameter types to port types (some parameter types match port types)
        portType = paramSpec.type === 'vec4' ? 'vec4' : 
                   paramSpec.type === 'float' ? 'float' : 'float';
      }
    } else if (this.state.connectionStartPort) {
      // For regular port connections, get type from port spec
      if (this.state.connectionStartIsOutput) {
        const portSpec = sourceSpec.outputs.find(p => p.name === this.state.connectionStartPort);
        portType = portSpec?.type || 'float';
      } else {
        const portSpec = sourceSpec.inputs.find(p => p.name === this.state.connectionStartPort);
        portType = portSpec?.type || 'float';
      }
    }
    
    // Map port type to connection color token (float→parameter port uses dedicated token when hovering a param)
    const connectionColorMap: Record<string, string> = {
      'float': 'connection-color-float',
      'vec2': 'connection-color-vec2',
      'vec3': 'connection-color-vec3',
      'vec4': 'connection-color-vec4',
      'int': 'connection-color-int',
      'bool': 'connection-color-bool'
    };
    let connectionColorToken = connectionColorMap[portType] || 'connection-color-default';
    if (portType === 'float' && this.state.hoveredPort?.parameter) {
      connectionColorToken = 'connection-color-float-parameter';
    }
    const connectionColor = getCSSColor(connectionColorToken, getCSSColor('connection-color-default', getCSSColor('color-gray-100', '#747e87')));
    
    // Ghost port at cursor / snap target
    const previewScale = isSnapped ? 0.85 : 0.75;
    const previewOpacity = isSnapped ? 0.85 : 0.65;
    const previewRadius = getCSSVariableAsNumber('port-radius', 4) * previewScale;
    
    const highlightRadius = previewRadius * (isSnapped ? 3.5 : 2.8);
    const draggingColorRGBA = getCSSColorRGBA('port-dragging-color', { r: 0, g: 255, b: 136, a: 1 });
    const draggingOuterOpacity = getCSSVariableAsNumber('port-dragging-outer-opacity', 0.6);
    const actualOuterOpacity = draggingOuterOpacity * previewOpacity * (isSnapped ? 1 : 0.65);
    
    targetCtx.fillStyle = `rgba(${draggingColorRGBA.r}, ${draggingColorRGBA.g}, ${draggingColorRGBA.b}, ${actualOuterOpacity})`;
    targetCtx.beginPath();
    targetCtx.arc(targetX, targetY, highlightRadius, 0, Math.PI * 2);
    targetCtx.fill();
    
    targetCtx.fillStyle = `rgba(${draggingColorRGBA.r}, ${draggingColorRGBA.g}, ${draggingColorRGBA.b}, ${previewOpacity})`;
    targetCtx.beginPath();
    targetCtx.arc(targetX, targetY, previewRadius, 0, Math.PI * 2);
    targetCtx.fill();
    
    const tempConnectionWidth = isSnapped
      ? getCSSVariableAsNumber('connection-width', 6)
      : getCSSVariableAsNumber('connection-width-preview', 4);
    targetCtx.strokeStyle = connectionColor;
    targetCtx.lineWidth = tempConnectionWidth;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    
    if (isSnapped) {
      targetCtx.setLineDash([]);
      targetCtx.lineDashOffset = 0;
    } else {
      targetCtx.setLineDash([...CONNECTION_PREVIEW_DASH_PATTERN]);
      targetCtx.lineDashOffset = -this.previewAnimator.getDashOffset();
    }
    
    targetCtx.beginPath();
    targetCtx.moveTo(sourceX, sourceY);
    targetCtx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, targetX, targetY);
    targetCtx.stroke();
    
    // Reset line dash pattern to prevent state leakage
    targetCtx.setLineDash([]);
    targetCtx.lineDashOffset = 0;
  }
}
