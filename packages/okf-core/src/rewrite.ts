export interface RefRewrite { from: string; to: string }

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Replace branch refs with pinned shas in blob URLs and in viewer JSX `ref` attributes. Keys are 'owner/repo'. */
export function rewriteRefs(text: string, pins: Record<string, RefRewrite>): string {
  let out = text;
  for (const [key, { from, to }] of Object.entries(pins)) {
    const [owner, repo] = key.split('/');
    const url = new RegExp(`(https://github\\.com/${esc(owner!)}/${esc(repo!)}/blob/)${esc(from)}/`, 'g');
    out = out.replace(url, `$1${to}/`);
    const tag = /<[A-Z][\w.]*\b[^>]*>/g;
    out = out.replace(tag, (t) => {
      if (!new RegExp(`\\brepo=["']${esc(key)}["']`).test(t)) return t;
      return t.replace(new RegExp(`\\bref=["']${esc(from)}["']`), `ref="${to}"`);
    });
  }
  return out;
}
