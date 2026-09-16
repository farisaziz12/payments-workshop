#!/usr/bin/env node
/**
 * Guard rails that a type checker cannot express.
 *
 *  1. The starter must never import from the solution.
 *  2. The starter and the solution must differ only in the lab files.
 *  3. Every lab file must actually differ, or the starter has no exercise left in it.
 *  4. The shared package must not import from any exercise app. Dependencies point one way.
 *
 * Add an exercise by adding a row to EXERCISES.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');

const EXERCISES = [
  {
    key: '01',
    slug: '01.game-day',
    problem: '01.problem.game-day',
    solution: '01.solution.game-day',
    labFiles: ['routing.ts', 'retryPolicy.ts'],
  },
];

/** Files outside `lab/` that are allowed to differ, because they name the app. */
const ALLOWED_DIFFERENCES = new Set([path.join('app', 'layout.tsx')]);

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

const listFiles = (root) =>
  walk(root)
    .map((file) => path.relative(root, file))
    .sort();

for (const exercise of EXERCISES) {
  const problemSrc = path.join(ROOT, 'exercises', exercise.slug, exercise.problem, 'src');
  const solutionSrc = path.join(ROOT, 'exercises', exercise.slug, exercise.solution, 'src');

  if (!fs.existsSync(problemSrc) || !fs.existsSync(solutionSrc)) {
    problems.push(`exercise ${exercise.key} is missing its problem or solution app`);
    continue;
  }

  // 1. No reaching into the solution.
  for (const file of walk(problemSrc)) {
    const source = fs.readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*\.solution\./.test(source) || /@bigpdf\/solution/.test(source)) {
      problems.push(`${path.relative(ROOT, file)} imports from the solution`);
    }
  }

  // 2 and 3. The two apps differ exactly where they should.
  const problemFiles = listFiles(problemSrc);
  const solutionFiles = listFiles(solutionSrc);
  const labPaths = exercise.labFiles.map((file) => path.join('lab', file));

  for (const file of problemFiles) {
    if (!solutionFiles.includes(file)) problems.push(`[${exercise.key}] starter has ${file}, the solution does not`);
  }
  for (const file of solutionFiles) {
    if (!problemFiles.includes(file)) problems.push(`[${exercise.key}] solution has ${file}, the starter does not`);
  }

  for (const file of problemFiles.filter((file) => solutionFiles.includes(file))) {
    const same =
      fs.readFileSync(path.join(problemSrc, file), 'utf8') ===
      fs.readFileSync(path.join(solutionSrc, file), 'utf8');
    const isLabFile = labPaths.includes(file);

    if (!same && !isLabFile && !ALLOWED_DIFFERENCES.has(file)) {
      problems.push(`[${exercise.key}] ${file} differs between the two apps, and it should not`);
    }
    if (same && isLabFile) {
      problems.push(`[${exercise.key}] ${file} is identical in both apps, so the starter has no exercise left in it`);
    }
  }

  for (const file of labPaths) {
    if (!problemFiles.includes(file)) problems.push(`[${exercise.key}] the starter is missing ${file}`);
  }
}

// 4. The shared package depends on nothing above it.
for (const file of walk(path.join(ROOT, 'packages/lab-core/src'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (/from\s+['"][^'"]*exercises\//.test(source) || /@lab\//.test(source)) {
    problems.push(`${path.relative(ROOT, file)} imports from an exercise app`);
  }
}

if (problems.length > 0) {
  console.error('\n  Boundary check failed:\n');
  for (const problem of problems) console.error(`   - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log('  Boundary check passed: the starter stands alone and only the lab files differ.');
