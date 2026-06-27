# Design: Editor Dark Mode Fix + GitHub Device Flow Login

**Date:** 2026-06-27  
**Status:** Approved

## Change 1 — Dark mode fix

**Root cause:** MDXEditor uses its own light-theme CSS. In Docusaurus dark mode the page background turns dark but MDXEditor still renders dark text → invisible.

**Fix:** Detect `data-theme="dark"` on `<html>` via MutationObserver; pass `isDark` down to `<MDXEditor className="dark-theme dark-editor">`.

| File | Change |
|---|---|
| `EditorApp.jsx` | Add `useEffect` + MutationObserver hook → `isDark` state → pass to `BodyEditor` |
| `editorClient.js` | Accept `isDark` prop; apply `className={isDark ? 'dark-theme dark-editor' : ''}` to MDXEditor |
| `editor.module.css` | Add `[data-theme='dark']` rules for `.textarea`, `.input`, `.commitInput` (bg + color) |

## Change 2 — GitHub Device Flow login (PAT disabled)

**Flow:** click button → POST device/code → show `user_code` → user visits github.com/login/device → poll until approved → token. No server needed; `client_id` is public.

**One-time user setup:** Create GitHub OAuth App, enable Device Flow checkbox, copy Client ID into `editorConfig.js`.

| File | Change |
|---|---|
| `editorConfig.js` | Add `export const GITHUB_DEVICE_CLIENT_ID = ''` |
| `deviceFlow.js` (new) | `startDeviceFlow(clientId)`, `pollForToken(clientId, deviceCode, interval)` |
| `TokenGate.jsx` | Replace with Device Flow UI (idle → pending → authed); PAT form commented out |

## Success criteria

- Editor text is readable in dark mode without forcing light background
- "Sign in with GitHub" button triggers Device Flow; shows code; auto-completes on approval
- PAT input is hidden (commented, easily re-enabled)
- `npm run build` passes
