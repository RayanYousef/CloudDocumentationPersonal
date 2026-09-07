/** Minimal fetch stub for GET /repos/:o/:r and GET /user keyed by token. */
export interface FakeUser { login: string; name: string; email: string | null; push: boolean }

export function fakeGithubFetch(users: Record<string, FakeUser>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization'] ?? '';
    const token = auth.replace(/^Bearer /, '');
    const user = users[token];
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (!user) return json(401, { message: 'Bad credentials' });
    if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return json(200, { full_name: 'o/r', permissions: { push: user.push, pull: true } });
    if (/\/user$/.test(url)) return json(200, { login: user.login, name: user.name, email: user.email });
    return json(404, { message: 'Not Found' });
  }) as typeof fetch;
}
