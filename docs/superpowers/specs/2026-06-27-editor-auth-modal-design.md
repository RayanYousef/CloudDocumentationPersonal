# Design: Editor Auth Modal Overlay

**Date:** 2026-06-27  
**Status:** Approved

## Goal

When the user visits `/editor` without being signed in, show a centered modal dialog on top of the editor layout (instead of replacing the whole page). After signing in with GitHub (Device Flow), the modal closes and the editor is usable. `verifyToken` rejects users without write access to the repo — only project collaborators get in.

## Files changed

| File | Change |
|---|---|
| `EditorApp.jsx` | Remove `if (!pat) return <TokenGate />` early return; add `{!pat && <div className={styles.modalBackdrop}><div className={styles.modalCard}><TokenGate onAuthed={onAuthed} /></div></div>}` in JSX |
| `editor.module.css` | Add `.modalBackdrop` (fixed inset:0, z-index:1000, blur backdrop, flex center) and `.modalCard` (bg, shadow, max-width 480px, scrollable) |

## Access control

- Device Flow login → `verifyToken` calls GitHub API; throws if token lacks write access to the repo → only project collaborators can proceed
- On success: modal unmounts, editor is fully interactive

## Success criteria

- `/editor` renders the editor layout immediately
- Modal appears on top when unauthenticated
- "Sign in with GitHub" button triggers Device Flow
- Users without repo write access see an error in the modal
- `npm run build` passes
