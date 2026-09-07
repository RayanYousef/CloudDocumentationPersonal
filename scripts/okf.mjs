// Usage: node scripts/okf.mjs <generate|check>
// Runs okf-core over the Latest bundle and every frozen version listed in <site>/versions.json.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runCli } from '@platform/okf-core/node';
import platform from '../platform.config.js';

const cmd = process.argv[2];
if (!['generate', 'check'].includes(cmd ?? '')) { console.error('Usage: node scripts/okf.mjs <generate|check>'); process.exit(2); }

const site = path.resolve(platform.sitePath);
const versions = JSON.parse(await readFile(path.join(site, 'versions.json'), 'utf8'));
const bundles = [path.join(site, 'docs'), ...versions.map((v) => path.join(site, 'versioned_docs', `version-${v}`))];
const repoArgs = platform.codeRepos.flatMap((r) => ['--repo', `${r.owner}/${r.repo}`]);

let worst = 0;
for (const dir of bundles) {
  const code = await runCli([cmd, dir, ...repoArgs]);
  worst = Math.max(worst, code);
}
process.exit(worst);
