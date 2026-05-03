/**
 * Whether an output port type can feed an input port type (same rules as GLSL promotion in compilation).
 */
export function canConvertShaderPortTypes(sourceType: string, targetType: string): boolean {
  if (sourceType === targetType) return true;
  const promotions: Record<string, Record<string, true>> = {
    float: { vec2: true, vec3: true, vec4: true },
    vec2: { vec3: true, vec4: true },
    vec3: { vec4: true },
  };
  const demotions: Record<string, Record<string, true>> = {
    vec4: { float: true, vec2: true, vec3: true },
    vec3: { float: true, vec2: true },
    vec2: { float: true },
  };
  if (promotions[sourceType]?.[targetType]) return true;
  if (demotions[sourceType]?.[targetType]) return true;
  return false;
}
