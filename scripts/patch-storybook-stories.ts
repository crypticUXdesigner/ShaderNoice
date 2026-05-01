/**
 * Rewrite *.stories.ts with useful Default stories (args + children snippets).
 * Run: npx tsx scripts/patch-storybook-stories.ts
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..', 'src');
const snippetModuleFile = join(srcRoot, 'utils', 'storybookSnippets.ts');

function snippetImportPath(storyPath: string): string {
  let rel = relative(dirname(storyPath), snippetModuleFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.replace(/\.ts$/, '');
}

const ARGS_ONLY: Record<string, string> = {
  Badge: '{ value: 3 }',
  Checkbox: '{ label: "Example option", checked: true }',
  ModeButton: '{ icon: "plus" }',
  IconSvg: '{ name: "plus" }',
  NodeIconSvg: '{ identifier: "wave-sine" }',
  EditableLabel: '{ value: "Double-click to edit", onCommit: () => {} }',
  VerticalRangeSlider: '{ lowValue: 0.2, highValue: 0.8, onChange: () => {} }',
  Input: '{ value: "Hello", placeholder: "Placeholder" }',
  ValueInput: '{ value: 0.5, onChange: () => {}, onCommit: () => {} }',
};

const DEMO_COMPONENT: Record<string, string> = {
  ButtonGroup: './ButtonGroupDemo.svelte',
};

/** Extra args merged when component uses `children` snippet */
const EXTRA_CHILD_ARGS: Record<string, string> = {
  Modal: 'open: true, onClose: () => {}',
  Popover: 'open: true, x: 120, y: 120, onClose: () => {}',
};

const CHILD_LABEL: Record<string, string> = {
  Button: 'Save',
  Tag: 'Tag',
  Message: 'Message body text.',
  PanelSection: 'Section content',
  MenuHeader: 'Menu',
  MenuNoResults: 'No results',
  Modal: '<p>Modal body</p>',
  Popover: 'Popover content',
  FloatingPanel: 'Panel content',
  NodePanelSection: 'Section',
  DropdownMenu: 'Menu',
  MenuItem: 'Item',
  ParameterCell: 'Parameter',
  ParamCell: 'Parameter',
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.stories.ts')) out.push(p);
  }
  return out;
}

