import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const overlay: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none', color: 'var(--ifm-color-emphasis-700, #666)' };

export interface FbxViewerCoreProps { src: string; height?: number }

export function FbxViewerCore({ src, height = 480 }: FbxViewerCoreProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError('WebGL is not available in this browser.'); setLoading(false); return undefined; }
    let disposed = false;
    let raf = 0;
    const width = mount.clientWidth || 600;
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-4, -2, -3); scene.add(fill);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 2.0;
    new FBXLoader().load(src, (obj) => {
      if (disposed) return;
      obj.traverse((c) => { const mesh = c as THREE.Mesh; if (mesh.isMesh) { const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.forEach((m) => { if (m) m.side = THREE.DoubleSide; }); } });
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      obj.position.sub(center);
      const dist = maxDim * 2.2;
      camera.position.set(dist * 0.6, dist * 0.45, dist);
      camera.near = dist / 100; camera.far = dist * 100; camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0); controls.update();
      scene.add(obj);
      setLoading(false);
    }, undefined, (err) => { if (!disposed) { setError(String((err as Error).message ?? err)); setLoading(false); } });
    const onResize = () => { const w = mount.clientWidth || width; renderer.setSize(w, height); camera.aspect = w / height; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', onResize);
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      scene.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.geometry?.dispose(); const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.forEach((m) => { if (!m) return; Object.values(m).forEach((v) => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); }); m.dispose(); }); } });
      renderer.dispose();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
    };
  }, [src, height]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: `${height}px`, overflow: 'hidden', borderRadius: 'var(--ifm-global-radius, 6px)', backgroundColor: 'var(--ifm-background-surface-color, #eee)' }} />
      {loading && !error && <div style={overlay}>Loading FBX...</div>}
      {error && <div style={overlay}>Could not load FBX: <code>{src}</code> ({error})</div>}
    </div>
  );
}
