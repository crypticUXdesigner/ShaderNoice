/**
 * Maps node spec category labels (NodeSpec.category) to stable CSS/data-attribute slugs.
 * Keep in sync across timeline, panels, and any theme hooks using data-category.
 */
const NODE_CATEGORY_TO_CSS_SLUG: Record<string, string> = {
  Inputs: 'inputs',
  Patterns: 'patterns',
  SDF: 'sdf',
  Shapes: 'shapes',
  Math: 'math',
  Utilities: 'utilities',
  Distort: 'distort',
  Blend: 'blend',
  Mask: 'mask',
  Effects: 'effects',
  Output: 'output',
  Audio: 'audio',
};

/**
 * Returns a kebab-case slug for CSS `data-category`, or `default` when unknown/missing.
 */
export function nodeCategoryToCssSlug(category: string | undefined): string {
  if (!category) return 'default';
  return NODE_CATEGORY_TO_CSS_SLUG[category] ?? 'default';
}
