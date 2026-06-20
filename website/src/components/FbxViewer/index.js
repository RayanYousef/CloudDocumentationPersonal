import React, {useEffect, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';

const boxStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '1rem',
  border: '1px solid var(--ifm-color-emphasis-300)',
  borderRadius: 'var(--ifm-global-radius)',
};

const overlay = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  pointerEvents: 'none',
  color: 'var(--ifm-color-emphasis-700)',
};

/**
 * Browser-only three.js renderer for .fbx files.
 *
 * <model-viewer> only reads glTF/GLB, so FBX is rendered here with three.js
 * FBXLoader (MIT, part of three). All three.js modules are require()d INSIDE
 * <BrowserOnly> so the static SSR build never imports WebGL/DOM code.
 * `src` is resolved through useBaseUrl so "/models/fbx/x.fbx" works under the
 * /CloudDocumentationPersonal/ base path on GitHub Pages.
 */
function Scene({src, height}) {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const THREE = require('three');
    const {FBXLoader} = require('three/examples/jsm/loaders/FBXLoader.js');
    const {OrbitControls} = require('three/examples/jsm/controls/OrbitControls.js');

    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let raf;
    let model;

    const width = mount.clientWidth || 600;
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-4, -2, -3);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    const loader = new FBXLoader();
    loader.load(
      src,
      (obj) => {
        if (disposed) return;
        model = obj;
        // Render regardless of winding / missing materials.
        obj.traverse((c) => {
          if (c.isMesh) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m) => { if (m) m.side = THREE.DoubleSide; });
          }
        });
        // Center + frame the model.
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        obj.position.sub(center);
        const dist = maxDim * 2.2;
        camera.position.set(dist * 0.6, dist * 0.45, dist);
        camera.near = dist / 100;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();
        scene.add(obj);
        setLoading(false);
      },
      undefined,
      (err) => {
        if (disposed) return;
        // eslint-disable-next-line no-console
        console.error('FBX load error', err);
        setError(String((err && err.message) || err));
        setLoading(false);
      },
    );

    const onResize = () => {
      const w = mount.clientWidth || width;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      if (model) scene.remove(model);
      scene.traverse((o) => {
        if (o.isMesh) {
          if (o.geometry && o.geometry.dispose) o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { if (m && m.dispose) m.dispose(); });
        }
      });
      renderer.dispose();
      const el = renderer.domElement;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
  }, [src, height]);

  return (
    <div style={{position: 'relative'}}>
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: `${height}px`,
          overflow: 'hidden',
          borderRadius: 'var(--ifm-global-radius)',
          backgroundColor: 'var(--ifm-background-surface-color)',
        }}
      />
      {loading && !error && <div style={overlay}>Loading FBX…</div>}
      {error && (
        <div style={overlay}>
          ⚠️ Could not load FBX: <code>{src}</code>
        </div>
      )}
    </div>
  );
}

export default function FbxViewer({src, height = 480}) {
  const resolvedSrc = useBaseUrl(src);
  return (
    <BrowserOnly
      fallback={<div style={{height, ...boxStyle}}>Loading 3D viewer…</div>}
    >
      {() => <Scene src={resolvedSrc} height={height} />}
    </BrowserOnly>
  );
}
