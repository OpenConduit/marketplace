import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TYPES = ['providers', 'mcp', 'personas', 'prompts', 'profiles', 'themes', 'extensions'] as const;

let totalEntries = 0;

for (const type of TYPES) {
  const dir = join(ROOT, 'registry', type);
  const outDir = join(ROOT, 'dist', 'v1', type);

  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort(); // deterministic output order

  const entries = files.map((file) => {
    const raw = readFileSync(join(dir, file), 'utf-8');
    return yaml.load(raw);
  });

  const checksum = createHash('sha256')
    .update(JSON.stringify(entries))
    .digest('hex');

  const output = {
    checksum,
    updatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };

  const outPath = join(outDir, 'index.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

  console.log(`  ${type}: ${entries.length} entries → dist/v1/${type}/index.json`);
  totalEntries += entries.length;
}

console.log(`\nBuild complete. ${totalEntries} total entries.`);
