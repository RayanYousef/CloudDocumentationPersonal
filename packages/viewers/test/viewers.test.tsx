import { describe, it, expect, vi } from 'vitest';

// jsdom has no WebGL: the real custom element upgrades and throws asynchronously, so stub its registration.
vi.mock('@google/model-viewer', () => ({}));
import { render, screen } from '@testing-library/react';
import { ModelViewerCore, FbxViewerCore } from '../src/index.js';

describe('ModelViewerCore', () => {
  it('renders a <model-viewer> element with src, alt and height', () => {
    const { container } = render(<ModelViewerCore src="/models/cube.gltf" alt="Cube" height={320} />);
    const el = container.querySelector('model-viewer');
    expect(el?.getAttribute('src')).toBe('/models/cube.gltf');
    expect(el?.getAttribute('alt')).toBe('Cube');
    expect((el as HTMLElement).style.height).toBe('320px');
  });
});

describe('FbxViewerCore', () => {
  it('shows an error overlay when WebGL is unavailable (jsdom)', async () => {
    render(<FbxViewerCore src="/models/fbx/cube.fbx" height={200} />);
    expect(await screen.findByText(/WebGL is not available/)).toBeTruthy();
  });
});
