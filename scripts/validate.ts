import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Directory name → expected `type` field value in the YAML
const TYPE_MAP: Record<string, string> = {
  providers: 'provider',
  mcp: 'mcp-server',
  personas: 'persona',
  prompts: 'prompt-template',
  profiles: 'routing-profile',
  themes: 'theme',
};

const REQUIRED_FIELDS = ['id', 'name', 'type', 'author', 'version', 'description', 'content'] as const;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let errors = 0;

function fail(file: string, msg: string): void {
  console.error(`  FAIL  ${file}: ${msg}`);
  errors++;
}

for (const [dir, expectedType] of Object.entries(TYPE_MAP)) {
  const folder = join(ROOT, 'registry', dir);
  const files = readdirSync(folder).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  const seenIds = new Set<string>();

  for (const file of files) {
    const filePath = join(folder, file);
    const raw = readFileSync(filePath, 'utf-8');

    let entry: Record<string, unknown>;
    try {
      entry = yaml.load(raw) as Record<string, unknown>;
    } catch (e) {
      fail(`${dir}/${file}`, `YAML parse error: ${(e as Error).message}`);
      continue;
    }

    // Required fields
    for (const field of REQUIRED_FIELDS) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        fail(`${dir}/${file}`, `missing required field: ${field}`);
      }
    }

    // version format (semver)
    const version = entry['version'] as string;
    if (version && !SEMVER_RE.test(version)) {
      fail(`${dir}/${file}`, `version must be semver (x.y.z), got: "${version}"`);
    }

    // id format
    const id = entry['id'] as string;
    if (id && !KEBAB_RE.test(id)) {
      fail(`${dir}/${file}`, `id must be kebab-case, got: "${id}"`);
    }

    // id uniqueness within type
    if (id) {
      if (seenIds.has(id)) {
        fail(`${dir}/${file}`, `duplicate id: "${id}"`);
      }
      seenIds.add(id);
    }

    // type field matches directory
    if (entry['type'] !== expectedType) {
      fail(`${dir}/${file}`, `type must be "${expectedType}", got: "${entry['type']}"`);
    }

    // verified must be boolean
    if ('verified' in entry && typeof entry['verified'] !== 'boolean') {
      fail(`${dir}/${file}`, `verified must be a boolean`);
    }

    // Type-specific content checks
    const content = entry['content'] as Record<string, unknown> | undefined;
    if (content) {
      if (expectedType === 'routing-profile') {
        const tiers = content['tiers'] as Record<string, unknown> | undefined;
        if (!tiers || !tiers['fast'] || !tiers['balanced'] || !tiers['powerful']) {
          fail(`${dir}/${file}`, `content.tiers must have fast, balanced, and powerful keys`);
        }
      }

      if (expectedType === 'theme') {
        const colors = content['colors'] as Record<string, unknown> | undefined;
        const requiredColors = ['--color-primary', '--color-surface', '--color-background', '--color-text'];
        for (const c of requiredColors) {
          if (!colors || !colors[c]) {
            fail(`${dir}/${file}`, `content.colors missing required key: ${c}`);
          }
        }
      }

      if (expectedType === 'persona') {
        if (!content['systemPrompt']) {
          fail(`${dir}/${file}`, `content.systemPrompt is required`);
        }
      }

      if (expectedType === 'prompt-template') {
        if (!content['template']) {
          fail(`${dir}/${file}`, `content.template is required`);
        }
      }
    }
  }

  console.log(`  ${dir}: ${files.length} files checked`);
}

if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log('\nAll entries valid.');
}
