// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';
import type { AuthProvider } from '@platform/contracts';
import { NewPageDialog } from './NewPageDialog.js';
import { PublishDialog } from './PublishDialog.js';
import { LoginGate } from './LoginGate.js';
import { Modal } from './Modal.js';
import type { Platform } from '../composition/createPlatform.js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];
async function mount(el: ReactElement): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => root.render(el));
  return host;
}
afterEach(async () => { for (const r of roots.splice(0)) await act(async () => r.unmount()); document.body.innerHTML = ''; });

/** Drives a React controlled input the way a user would (native setter + input event). */
async function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const byLabel = (host: HTMLElement, label: string) => host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === text)!;
const click = (b: HTMLButtonElement) => act(async () => { b.click(); });
const tick = () => act(async () => { await Promise.resolve(); });

describe('NewPageDialog', () => {
  it('shows the backend error inside the dialog, stays open and re-enables Create', async () => {
    const onCreate = vi.fn(async () => { throw new Error('Invalid page path: bad path.md'); });
    const host = await mount(<NewPageDialog typesInUse={['system']} defaultResource="" onCreate={onCreate} onClose={() => {}} />);
    await type(byLabel(host, 'New page path'), 'bad path.md');
    await type(byLabel(host, 'New page title'), 'T');
    await type(byLabel(host, 'New page description'), 'D');
    await click(button(host, 'Create'));
    await tick();
    expect(onCreate).toHaveBeenCalledWith('bad path.md', expect.stringContaining('title: T'));
    expect(host.querySelector('[role="alert"]')!.textContent).toBe('Invalid page path: bad path.md');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(button(host, 'Create').disabled).toBe(false);
  });
  it('labels the dialog by its heading', async () => {
    const host = await mount(<NewPageDialog typesInUse={[]} defaultResource="" onCreate={async () => {}} onClose={() => {}} />);
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('New page');
  });
});

describe('PublishDialog', () => {
  it('shows the backend error inside the dialog', async () => {
    const onPublish = vi.fn(async () => { throw new Error('GitHub API 502 for /git/refs'); });
    const host = await mount(<PublishDialog existing={['current', '1.0.0']} onPublish={onPublish} onClose={() => {}} />);
    await type(byLabel(host, 'Version'), '1.1.0');
    await click(button(host, 'Publish'));
    await tick();
    expect(onPublish).toHaveBeenCalledWith('1.1.0');
    expect(host.querySelector('[role="alert"]')!.textContent).toBe('GitHub API 502 for /git/refs');
    expect(button(host, 'Publish').disabled).toBe(false);
  });
  it('refuses an existing or malformed version label', async () => {
    const host = await mount(<PublishDialog existing={['current', '1.0.0']} onPublish={async () => {}} onClose={() => {}} />);
    await type(byLabel(host, 'Version'), '1.0.0');
    expect(button(host, 'Publish').disabled).toBe(true);
    expect(host.textContent).toContain('Version 1.0.0 already exists.');
    await type(byLabel(host, 'Version'), 'v2');
    expect(button(host, 'Publish').disabled).toBe(true);
  });
});

describe('LoginGate', () => {
  const platform = (auth: AuthProvider): Platform => ({ auth, backend: () => { throw new Error('unused'); }, config: { organizationName: 'o', projectName: 'r' } as Platform['config'], componentsUrl: '' });
  it('announces why a saved session was forgotten', async () => {
    const auth: AuthProvider = { id: 'github-token', login: async () => { throw new Error('unused'); }, verify: async () => { throw new Error('unused'); } };
    const host = await mount(<LoginGate platform={platform(auth)} initialError="Your saved session is no longer valid and was forgotten. You are not a write collaborator of o/r." onAuthed={() => {}} />);
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('not a write collaborator of o/r');
    expect(host.textContent).toContain('Only write collaborators can sign in.');
  });
  it('shows the provider error for a rejected token', async () => {
    const auth: AuthProvider = { id: 'github-token', login: async () => { throw new Error('You are not a write collaborator of o/r. Ask a repository admin for write access.'); }, verify: async () => { throw new Error('unused'); } };
    const host = await mount(<LoginGate platform={platform(auth)} onAuthed={() => {}} />);
    await type(byLabel(host, 'GitHub token'), 'github_pat_x');
    await click(button(host, 'Sign in'));
    await tick();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('not a write collaborator');
  });
});

describe('Modal', () => {
  it('closes on Escape when a close handler is given', async () => {
    const onClose = vi.fn();
    await mount(<Modal title="X" onClose={onClose}><p>body</p></Modal>);
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
