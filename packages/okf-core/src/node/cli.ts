import { stat } from 'node:fs/promises';
import path from 'node:path';
import { generateBundle, checkBundle } from '../generate.js';
import type { RepoRef } from '../model.js';
import { readBundle, writeFiles } from './fs.js';

export const USAGE = [
  'Usage: okf <generate|check> <bundle-dir> [--repo owner/repo]...',
  '',
  '  generate  write index blocks, manifest.json and code maps, then validate',
  '  check     validate only, write nothing; stale generated content is a problem (CI-safe)',
  '  --repo    declare a code repo (repeatable); resources outside declared repos fail',
  '',
  'Exit codes: 0 clean, 1 problems found, 2 usage error',
].join('\n');

export interface CliIo { log(s: string): void; error(s: string): void }

export async function runCli(argv: string[], io: CliIo = console): Promise<number> {
  const [cmd, dirArg, ...rest] = argv;
  if (!cmd || !dirArg || !['generate', 'check'].includes(cmd) || argv.includes('--help') || argv.includes('-h')) { io.log(USAGE); return 2; }
  const codeRepos: RepoRef[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--repo' && rest[i + 1]) {
      const [owner, repo] = rest[++i]!.split('/');
      if (!owner || !repo) { io.error(`Bad --repo value; expected owner/repo`); return 2; }
      codeRepos.push({ owner, repo });
    }
  }
  const dir = path.resolve(dirArg);
  try { if (!(await stat(dir)).isDirectory()) throw new Error(); } catch { io.error(`Not a directory: ${dir}\n\n${USAGE}`); return 2; }
  const files = await readBundle(dir);
  if (cmd === 'check') {
    const { problems } = checkBundle(files, { codeRepos });
    if (problems.length) { io.log(`okf check: ${problems.length} problem(s) in ${dirArg}`); for (const p of problems) io.log(`  - ${p.file}: [${p.rule}] ${p.message}`); return 1; }
    io.log(`okf check: OK - ${dirArg}`); return 0;
  }
  const r = generateBundle(files, { codeRepos });
  await writeFiles(dir, r.writes);
  if (r.problems.length) {
    io.log(`okf generate: ${r.problems.length} problem(s) in ${dirArg} - index blocks rewritten, manifest.json and code maps NOT written until these are fixed`);
    for (const p of r.problems) io.log(`  - ${p.file}: [${p.rule}] ${p.message}`);
    return 1;
  }
  io.log(`okf generate: OK - ${Object.keys(r.writes).length} file(s) written in ${dirArg}`);
  return 0;
}
