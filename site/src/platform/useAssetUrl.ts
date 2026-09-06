import { useEffect, useState } from 'react';
import { createContentBackend, defaultRefFor } from './createContentBackend';

export interface AssetSpec { repo: string; ref?: string; path: string }
export interface AssetState { url: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }

/** Resolve a code-repo asset to an object URL through ContentBackend.getAsset. */
export function useAssetUrl(spec: AssetSpec | null): AssetState {
  const [state, setState] = useState<AssetState>({ url: null, status: spec ? 'loading' : 'idle', error: null });
  const key = spec ? `${spec.repo}@${spec.ref ?? ''}/${spec.path}` : '';
  useEffect(() => {
    if (!spec) return undefined;
    let url: string | null = null;
    let cancelled = false;
    setState({ url: null, status: 'loading', error: null });
    createContentBackend().getAsset({ repo: spec.repo, ref: spec.ref ?? defaultRefFor(spec.repo), path: spec.path })
      .then((blob) => { if (cancelled) return; url = URL.createObjectURL(blob); setState({ url, status: 'ready', error: null }); })
      .catch((e: Error) => { if (!cancelled) setState({ url: null, status: 'error', error: e.message }); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [key]); // key encodes every field of spec
  return state;
}
