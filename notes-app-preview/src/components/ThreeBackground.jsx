import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-screen Three.js particle background with mouse parallax.
 * Imported from npm `three` (not CDN) for version stability.
 */
export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 30;

    // Particle field
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const palette   = [
      [0.655, 0.545, 0.988],
      [0.024, 0.714, 0.831],
      [0.961, 0.620, 0.043],
      [0.063, 0.725, 0.506],
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.55 });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // Wireframe shapes
    const shapes = [];
    const geos   = [new THREE.IcosahedronGeometry(1.2, 0), new THREE.TetrahedronGeometry(1.4, 0), new THREE.OctahedronGeometry(1.1, 0)];
    const cols   = [0xa78bfa, 0x06b6d4, 0xf59e0b, 0x10b981, 0x3b82f6, 0xec4899];
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(
        geos[Math.floor(Math.random() * geos.length)],
        new THREE.MeshBasicMaterial({ color: cols[i % cols.length], wireframe: true, transparent: true, opacity: 0.12 })
      );
      mesh.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20 - 10);
      mesh.userData = { rx: (Math.random() - 0.5) * 0.004, ry: (Math.random() - 0.5) * 0.006, fs: 0.3 + Math.random() * 0.4, fa: 0.3 + Math.random() * 0.5, oy: mesh.position.y };
      scene.add(mesh);
      shapes.push(mesh);
    }

    let mx = 0, my = 0;
    const onMouse = e => { mx = (e.clientX / window.innerWidth - 0.5) * 2; my = -(e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("mousemove", onMouse);

    let animId, t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.01;
      particles.rotation.y += 0.0003;
      particles.rotation.x += 0.0001;
      camera.position.x += (mx * 2  - camera.position.x) * 0.02;
      camera.position.y += (my * 1.5 - camera.position.y) * 0.02;
      shapes.forEach(s => {
        s.rotation.x += s.userData.rx;
        s.rotation.y += s.userData.ry;
        s.position.y  = s.userData.oy + Math.sin(t * s.userData.fs) * s.userData.fa;
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W2 = window.innerWidth, H2 = window.innerHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize",    onResize);
      renderer.dispose();
      geo.dispose(); mat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />;
}
