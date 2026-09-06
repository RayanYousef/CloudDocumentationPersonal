import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Author } from '@platform/contracts';

const run = promisify(execFile);

export async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout.trim();
}

export async function commitAll(cwd: string, message: string, author: Author): Promise<string> {
  await git(cwd, 'add', '-A');
  await git(cwd, '-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`, 'commit', '-q', '-m', message, '--author', `${author.name} <${author.email}>`);
  return git(cwd, 'rev-parse', 'HEAD');
}

export const createTag = (cwd: string, name: string, sha: string): Promise<string> => git(cwd, 'tag', name, sha);
export const listTags = async (cwd: string): Promise<string[]> => (await git(cwd, 'tag', '--list')).split('\n').filter(Boolean);
