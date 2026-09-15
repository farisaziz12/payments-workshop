#!/usr/bin/env node
/**
 * Keeps the documentation honest: every `pnpm` command and every relative link in a
 * markdown file has to exist. Workshop docs that point at files nobody wrote are worse
 * than no docs at all.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'test-results', 'playwright-report']);

function markdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const scripts = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts ?? {});
const problems = [];

for (const file of markdownFiles(ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);

  for (const match of source.matchAll(/`pnpm ([a-z0-9:_-]+)[^`]*`/g)) {
    const name = match[1];
    if (['install', 'exec', 'dlx', 'add', 'run', 'why', 'list', 'approve-builds'].includes(name)) continue;
    if (!scripts.includes(name)) problems.push(`${relative} mentions "pnpm ${name}", which is not a script`);
  }

  for (const match of source.matchAll(/\]\((\.{1,2}\/[^)#\s]+)/g)) {
    const target = path.resolve(path.dirname(file), match[1]);
    if (!fs.existsSync(target)) problems.push(`${relative} links to ${match[1]}, which does not exist`);
  }

  for (const match of source.matchAll(/`((?:packages|exercises|solutions|scripts|docs|e2e|tests)\/[^`\s]+?\.(?:ts|tsx|mjs|md|css|json))`/g)) {
    if (!fs.existsSync(path.join(ROOT, match[1]))) {
      problems.push(`${relative} names ${match[1]}, which does not exist`);
    }
  }
}

if (problems.length > 0) {
  console.error('\n  Documentation check failed:\n');
  for (const problem of problems) console.error(`   - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log('  Documentation check passed: every command and path in the docs exists.');
