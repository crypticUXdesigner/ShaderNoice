/**
 * Generates a minimal CSF3 Storybook file next to each *.svelte under src/
 * that does not already have a colocated *.stories.ts or *.stories.svelte.
 *
 * Run: npx tsx scripts/generate-svelte-stories.ts
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..', 'src');

function walkSvelteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walkSvelteFiles(p));
    } else if (name.endsWith('.svelte')) {
      out.push(p);
    }
  }
  return out;
}

function escapeTitleSegment(s: string): string {
  return s.replace(/\\/g, '/');
}

/** Sidebar path: omit `lib/components/` so stories are grouped as ShaderNoice/ui/… not ShaderNoice/lib/components/…. */
function storyTitleFromRelPath(relFromSrc: string): string {
  let p = relFromSrc.replace(/\.svelte$/, '');
  if (p.startsWith('lib/components/')) {
    p = p.slice('lib/components/'.length);
  }
  return `ShaderNoice/${p}`;
}

let created = 0;
let skipped = 0;

for (const sveltePath of walkSvelteFiles(srcRoot)) {
  const dir = dirname(sveltePath);
  const base = basename(sveltePath, '.svelte');
  const relFromSrc = escapeTitleSegment(relative(srcRoot, sveltePath));
  if (relFromSrc === 'lib/App.svelte') {
    skipped += 1;
    continue;
  }
  const storyTs = join(dir, `${base}.stories.ts`);
  const storySvelte = join(dir, `${base}.stories.svelte`);
  if (existsSync(storyTs) || existsSync(storySvelte)) {
    skipped += 1;
    continue;
  }
  const title = storyTitleFromRelPath(relFromSrc);

  const content = `import type { Meta, StoryObj } from '@storybook/svelte-vite';
import Component from './${base}.svelte';

const meta = {
  title: ${JSON.stringify(title)},
  component: Component,
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Minimal mount; add args or decorators when this component needs context or props. */
export const Default: Story = {};
`;

  writeFileSync(storyTs, content, 'utf8');
  created += 1;
}

console.log(`generate-svelte-stories: created ${created}, skipped: ${skipped}`);
