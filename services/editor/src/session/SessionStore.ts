import type { Session } from '@platform/contracts';

export const SESSION_STORAGE_KEY = 'docs-platform.session';

/** Memory-first session holder; localStorage only when the user opts in ("remember on this device"). */
export class BrowserSessionStore {
  private memory: Session | null = null;
  constructor(private readonly storage: Storage | null) {}
  load(): Session | null {
    if (this.memory) return this.memory;
    try { const raw = this.storage?.getItem(SESSION_STORAGE_KEY); this.memory = raw ? (JSON.parse(raw) as Session) : null; } catch { this.memory = null; }
    return this.memory;
  }
  save(session: Session, remember: boolean): void {
    this.memory = session;
    try { if (remember) this.storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); else this.storage?.removeItem(SESSION_STORAGE_KEY); } catch { /* storage blocked */ }
  }
  clear(): void { this.memory = null; try { this.storage?.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ } }
}
