/**
 * scan-ocx.ts — Security scanner for extension .ocx packages.
 *
 * For every YAML entry in registry/extensions/, this script:
 *   1. Downloads the .ocx archive from content.downloadUrl
 *   2. Extracts the ZIP and reads dist/index.js
 *   3. Scans the bundle for dangerous code patterns
 *   4. Validates that the manifest.json inside the archive is consistent
 *      with the registry YAML (id, version)
 *
 * Exit codes:
 *   0 — all extensions pass
 *   1 — one or more extensions failed (errors logged)
 *
 * Run:  npm run scan
 * CI:   runs automatically on PRs that touch registry/extensions/
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { unzipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXT_DIR = join(ROOT, 'registry', 'extensions');

// ─── Dangerous pattern definitions ────────────────────────────────────────────

interface PatternRule {
  name: string;
  /** A pattern marked 'error' fails the scan. 'warning' is informational only. */
  severity: 'error' | 'warning';
  test: (source: string) => boolean;
}

const RULES: PatternRule[] = [
  // Code injection
  {
    name: 'eval()',
    severity: 'error',
    test: (s) => /\beval\s*\(/.test(s),
  },
  {
    name: 'new Function()',
    severity: 'error',
    test: (s) => /new\s+Function\s*\(/.test(s),
  },
  {
    name: 'document.write()',
    severity: 'error',
    test: (s) => /document\.write\s*\(/.test(s),
  },
  // Obfuscation: base64-decode then eval
  {
    name: 'atob()+eval() — likely obfuscation',
    severity: 'error',
    test: (s) => /atob\s*\(/.test(s) && /\beval\s*\(/.test(s),
  },
  // Suspicious globals that shouldn't appear in a sandboxed iframe bundle
  {
    name: 'process.env access',
    severity: 'warning',
    test: (s) => /\bprocess\.env\b/.test(s),
  },
  {
    name: 'require() call (unexpected in ESM bundle)',
    severity: 'warning',
    test: (s) => /\brequire\s*\(/.test(s),
  },
  // Attempting to break out of the iframe via parent / top
  {
    name: 'window.parent / window.top access',
    severity: 'warning',
    test: (s) => /\b(window\.parent|window\.top)\b/.test(s),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(msg: string): void { console.log(`  ✓  ${msg}`); }
function warn(msg: string): void { console.warn(`  ⚠  ${msg}`); }
function fail(msg: string): void { console.error(`  ✗  ${msg}`); }

async function downloadOcx(url: string): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'openconduit-marketplace-scanner/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const files = readdirSync(EXT_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

if (files.length === 0) {
  console.log('No extension entries found — nothing to scan.');
  process.exit(0);
}

console.log(`\nScanning ${files.length} extension(s)…\n`);

let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
  const filePath = join(EXT_DIR, file);
  const raw = readFileSync(filePath, 'utf-8');
  const entry = yaml.load(raw) as Record<string, unknown>;
  const id = String(entry['id'] ?? '(unknown)');
  const version = String(entry['version'] ?? '');
  const content = (entry['content'] ?? {}) as Record<string, unknown>;
  const downloadUrl = String(content['downloadUrl'] ?? '');

  console.log(`── ${id} (${file})`);

  let fileErrors = 0;
  let fileWarnings = 0;

  // 1. downloadUrl must be present and HTTPS
  if (!downloadUrl) {
    fail('content.downloadUrl is missing');
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(downloadUrl);
  } catch {
    fail(`content.downloadUrl is not a valid URL: "${downloadUrl}"`);
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  if (parsedUrl.protocol !== 'https:') {
    fail(`content.downloadUrl must use https:// — got "${parsedUrl.protocol}"`);
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  // 2. Download the .ocx
  let zipBytes: Uint8Array;
  try {
    zipBytes = await downloadOcx(downloadUrl);
    pass(`downloaded ${(zipBytes.length / 1024).toFixed(1)} KB from ${downloadUrl}`);
  } catch (err) {
    fail(`download failed: ${(err as Error).message}`);
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  // 3. Extract
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zipBytes);
  } catch (err) {
    fail(`not a valid ZIP archive: ${(err as Error).message}`);
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  // 4. Validate manifest.json is present
  const manifestBytes = entries['manifest.json'];
  if (!manifestBytes) {
    fail('manifest.json not found in archive root');
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    fail('manifest.json is not valid JSON');
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  // 5. Cross-check id and version between YAML and manifest
  if (manifest['id'] !== id) {
    fail(`manifest.id "${manifest['id']}" does not match registry id "${id}"`);
    fileErrors++;
    totalErrors++;
  }
  if (version && manifest['version'] !== version) {
    fail(`manifest.version "${manifest['version']}" does not match registry version "${version}"`);
    fileErrors++;
    totalErrors++;
  }

  // 6. entryPoint must be dist/index.js
  if (manifest['entryPoint'] !== 'dist/index.js') {
    fail(`manifest.entryPoint must be "dist/index.js", got "${manifest['entryPoint']}"`);
    fileErrors++;
    totalErrors++;
  }

  // 7. Scan the bundle
  const bundleBytes = entries['dist/index.js'];
  if (!bundleBytes) {
    fail('dist/index.js not found in archive');
    fileErrors++;
    totalErrors++;
    console.log('');
    continue;
  }

  const source = new TextDecoder().decode(bundleBytes);

  for (const rule of RULES) {
    if (rule.test(source)) {
      if (rule.severity === 'error') {
        fail(`dangerous pattern detected: ${rule.name}`);
        fileErrors++;
        totalErrors++;
      } else {
        warn(`review required: ${rule.name}`);
        fileWarnings++;
        totalWarnings++;
      }
    }
  }

  if (fileErrors === 0 && fileWarnings === 0) {
    pass('bundle scan clean');
  }

  console.log('');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('─'.repeat(60));
if (totalErrors > 0) {
  console.error(`Scan FAILED — ${totalErrors} error(s), ${totalWarnings} warning(s).`);
  console.error('Fix errors before this PR can be merged.');
  process.exit(1);
} else if (totalWarnings > 0) {
  console.warn(`Scan passed with ${totalWarnings} warning(s) — maintainer review required.`);
  process.exit(0);
} else {
  console.log(`Scan passed — all ${files.length} extension(s) clean.`);
  process.exit(0);
}