/** True for `children?: Snippet<[]>` only — not parametric `Snippet<[{ ... }]>` (needs real render). */
function hasChildrenSnippet(source: string): boolean {
  if (!/children\?\s*:\s*import\(['"]svelte['"]\)\.Snippet/.test(source)) return false;
  if (/children\?\s*:\s*import\(['"]svelte['"]\)\.Snippet\s*<\s*\[\s*\{/.test(source)) return false;
  return true;
}

function requiredPropNames(source: string): string[] {
  const m = source.match(/interface Props\s*\{([\s\S]*?)\n\}/);
  if (!m) return [];
  const body = m[1];
  const out: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;
    if (line.startsWith('[')) continue;
    if (line.includes('?')) continue;
    const mm = line.match(/^(\w+)\s*:\s*(.+);?\s*$/);
    if (!mm) continue;
    const name = mm[1];
    const rest = mm[2];
    if (name === 'key') continue;
    if (rest.includes('=>') && (rest.includes('(') || rest.includes('<'))) {
      if (/^\s*\([^)]*\)\s*=>/.test(rest) || rest.includes('Snippet')) continue;
    }
    out.push(name);
  }
  return out;
}

function extractPropTypes(source: string): Map<string, string> {
  const m = source.match(/interface Props\s*\{([\s\S]*?)\n\}/);
  const map = new Map<string, string>();
  if (!m) return map;
  for (const raw of m[1].split('\n')) {
    const line = raw.trim();
    const mm = line.match(/^(\w+)\s*:\s*(.+?);?\s*$/);
    if (mm) map.set(mm[1].toLowerCase(), mm[2]);
  }
  return map;
}

function defaultArgForProp(prop: string, typeLine: string): string | undefined {
  const t = typeLine.toLowerCase();
  if (prop === 'icon') return '"plus"';
  if (prop === 'name' && t.includes('iconname')) return '"plus"';
  if (prop === 'identifier') return '"wave-sine"';
  if (prop === 'value' && t.includes('number')) return '0';
  if (prop === 'value') return '"Sample"';
  if (prop === 'lowvalue') return '0.2';
  if (prop === 'highvalue') return '0.8';
  if (prop.startsWith('on') && (t.includes('=>') || t.includes('void'))) return '() => {}';
  if (prop === 'nodeid') return '"n1"';
  return undefined;
}

function buildArgsFromRequired(source: string): string | undefined {
  const req = requiredPropNames(source);
  if (req.length === 0) return undefined;
  const types = extractPropTypes(source);
  const parts: string[] = [];
  for (const p of req) {
    const typeLine = types.get(p.toLowerCase()) ?? '';
    const dv = defaultArgForProp(p.toLowerCase(), typeLine);
    if (dv !== undefined) parts.push(`${p}: ${dv}`);
  }
  if (parts.length === 0) return undefined;
  return `{ ${parts.join(', ')} }`;
}

function buildStoryFile(storyPath: string, svelteSource: string, title: string, base: string): string {
  const snippet = snippetImportPath(storyPath);
  const demo = DEMO_COMPONENT[base];
  if (demo) {
    const demoImport = demo.startsWith('./') ? demo : `./${demo}`;
    return `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Demo from '${demoImport}';
import ${base} from './${base}.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: ${base},
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    Component: Demo,
    props: {},
  }),
};
`;
  }

  if (ARGS_ONLY[base]) {
    return `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './${base}.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: ${ARGS_ONLY[base]},
};
`;
  }

  if (base === 'Message') {
    return `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '${snippet}';
import Component from './Message.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { inline: true, variant: 'info', visible: true },
  render: (args) => ({
    Component,
    props: {
      ...args,
      children: storyTextSnippet('Message body text.'),
    },
  }),
};
`;
  }

  const argsBuilt = buildArgsFromRequired(svelteSource);
  const childLabel = CHILD_LABEL[base] ?? base.replace(/([A-Z])/g, ' $1').trim();

  if (hasChildrenSnippet(svelteSource)) {
    const extra = EXTRA_CHILD_ARGS[base];
    const spreadArgs = extra
      ? `{
      ...args,
      ${extra},
      children: storyTextSnippet(${JSON.stringify(childLabel)}),
    }`
      : `{
      ...args,
      children: storyTextSnippet(${JSON.stringify(childLabel)}),
    }`;
    const argsLine = argsBuilt ? `  args: ${argsBuilt},\n` : '';
    return `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import { storyTextSnippet } from '${snippet}';
import Component from './${base}.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
${argsLine}  render: (args) => ({
    Component,
    props: ${spreadArgs},
  }),
};
`;
  }

  if (argsBuilt) {
    return `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './${base}.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: ${argsBuilt},
};
`;
  }

  return `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './${base}.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
`;
}

function main(): void {
  let n = 0;
  for (const storyPath of walk(srcRoot)) {
    const base = basename(storyPath, '.stories.ts');
    const dir = dirname(storyPath);
    const sveltePath = join(dir, `${base}.svelte`);
    let svelteSource: string;
    try {
      svelteSource = readFileSync(sveltePath, 'utf8');
    } catch {
      continue;
    }
    const storySrc = readFileSync(storyPath, 'utf8');
    const titleM = storySrc.match(/title:\s*["']([^"']+)["']/);
    const title = titleM
      ? titleM[1]
      : `ShaderNoice/${relative(srcRoot, dir).replace(/\\/g, '/')}/${base}`;

    const next = buildStoryFile(storyPath, svelteSource, title, base);
    writeFileSync(storyPath, next, 'utf8');
    n += 1;
  }
  console.log(`patched ${n} story files`);
}

main();
