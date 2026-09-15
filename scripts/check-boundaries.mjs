#!/usr/bin/env node
/**
 * Guard rails that a type checker cannot express.
 *
 *  1. The starter must never import from the solution.
 *  2. Only the three lab files may read `?status` or `?paid` from the query string.
 *     Those two parameters are the bait in this exercise, and they belong nowhere else.
 *  3. The starter and the solution must differ only in the files we expect.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const LAB_FILES = ['paymentView.ts', 'restoreCheckout.ts', 'accessDecision.ts'];
const ALLOWED_DIFFERENCES = new Set([...LAB_FILES.map((file) => path.join('lab', file)), path.join('app', 'layout.tsx')]);

const problems = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const exerciseSrc = path.join(ROOT, 'exercises/01.answers-later/01.problem.answers-later/src');
const solutionSrc = path.join(ROOT, 'exercises/01.answers-later/01.solution.answers-later/src');

// 1. No reaching into the solution.
for (const file of walk(exerciseSrc)) {
  const source = fs.readFileSync(file, 'utf8');
  if (/from\s+['"][^'"]*solutions?\//.test(source) || /@bigpdf\/solution/.test(source)) {
    problems.push(`${path.relative(ROOT, file)} imports from the solution`);
  }
}

// 2. The bait parameters stay in the lab files.
for (const root of [exerciseSrc, solutionSrc, path.join(ROOT, 'packages/lab-core/src')]) {
  for (const file of walk(root)) {
    if (LAB_FILES.includes(path.basename(file))) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const bait of ['status=success', "get('status')", "get('paid')", 'paid=1']) {
      if (source.includes(bait)) {
        problems.push(`${path.relative(ROOT, file)} mentions "${bait}", which belongs only in the lab files`);
      }
    }
  }
}

// 3. Starter and solution differ only where they should.
const listFiles = (root) => walk(root).map((file) => path.relative(root, file)).sort();
const exerciseFiles = listFiles(exerciseSrc);
const solutionFiles = listFiles(solutionSrc);

for (const file of exerciseFiles) {
  if (!solutionFiles.includes(file)) problems.push(`exercise has ${file}, the solution does not`);
}
for (const file of solutionFiles) {
  if (!exerciseFiles.includes(file)) problems.push(`solution has ${file}, the exercise does not`);
}
for (const file of exerciseFiles.filter((file) => solutionFiles.includes(file))) {
  const same =
    fs.readFileSync(path.join(exerciseSrc, file), 'utf8') === fs.readFileSync(path.join(solutionSrc, file), 'utf8');
  if (!same && !ALLOWED_DIFFERENCES.has(file)) {
    problems.push(`${file} differs between the starter and the solution, and it should not`);
  }
  if (same && ALLOWED_DIFFERENCES.has(file) && file.startsWith('lab')) {
    problems.push(`${file} is identical in both apps, so the starter has no exercise left in it`);
  }
}

if (problems.length > 0) {
  console.error('\n  Boundary check failed:\n');
  for (const problem of problems) console.error(`   - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log('  Boundary check passed: the starter stands alone and only the lab files differ.');
