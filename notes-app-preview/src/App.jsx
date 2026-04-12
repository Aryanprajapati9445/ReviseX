import { useState, useEffect, useRef, createContext, useContext } from "react";
import { notesAPI, studentsAPI } from "./api/client.js";

// ═══════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════
const ADMIN_PASSWORD = "admin123";

// ═══════════════════════════════════════════════════════════════════
// KIET EMAIL VALIDATION
// ═══════════════════════════════════════════════════════════════════
const BRANCHES = {
  cs: "Computer Science", it: "Information Technology",
  ec: "Electronics & Comm.", ee: "Electrical Engineering",
  me: "Mechanical Engineering", ce: "Civil Engineering",
  en: "Electronics & Instrumentation", ch: "Chemical Engineering",
};

// Format: firstname.YYendYY<branch><rollno>@kiet.edu
// e.g.  akshay.2428cs995@kiet.edu
function parseKietEmail(email) {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  // Must end with @kiet.edu
  if (!lower.endsWith("@kiet.edu")) return null;
  const local = lower.split("@")[0]; // akshay.2428cs995
  const dotIdx = local.indexOf(".");
  if (dotIdx < 1) return null;
  const firstName = local.slice(0, dotIdx);           // akshay
  const rest = local.slice(dotIdx + 1);               // 2428cs995
  // rest must start with 4 digits (start+end year), then 2-char branch, then roll digits
  const match = rest.match(/^(\d{2})(\d{2})([a-z]{2,3})(\d+)$/);
  if (!match) return null;
  const [, startYY, endYY, branch, roll] = match;
  if (!BRANCHES[branch]) return null;
  return {
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    email: lower,
    startYear: "20" + startYY,
    endYear: "20" + endYY,
    branch: branch.toUpperCase(),
    branchFull: BRANCHES[branch],
    roll,
    batch: `${startYY}-${endYY}`,
  };
}



// SVG icon components for each subject (realistic/symbolic)
const SubjectSVGs = {
  engmath: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="4" width="32" height="32" rx="6" fill={color + "22"} />
      <text x="20" y="26" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color} fontFamily="serif">∑</text>
      <line x1="8" y1="32" x2="32" y2="32" stroke={color} strokeWidth="1.5" opacity="0.4" />
    </svg>
  ),
  dsa: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="10" r="4" fill={color} />
      <circle cx="10" cy="25" r="4" fill={color} opacity="0.8" />
      <circle cx="30" cy="25" r="4" fill={color} opacity="0.8" />
      <circle cx="5" cy="36" r="3" fill={color} opacity="0.5" />
      <circle cx="16" cy="36" r="3" fill={color} opacity="0.5" />
      <circle cx="24" cy="36" r="3" fill={color} opacity="0.5" />
      <circle cx="35" cy="36" r="3" fill={color} opacity="0.5" />
      <line x1="20" y1="14" x2="10" y2="21" stroke={color} strokeWidth="1.5" />
      <line x1="20" y1="14" x2="30" y2="21" stroke={color} strokeWidth="1.5" />
      <line x1="10" y1="29" x2="5" y2="33" stroke={color} strokeWidth="1.2" />
      <line x1="10" y1="29" x2="16" y2="33" stroke={color} strokeWidth="1.2" />
      <line x1="30" y1="29" x2="24" y2="33" stroke={color} strokeWidth="1.2" />
      <line x1="30" y1="29" x2="35" y2="33" stroke={color} strokeWidth="1.2" />
    </svg>
  ),
  os: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="6" width="32" height="22" rx="3" stroke={color} strokeWidth="2" fill={color + "15"} />
      <rect x="8" y="10" width="24" height="14" rx="1" fill={color + "30"} />
      <rect x="15" y="28" width="10" height="3" fill={color} opacity="0.5" />
      <rect x="10" y="31" width="20" height="2" rx="1" fill={color} opacity="0.4" />
      <circle cx="13" cy="13" r="1.5" fill={color} opacity="0.7" />
      <rect x="17" y="12" width="12" height="1.5" rx="0.75" fill={color} opacity="0.5" />
      <rect x="17" y="15" width="8" height="1.5" rx="0.75" fill={color} opacity="0.4" />
      <rect x="17" y="18" width="10" height="1.5" rx="0.75" fill={color} opacity="0.3" />
    </svg>
  ),
  dbms: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="11" rx="13" ry="5" fill={color + "30"} stroke={color} strokeWidth="1.5" />
      <path d="M7 11 Q7 19 20 19 Q33 19 33 11" stroke={color} strokeWidth="1.5" fill={color + "20"} />
      <path d="M7 19 Q7 27 20 27 Q33 27 33 19" stroke={color} strokeWidth="1.5" fill={color + "15"} />
      <ellipse cx="20" cy="27" rx="13" ry="5" fill={color + "20"} stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  networks: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="1" fill="none" opacity="0.3" />
      <ellipse cx="20" cy="20" rx="5" ry="10" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
      <line x1="4" y1="20" x2="36" y2="20" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="4" x2="20" y2="36" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="20" cy="20" r="2" fill={color} />
    </svg>
  ),
  circuits: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <polyline points="4,20 10,20 12,12 16,28 20,14 24,26 28,20 36,20" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="4" cy="20" r="2" fill={color} opacity="0.6" />
      <circle cx="36" cy="20" r="2" fill={color} opacity="0.6" />
    </svg>
  ),
  algorithms: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="6" y="6" width="28" height="28" rx="4" stroke={color} strokeWidth="1.5" fill={color + "10"} />
      <rect x="10" y="10" width="8" height="5" rx="1" fill={color} opacity="0.7" />
      <rect x="22" y="10" width="8" height="5" rx="1" fill={color} opacity="0.5" />
      <rect x="16" y="20" width="8" height="5" rx="1" fill={color} opacity="0.8" />
      <rect x="10" y="30" width="5" height="4" rx="1" fill={color} opacity="0.4" />
      <rect x="25" y="30" width="5" height="4" rx="1" fill={color} opacity="0.4" />
      <line x1="14" y1="15" x2="20" y2="20" stroke={color} strokeWidth="1" opacity="0.6" />
      <line x1="26" y1="15" x2="20" y2="20" stroke={color} strokeWidth="1" opacity="0.6" />
      <line x1="20" y1="25" x2="12" y2="30" stroke={color} strokeWidth="1" opacity="0.6" />
      <line x1="20" y1="25" x2="27" y2="30" stroke={color} strokeWidth="1" opacity="0.6" />
    </svg>
  ),
  software: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="5" y="8" width="30" height="24" rx="3" stroke={color} strokeWidth="1.5" fill={color + "10"} />
      <rect x="5" y="8" width="30" height="6" rx="3" fill={color + "30"} />
      <circle cx="10" cy="11" r="1.5" fill={color} opacity="0.8" />
      <circle cx="15" cy="11" r="1.5" fill="#f59e0b" opacity="0.8" />
      <circle cx="20" cy="11" r="1.5" fill="#10b981" opacity="0.8" />
      <text x="9" y="25" fontSize="7" fill={color} opacity="0.8" fontFamily="monospace">{"<code />"}</text>
      <text x="9" y="30" fontSize="6" fill={color} opacity="0.5" fontFamily="monospace">{"// build"}</text>
    </svg>
  ),
  ml: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="5" fill={color} opacity="0.9" />
      <circle cx="8" cy="12" r="3" fill={color} opacity="0.6" />
      <circle cx="32" cy="12" r="3" fill={color} opacity="0.6" />
      <circle cx="8" cy="28" r="3" fill={color} opacity="0.6" />
      <circle cx="32" cy="28" r="3" fill={color} opacity="0.6" />
      <circle cx="20" cy="5" r="2.5" fill={color} opacity="0.4" />
      <circle cx="20" cy="35" r="2.5" fill={color} opacity="0.4" />
      <line x1="20" y1="15" x2="8" y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="15" x2="32" y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="25" x2="8" y2="25" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="25" x2="32" y2="25" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="15" x2="20" y2="7.5" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="25" x2="20" y2="32.5" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="15" y1="20" x2="11" y2="14" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <line x1="15" y1="20" x2="11" y2="26" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <line x1="25" y1="20" x2="29" y2="14" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <line x1="25" y1="20" x2="29" y2="26" stroke={color} strokeWidth="0.8" opacity="0.4" />
    </svg>
  ),
  mechanics: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="10" stroke={color} strokeWidth="2" fill={color + "15"} />
      <circle cx="20" cy="20" r="4" fill={color} opacity="0.8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
        <rect key={i} x="18.5" y="8" width="3" height="5" rx="1" fill={color} opacity="0.6"
          transform={`rotate(${a} 20 20)`} />
      ))}
    </svg>
  ),
  thermodynamics: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="17" y="6" width="6" height="18" rx="3" stroke={color} strokeWidth="1.5" fill={color + "20"} />
      <circle cx="20" cy="28" r="6" stroke={color} strokeWidth="2" fill={color + "30"} />
      <rect x="18.5" y="10" width="3" height="12" rx="1.5" fill={color} opacity="0.7" />
      <line x1="23" y1="10" x2="27" y2="10" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="23" y1="14" x2="26" y2="14" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="23" y1="18" x2="27" y2="18" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="20" cy="28" r="3" fill={color} opacity="0.8" />
    </svg>
  ),
  signals: ({ color, size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="3" fill={color} />
      <path d="M20 17 Q26 12 26 7" stroke={color} strokeWidth="1.5" fill="none" opacity="0.9" strokeLinecap="round" />
      <path d="M20 17 Q30 10 32 4" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M20 17 Q14 10 12 5" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
      <line x1="20" y1="23" x2="20" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13" y1="34" x2="27" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="31" x2="24" y2="31" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const DEFAULT_SVG = ({ color, size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="6" y="6" width="28" height="28" rx="5" stroke={color} strokeWidth="1.5" fill={color + "18"} />
    <text x="20" y="26" textAnchor="middle" fontSize="16" fill={color} fontFamily="sans-serif">?</text>
  </svg>
);

function SubjectIcon({ sectionId, color, size = 40 }) {
  const Comp = SubjectSVGs[sectionId] || DEFAULT_SVG;
  return <Comp color={color} size={size} />;
}

const SECTIONS = [
  { id: "engmath", label: "Engg. Mathematics", color: "#f59e0b" },
  { id: "dsa", label: "Data Structures", color: "#06b6d4" },
  { id: "os", label: "Operating Systems", color: "#8b5cf6" },
  { id: "dbms", label: "DBMS", color: "#10b981" },
  { id: "networks", label: "Computer Networks", color: "#3b82f6" },
  { id: "circuits", label: "Circuits & Systems", color: "#f97316" },
  { id: "algorithms", label: "Algorithms", color: "#ec4899" },
  { id: "software", label: "Software Engg.", color: "#ef4444" },
  { id: "ml", label: "Machine Learning", color: "#a78bfa" },
  { id: "mechanics", label: "Engg. Mechanics", color: "#14b8a6" },
  { id: "thermodynamics", label: "Thermodynamics", color: "#fb923c" },
  { id: "signals", label: "Signals & Systems", color: "#22d3ee" },
];

const EXAM_TYPES = [
  { id: "mse1", label: "MSE 1", color: "#3b82f6", bg: "#0f1e35", icon: "I" },
  { id: "mse2", label: "MSE 2", color: "#10b981", bg: "#0a1f18", icon: "II" },
  { id: "endsem", label: "End Sem", color: "#f59e0b", bg: "#201508", icon: "★" },
];

const INITIAL_NOTES = [
  { id: 1, title: "Engineering Mathematics – Linear Algebra", section: "engmath", examType: "mse1", description: "Matrices, determinants, eigenvalues, eigenvectors and systems of linear equations.", uploader: "Admin", date: "2026-03-10", pages: 28, size: "1.4 MB", content: "" },
  { id: 2, title: "Data Structures – Trees & Graphs", section: "dsa", examType: "mse2", description: "Binary trees, BSTs, AVL trees, BFS, DFS and shortest path algorithms.", uploader: "Admin", date: "2026-03-12", pages: 36, size: "1.9 MB", content: "" },
  { id: 3, title: "Operating Systems – Process & Memory", section: "os", examType: "endsem", description: "Processes, scheduling, deadlocks, and memory management techniques.", uploader: "Admin", date: "2026-03-15", pages: 40, size: "2.1 MB", content: "" },
  { id: 4, title: "Computer Networks – OSI Model", section: "networks", examType: "mse1", description: "OSI/TCP-IP layers, key protocols, IP addressing and routing algorithms.", uploader: "Admin", date: "2026-03-16", pages: 34, size: "1.7 MB", content: "" },
  { id: 5, title: "Machine Learning – Supervised Learning", section: "ml", examType: "endsem", description: "Linear regression, SVM, decision trees and model evaluation metrics.", uploader: "Admin", date: "2026-03-18", pages: 30, size: "1.6 MB", content: "" },
];

// ═══════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════
const RouterCtx = createContext(null);
function Router({ children }) {
  const [page, setPage] = useState({ name: "home", params: {} });
  const navigate = (name, params = {}) => { setPage({ name, params }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <RouterCtx.Provider value={{ page, navigate }}>{children}</RouterCtx.Provider>;
}
function useRouter() { return useContext(RouterCtx); }

const AppCtx = createContext(null);
function useApp() { return useContext(AppCtx); }

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════
function formatDate(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function downloadNote(note) {
  const a = document.createElement("a");
  if (note.content && note.content.startsWith("data:")) {
    a.href = note.content;
    a.download = note.fileName || (note.title.replace(/\s+/g, "_") + (note.fileType || ".bin"));
  } else {
    const blob = new Blob([note.content || ""], { type: "text/plain" });
    a.href = URL.createObjectURL(blob);
    a.download = note.fileName || (note.title.replace(/\s+/g, "_") + ".txt");
  }
  a.click();
}

// ═══════════════════════════════════════════════════════════════════
// THREE.JS PARTICLE BACKGROUND
// ═══════════════════════════════════════════════════════════════════
function ThreeBackground() {
  const mountRef = useRef(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => initThree(el);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  function initThree(container) {
    const THREE = window.THREE;
    if (!THREE) return;
    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 30;

    // Particle field
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      [0.655, 0.545, 0.988], // purple
      [0.024, 0.714, 0.831], // cyan
      [0.961, 0.620, 0.043], // amber
      [0.063, 0.725, 0.506], // green
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.55 });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // Floating geometric shapes
    const shapes = [];
    const shapeGeos = [
      new THREE.IcosahedronGeometry(1.2, 0),
      new THREE.TetrahedronGeometry(1.4, 0),
      new THREE.OctahedronGeometry(1.1, 0),
    ];
    const shapeCols = [0xa78bfa, 0x06b6d4, 0xf59e0b, 0x10b981, 0x3b82f6, 0xec4899];
    for (let i = 0; i < 12; i++) {
      const geoIdx = Math.floor(Math.random() * shapeGeos.length);
      const wireMat = new THREE.MeshBasicMaterial({ color: shapeCols[i % shapeCols.length], wireframe: true, transparent: true, opacity: 0.12 });
      const mesh = new THREE.Mesh(shapeGeos[geoIdx], wireMat);
      mesh.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20 - 10);
      mesh.userData = { rx: (Math.random() - 0.5) * 0.004, ry: (Math.random() - 0.5) * 0.006, floatSpeed: 0.3 + Math.random() * 0.4, floatAmp: 0.3 + Math.random() * 0.5, origY: mesh.position.y };
      scene.add(mesh);
      shapes.push(mesh);
    }

    // Mouse parallax
    let mx = 0, my = 0;
    const onMouse = e => { mx = (e.clientX / window.innerWidth - 0.5) * 2; my = -(e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("mousemove", onMouse);

    let animId;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.01;
      particles.rotation.y += 0.0003;
      particles.rotation.x += 0.0001;
      camera.position.x += (mx * 2 - camera.position.x) * 0.02;
      camera.position.y += (my * 1.5 - camera.position.y) * 0.02;
      shapes.forEach(s => {
        s.rotation.x += s.userData.rx;
        s.rotation.y += s.userData.ry;
        s.position.y = s.userData.origY + Math.sin(t * s.userData.floatSpeed) * s.userData.floatAmp;
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W2 = window.innerWidth, H2 = window.innerHeight;
      camera.aspect = W2 / H2; camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    container._threeCleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }

  useEffect(() => () => { if (mountRef.current?._threeCleanup) mountRef.current._threeCleanup(); }, []);

  return <div ref={mountRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />;
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL STYLE
// ═══════════════════════════════════════════════════════════════════
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { background:#05050f; color:#e2e2f0; font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden; }
    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-track { background:#0a0a18; }
    ::-webkit-scrollbar-thumb { background:#2a2a4a; border-radius:4px; }
    input,textarea,select { font-family:inherit; }
    button { cursor:pointer; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    .fadeUp  { animation: fadeUp 0.55s ease both; }
    .fadeUp2 { animation: fadeUp 0.55s 0.12s ease both; }
    .fadeUp3 { animation: fadeUp 0.55s 0.24s ease both; }
    .card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease !important; }
    .card-hover:hover { transform: translateY(-6px) !important; box-shadow: 0 24px 60px rgba(0,0,0,0.6) !important; }
    .btn-scale { transition: transform 0.15s ease, opacity 0.15s ease !important; }
    .btn-scale:hover { transform: scale(1.05) !important; opacity:0.92; }
    .btn-scale:active { transform: scale(0.97) !important; }
    .glass { background: rgba(13,13,26,0.75) !important; backdrop-filter: blur(16px); }
  `}</style>
);

// ═══════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════
function Navbar() {
  const { navigate, page } = useRouter();
  const { isAdmin, setShowLogin, setIsAdmin, student, setStudent, setShowStudentLogin } = useApp();
  const BRANCH_COLORS = { CS: "#a78bfa", IT: "#06b6d4", EC: "#f59e0b", EE: "#f97316", ME: "#10b981", CE: "#3b82f6", EN: "#ec4899", CH: "#14b8a6" };
  const branchColor = student ? (BRANCH_COLORS[student.branch] || "#a78bfa") : "#a78bfa";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const navItems = [{ label: "Home", name: "home" }, { label: "Subjects", name: "subjects" }, { label: "Notes", name: "notes" }];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: scrolled ? "rgba(5,5,15,0.95)" : "rgba(5,5,15,0.4)", backdropFilter: "blur(20px)", borderBottom: scrolled ? "1px solid rgba(167,139,250,0.15)" : "1px solid transparent", transition: "all 0.35s", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>
      <div onClick={() => navigate("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9" /><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6" /><rect x="4" y="6" width="2" height="1.5" rx="0.75" fill="#7c3aed" /><rect x="4" y="9" width="2" height="1.5" rx="0.75" fill="#7c3aed" /></svg>
        </div>
        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.3px" }}>Exam<span style={{ color: "#a78bfa" }}>Notes</span></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {navItems.map(item => (
          <button key={item.name} onClick={() => navigate(item.name)} style={{ background: page.name === item.name ? "rgba(167,139,250,0.15)" : "transparent", border: page.name === item.name ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: page.name === item.name ? "#a78bfa" : "#777", padding: "7px 18px", borderRadius: 10, fontSize: 14, fontWeight: page.name === item.name ? 600 : 400, transition: "all 0.2s" }}>{item.label}</button>
        ))}
        {isAdmin && (
          <button onClick={() => navigate("admin")} style={{ background: page.name === "admin" ? "rgba(167,139,250,0.15)" : "transparent", border: page.name === "admin" ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: page.name === "admin" ? "#a78bfa" : "#777", padding: "7px 18px", borderRadius: 10, fontSize: 14, fontWeight: page.name === "admin" ? 600 : 400, transition: "all 0.2s" }}>Admin</button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Student badge */}
        {student && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(13,13,26,0.8)", border: `1px solid ${branchColor}25`, borderRadius: 12, padding: "5px 12px 5px 6px", backdropFilter: "blur(10px)" }}>
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg,${branchColor}cc,${branchColor})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 12, color: "#fff" }}>{student.firstName.charAt(0)}</div>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 12, color: "#fff", lineHeight: 1 }}>{student.firstName}</div>
              <div style={{ color: branchColor, fontSize: 10, fontWeight: 600 }}>{student.branch} · {student.batch}</div>
            </div>
          </div>
        )}
        {!student && (
          <button className="btn-scale" onClick={() => setShowStudentLogin(true)}
            style={{ background: "linear-gradient(135deg,#059669,#10b981)", border: "none", color: "#fff", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(16,185,129,0.35)", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="white" strokeWidth="1.4"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Student Login
          </button>
        )}
        {isAdmin ? (
          <>
            <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.3px" }}>⚡ Admin</span>
            <button onClick={() => { setIsAdmin(false); if (page.name === "admin") navigate("home"); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", padding: "7px 16px", borderRadius: 8, fontSize: 13 }}>Logout</button>
          </>
        ) : (
          <button className="btn-scale" onClick={() => setShowLogin(true)} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>Admin Login</button>
        )}
        {student && (
          <button onClick={() => setStudent(null)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Sign Out</button>
        )}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════
function Footer() {
  const { navigate } = useRouter();
  const { sections } = useApp();
  return (
    <footer style={{ background: "rgba(5,5,15,0.98)", borderTop: "1px solid rgba(167,139,250,0.1)", padding: "52px 40px 28px", position: "relative", zIndex: 10 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9" /><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6" /></svg></div>
              <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>ExamNotes Hub</span>
            </div>
            <p style={{ color: "#333", fontSize: 14, lineHeight: 1.85, maxWidth: 280 }}>Free, high-quality engineering exam notes. Study smarter, score higher.</p>
          </div>
          <div>
            <div style={{ color: "#444", fontWeight: 700, fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px" }}>Navigate</div>
            {["home", "subjects", "notes"].map(p => (
              <div key={p} onClick={() => navigate(p)} style={{ color: "#333", fontSize: 14, marginBottom: 10, cursor: "pointer", textTransform: "capitalize", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "#a78bfa"} onMouseLeave={e => e.target.style.color = "#333"}>{p}</div>
            ))}
          </div>
          <div>
            <div style={{ color: "#444", fontWeight: 700, fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px" }}>Subjects</div>
            {sections.slice(0, 6).map(s => <div key={s.id} style={{ color: "#333", fontSize: 13, marginBottom: 8 }}>{s.label}</div>)}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 22, display: "flex", justifyContent: "space-between", color: "#222", fontSize: 13, flexWrap: "wrap", gap: 8 }}>
          <span>© 2026 ExamNotes Hub. All rights reserved.</span>
          <span>Built for Engineering Students 🎓</span>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOTE CARD (download only, no reader)
// ═══════════════════════════════════════════════════════════════════
function NoteCard({ note }) {
  const { sections } = useApp();
  const sec = sections.find(s => s.id === note.section) || { color: "#888", label: "Unknown" };
  const et = EXAM_TYPES.find(e => e.id === note.examType);
  return (
    <div className="card-hover" style={{ background: "rgba(13,13,26,0.8)", border: `1px solid ${sec.color}20`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", backdropFilter: "blur(10px)" }}>
      <div style={{ background: `linear-gradient(135deg,${sec.color}18,${sec.color}06)`, padding: "22px 20px 16px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: `${sec.color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <SubjectIcon sectionId={note.section} color={sec.color} size={30} />
          </div>
          <div>
            <span style={{ background: `${sec.color}18`, color: sec.color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.3px" }}>{sec.label}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 20px", flex: 1 }}>
        {et && <span style={{ background: et.bg, color: et.color, border: `1px solid ${et.color}40`, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, display: "inline-block", marginBottom: 10, letterSpacing: "0.5px" }}>{et.icon} {et.label}</span>}
        <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 8, lineHeight: 1.35 }}>{note.title}</h3>
        <p style={{ color: "#4a4a6a", fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>{note.description}</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#333" }}>
          <span>📄 {note.pages}p</span>
          <span>💾 {note.size}</span>
          <span>🗓 {formatDate(note.date)}</span>
        </div>
      </div>
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${sec.color}15` }}>
        <button onClick={() => downloadNote(note)} style={{ width: "100%", background: `linear-gradient(135deg,${sec.color}cc,${sec.color})`, border: "none", color: "#fff", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 16px ${sec.color}33` }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Download Note
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: HOME
// ═══════════════════════════════════════════════════════════════════
function HomePage() {
  const { navigate } = useRouter();
  const { notes, sections, student } = useApp();
  const BRANCH_COLORS = { CS: "#a78bfa", IT: "#06b6d4", EC: "#f59e0b", EE: "#f97316", ME: "#10b981", CE: "#3b82f6", EN: "#ec4899", CH: "#14b8a6" };
  const branchColor = student ? (BRANCH_COLORS[student.branch] || "#a78bfa") : "#a78bfa";
  const recentNotes = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      {/* Student Welcome Banner */}
      {student && (
        <div style={{ background: `linear-gradient(135deg,${branchColor}12,rgba(13,13,26,0.9))`, borderBottom: `1px solid ${branchColor}20`, padding: "12px 40px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${branchColor}cc,${branchColor})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>{student.firstName.charAt(0)}</div>
          <div>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Welcome back, {student.firstName}!</span>
            <span style={{ color: "#444", fontSize: 13, marginLeft: 10 }}>{student.branchFull} · Batch {student.batch} · Roll {student.roll}</span>
          </div>
          <span style={{ background: `${branchColor}15`, color: branchColor, border: `1px solid ${branchColor}30`, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginLeft: "auto" }}>KIET Student</span>
        </div>
      )}
      {/* Hero */}
      <section style={{ padding: "140px 40px 100px", textAlign: "center", position: "relative" }}>
        <div className="fadeUp">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 20, padding: "6px 18px", fontSize: 13, color: "#a78bfa", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, background: "#a78bfa", borderRadius: "50%", display: "inline-block", animation: "pulse 2.5s infinite" }} />
            Free Engineering Notes — Always Updated
          </div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "clamp(40px,6vw,80px)", lineHeight: 1.06, color: "#fff", marginBottom: 24, letterSpacing: "-1px" }}>
            Study Smarter,<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa 0%,#7c3aed 40%,#ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Score Higher.</span>
          </h1>
          <p style={{ color: "#555", fontSize: 18, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.75 }}>Curated engineering exam notes classified by subject and exam type. Download and study.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-scale" onClick={() => navigate("notes")} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "15px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 8px 32px rgba(124,58,237,0.45)" }}>Browse All Notes →</button>
            <button className="btn-scale" onClick={() => navigate("subjects")} style={{ background: "rgba(255,255,255,0.04)", color: "#aaa", border: "1px solid rgba(255,255,255,0.1)", padding: "15px 36px", borderRadius: 12, fontSize: 16 }}>Explore Subjects</button>
          </div>
        </div>
        <div className="fadeUp2" style={{ display: "flex", justifyContent: "center", gap: 60, marginTop: 80, flexWrap: "wrap" }}>
          {[["📚", notes.length + "+ Notes", "Available"], ["📖", sections.length + " Subjects", "Covered"], ["⬇", "100%", "Free Download"]].map(([icon, val, sub]) => (
            <div key={val} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 26, color: "#fff" }}>{val}</div>
              <div style={{ color: "#333", fontSize: 13, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Exam type bands */}
      <section style={{ padding: "0 40px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {EXAM_TYPES.map(et => {
            const cnt = notes.filter(n => n.examType === et.id).length;
            return (
              <div key={et.id} className="card-hover" onClick={() => navigate("notes")} style={{ background: et.bg, border: `1px solid ${et.color}30`, borderRadius: 18, padding: "22px 24px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 52, height: 52, background: `${et.color}20`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, color: et.color }}>{et.icon}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>{et.label}</div>
                  <div style={{ color: et.color, fontSize: 13, marginTop: 2 }}>{cnt} note{cnt !== 1 ? "s" : ""} available</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Subjects grid */}
      <section style={{ padding: "0 40px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Browse By</div>
            <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 30, color: "#fff" }}>Subjects</h2>
          </div>
          <button onClick={() => navigate("subjects")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#777", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>View All →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
          {sections.slice(0, 8).map(sec => (
            <div key={sec.id} className="card-hover" onClick={() => navigate("subjectDetail", { sectionId: sec.id })} style={{ background: "rgba(13,13,26,0.8)", border: `1px solid ${sec.color}18`, borderRadius: 16, padding: "20px 14px", cursor: "pointer", textAlign: "center", backdropFilter: "blur(10px)" }}>
              <div style={{ width: 52, height: 52, background: `${sec.color}15`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <SubjectIcon sectionId={sec.id} color={sec.color} size={34} />
              </div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 12, color: "#ccc", lineHeight: 1.3 }}>{sec.label}</div>
              <div style={{ color: sec.color, fontSize: 11, marginTop: 4, fontWeight: 600 }}>{notes.filter(n => n.section === sec.id).length} notes</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent notes */}
      <section style={{ padding: "0 40px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Latest</div>
            <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 30, color: "#fff" }}>Recent Notes</h2>
          </div>
          <button onClick={() => navigate("notes")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#777", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>See All →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
          {recentNotes.map(n => <NoteCard key={n.id} note={n} />)}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 40px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.25),rgba(167,139,250,0.08))", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 24, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden", backdropFilter: "blur(20px)" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, background: "radial-gradient(circle,rgba(167,139,250,0.15),transparent)", pointerEvents: "none" }} />
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 36, color: "#fff", marginBottom: 14, position: "relative" }}>Ready to ace your exams?</h2>
          <p style={{ color: "#555", fontSize: 16, marginBottom: 32, position: "relative" }}>Download free notes for MSE 1, MSE 2 and End Semester exams.</p>
          <button className="btn-scale" onClick={() => navigate("notes")} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "15px 40px", borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 8px 32px rgba(124,58,237,0.45)" }}>Start Downloading →</button>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: SUBJECTS
// ═══════════════════════════════════════════════════════════════════
function SubjectsPage() {
  const { navigate } = useRouter();
  const { notes, sections } = useApp();
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "110px 40px 60px", position: "relative", zIndex: 10 }}>
      <div className="fadeUp" style={{ textAlign: "center", marginBottom: 52 }}>
        <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Explore</div>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 46, color: "#fff", marginBottom: 14, letterSpacing: "-0.5px" }}>All Subjects</h1>
        <p style={{ color: "#555", fontSize: 16, maxWidth: 440, margin: "0 auto" }}>Pick a subject to browse and download its notes.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 18 }}>
        {sections.map((sec, i) => {
          const count = notes.filter(n => n.section === sec.id).length;
          const examCounts = EXAM_TYPES.map(et => ({ ...et, cnt: notes.filter(n => n.section === sec.id && n.examType === et.id).length }));
          return (
            <div key={sec.id} className="card-hover" onClick={() => navigate("subjectDetail", { sectionId: sec.id })}
              style={{ background: "rgba(13,13,26,0.8)", border: `1px solid ${sec.color}22`, borderRadius: 20, padding: 24, cursor: "pointer", backdropFilter: "blur(10px)", animation: `fadeUp 0.45s ${i * 0.04}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, background: `${sec.color}15`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SubjectIcon sectionId={sec.id} color={sec.color} size={40} />
                </div>
                <div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>{sec.label}</div>
                  <div style={{ color: sec.color, fontSize: 12, fontWeight: 600, marginTop: 3 }}>{count} note{count !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {examCounts.map(et => et.cnt > 0 && (
                  <span key={et.id} style={{ background: et.bg, color: et.color, border: `1px solid ${et.color}30`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{et.label}: {et.cnt}</span>
                ))}
              </div>
              <div style={{ height: 2, background: `${sec.color}18`, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(count * 25, 100)}%`, background: `linear-gradient(90deg,${sec.color}66,${sec.color})`, borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 14, color: "#a78bfa", fontSize: 13, fontWeight: 600 }}>Browse & Download →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: SUBJECT DETAIL
// ═══════════════════════════════════════════════════════════════════
function SubjectDetailPage({ sectionId }) {
  const { navigate } = useRouter();
  const { notes, sections } = useApp();
  const sec = sections.find(s => s.id === sectionId);
  const [search, setSearch] = useState("");
  const [activeExam, setActiveExam] = useState(null);
  if (!sec) return null;
  const sectionNotes = notes.filter(n => n.section === sectionId);
  const filtered = sectionNotes.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchExam = !activeExam || n.examType === activeExam;
    return matchSearch && matchExam;
  });
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "110px 40px 60px", position: "relative", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, color: "#333", fontSize: 13 }}>
        <span onClick={() => navigate("subjects")} style={{ cursor: "pointer", color: "#a78bfa" }}>Subjects</span>
        <span>›</span><span style={{ color: "#666" }}>{sec.label}</span>
      </div>
      <div className="fadeUp" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36, flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, background: `${sec.color}18`, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${sec.color}30` }}>
          <SubjectIcon sectionId={sec.id} color={sec.color} size={48} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 34, color: "#fff", marginBottom: 4 }}>{sec.label}</h1>
          <p style={{ color: "#444", fontSize: 14 }}>{sectionNotes.length} note{sectionNotes.length !== 1 ? "s" : ""} available</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search notes..." style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", width: 240, backdropFilter: "blur(10px)" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        <button onClick={() => setActiveExam(null)} style={{ background: activeExam === null ? "rgba(167,139,250,0.15)" : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === null ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.07)"}`, color: activeExam === null ? "#a78bfa" : "#555", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>All Exams</button>
        {EXAM_TYPES.map(et => (
          <button key={et.id} onClick={() => setActiveExam(activeExam === et.id ? null : et.id)} style={{ background: activeExam === et.id ? et.bg : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === et.id ? et.color + "50" : "rgba(255,255,255,0.07)"}`, color: activeExam === et.id ? et.color : "#555", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{et.icon} {et.label}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}><div style={{ fontSize: 52, marginBottom: 12 }}>📭</div><p>No notes found.</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
          {filtered.map(n => <NoteCard key={n.id} note={n} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: ALL NOTES
// ═══════════════════════════════════════════════════════════════════
function NotesPage() {
  const { notes, sections } = useApp();
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const [activeExam, setActiveExam] = useState(null);
  const [sort, setSort] = useState("newest");
  let filtered = notes.filter(n => {
    const matchSec = !activeSection || n.section === activeSection;
    const matchExam = !activeExam || n.examType === activeExam;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase());
    return matchSec && matchExam && matchSearch;
  });
  if (sort === "newest") filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (sort === "oldest") filtered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
  else if (sort === "az") filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "110px 40px 60px", position: "relative", zIndex: 10 }}>
      <div className="fadeUp" style={{ marginBottom: 32 }}>
        <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Library</div>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 42, color: "#fff", marginBottom: 6, letterSpacing: "-0.5px" }}>All Notes</h1>
        <p style={{ color: "#444", fontSize: 15 }}>{notes.length} notes across {sections.length} subjects</p>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search notes..." style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", flex: 1, minWidth: 220, backdropFilter: "blur(10px)" }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px", color: "#aaa", fontSize: 14, outline: "none" }}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="az">A → Z</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => setActiveSection(null)} style={{ background: activeSection === null ? "rgba(167,139,250,0.15)" : "rgba(13,13,26,0.6)", border: `1px solid ${activeSection === null ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.06)"}`, color: activeSection === null ? "#a78bfa" : "#444", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>All Subjects</button>
        {sections.map(sec => (
          <button key={sec.id} onClick={() => setActiveSection(activeSection === sec.id ? null : sec.id)} style={{ background: activeSection === sec.id ? `${sec.color}18` : "rgba(13,13,26,0.6)", border: `1px solid ${activeSection === sec.id ? sec.color + "40" : "rgba(255,255,255,0.06)"}`, color: activeSection === sec.id ? sec.color : "#444", padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex" }}><SubjectIcon sectionId={sec.id} color={activeSection === sec.id ? sec.color : "#555"} size={14} /></span>{sec.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        <button onClick={() => setActiveExam(null)} style={{ background: activeExam === null ? "rgba(167,139,250,0.12)" : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === null ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}`, color: activeExam === null ? "#a78bfa" : "#444", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>All Exams</button>
        {EXAM_TYPES.map(et => (
          <button key={et.id} onClick={() => setActiveExam(activeExam === et.id ? null : et.id)} style={{ background: activeExam === et.id ? et.bg : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === et.id ? et.color + "50" : "rgba(255,255,255,0.06)"}`, color: activeExam === et.id ? et.color : "#444", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{et.icon} {et.label}</button>
        ))}
      </div>
      <div style={{ color: "#333", fontSize: 13, marginBottom: 20 }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}><div style={{ fontSize: 52, marginBottom: 12 }}>📭</div><p>No notes match your filters.</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
          {filtered.map(n => <NoteCard key={n.id} note={n} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUBJECTS MANAGER TAB
// ═══════════════════════════════════════════════════════════════════
const COLOR_PRESETS = ["#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#3b82f6", "#f97316", "#ec4899", "#ef4444", "#a78bfa", "#14b8a6", "#fb923c", "#22d3ee", "#84cc16", "#e879f9", "#f43f5e"];
function SubjectsManagerTab({ sections, setSections, notes }) {
  const [newSub, setNewSub] = useState({ label: "", color: "#a78bfa" });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [error, setError] = useState("");
  const inp = { background: "#030308", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", fontFamily: "inherit" };
  const lbl = { display: "block", color: "#444", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
  function handleAdd() {
    if (!newSub.label.trim()) { setError("Subject name is required."); return; }
    const id = newSub.label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
    setSections(prev => [...prev, { id, label: newSub.label.trim(), color: newSub.color }]);
    setNewSub({ label: "", color: "#a78bfa" }); setError("");
  }
  function handleDelete(id) {
    const count = notes.filter(n => n.section === id).length;
    if (count > 0 && !window.confirm(`This subject has ${count} note(s). Delete anyway?`)) return;
    setSections(prev => prev.filter(s => s.id !== id));
  }
  function startEdit(sec) { setEditId(sec.id); setEditData({ label: sec.label, color: sec.color }); }
  function saveEdit(id) {
    if (!editData.label.trim()) return;
    setSections(prev => prev.map(s => s.id === id ? { ...s, label: editData.label.trim(), color: editData.color } : s));
    setEditId(null);
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ background: "rgba(13,13,26,0.9)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 22 }}>➕ Add New Subject</h2>
        {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}
        <div style={{ marginBottom: 16 }}><label style={lbl}>Subject Name *</label><input style={inp} placeholder="e.g. Control Systems" value={newSub.label} onChange={e => setNewSub({ ...newSub, label: e.target.value })} /></div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {COLOR_PRESETS.map(c => <div key={c} onClick={() => setNewSub({ ...newSub, color: c })} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: newSub.color === c ? "3px solid #fff" : "2px solid transparent", transition: "border 0.15s" }} />)}
          </div>
        </div>
        <div style={{ background: "#030308", border: `1px solid ${newSub.color}30`, borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, background: `${newSub.color}18`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SubjectIcon sectionId="custom" color={newSub.color} size={30} />
          </div>
          <div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>{newSub.label || "Subject Name"}</div>
            <div style={{ color: newSub.color, fontSize: 12, marginTop: 2 }}>Preview</div>
          </div>
        </div>
        <button onClick={handleAdd} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", width: "100%" }}>➕ Add Subject</button>
      </div>
      <div style={{ background: "rgba(13,13,26,0.9)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 28 }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 22 }}>🗂 All Subjects ({sections.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto" }}>
          {sections.map(sec => (
            <div key={sec.id} style={{ background: "#030308", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 16px" }}>
              {editId === sec.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input style={{ ...inp, padding: "7px 12px" }} value={editData.label} onChange={e => setEditData({ ...editData, label: e.target.value })} />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {COLOR_PRESETS.map(c => <div key={c} onClick={() => setEditData({ ...editData, color: c })} style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: editData.color === c ? "2px solid #fff" : "2px solid transparent" }} />)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveEdit(sec.id)} style={{ flex: 1, background: "#10b981", border: "none", color: "#fff", padding: "7px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>✓ Save</button>
                    <button onClick={() => setEditId(null)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", padding: "7px", borderRadius: 8, fontSize: 13 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, background: `${sec.color}18`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SubjectIcon sectionId={sec.id} color={sec.color} size={26} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.label}</div>
                    <div style={{ color: "#333", fontSize: 11, marginTop: 2 }}>{notes.filter(n => n.section === sec.id).length} notes</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEdit(sec)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#aaa", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>✏</button>
                    <button onClick={() => handleDelete(sec.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE: ADMIN
// ═══════════════════════════════════════════════════════════════════
function AdminPage() {
  const { notes, setNotes, sections, setSections } = useApp();
  const [form, setForm] = useState({ title: "", section: sections[0]?.id || "engmath", examType: "mse1", description: "", content: "", pages: "", size: "", fileName: "", fileType: "" });
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState("upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);
  const ACCEPTED = [".txt", ".md", ".pdf", ".doc", ".docx"];
  const inp = { background: "#030308", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", fontFamily: "inherit" };
  const lbl = { display: "block", color: "#444", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
  const isBinary = [".pdf", ".doc", ".docx"].includes(form.fileType);
  const fileIcon = form.fileType === ".pdf" ? "📕" : form.fileType === ".md" ? "📝" : form.fileType?.includes("doc") ? "📘" : "📄";

  function readFile(file) {
    setFileError("");
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) { setFileError("Unsupported file. Accepted: .txt .md .pdf .doc .docx"); return; }
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const autoTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    if ([".txt", ".md"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = e => { const text = e.target.result; setForm(f => ({ ...f, content: text, fileName: file.name, fileType: ext, size: sizeMB, pages: Math.max(1, Math.ceil(text.split("\n").length / 40)), title: f.title || autoTitle })); };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = e => { setForm(f => ({ ...f, content: e.target.result, fileName: file.name, fileType: ext, size: sizeMB, pages: "?", title: f.title || autoTitle })); };
      reader.readAsDataURL(file);
    }
  }

  async function handleUpload() {
    if (!form.title) return alert("Please enter a title.");
    if (!form.description) return alert("Please enter a description.");
    if (!form.content) return alert("Please upload a file first.");
    
    // Create payload
    const noteData = { 
        title: form.title, 
        section: form.section, 
        examType: form.examType, 
        description: form.description, 
        content: form.content, 
        fileName: form.fileName, 
        fileType: form.fileType, 
        pages: parseInt(form.pages) || 1, 
        size: form.size || "—", 
        uploader: "Admin" 
    };

    try {
        const createdNote = await notesAPI.create(noteData);
        setNotes(prev => [createdNote, ...prev]);
        setForm({ title: "", section: sections[0]?.id || "engmath", examType: "mse1", description: "", content: "", pages: "", size: "", fileName: "", fileType: "" });
        setSuccess(true); setTimeout(() => setSuccess(false), 3000); setTab("manage");
    } catch (error) {
        alert("Failed to upload note to database: " + error.message);
    }
  }

  async function handleDelete(id) { 
      if (window.confirm("Delete this note permanently?")) {
          try {
              await notesAPI.delete(id);
              setNotes(prev => prev.filter(n => n.id !== id)); 
          } catch(e) {
              alert("Failed to delete note: " + e.message);
          }
      } 
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "110px 40px 60px", position: "relative", zIndex: 10 }}>
      <div className="fadeUp" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>⚡</div>
          <div>
            <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 32, color: "#fff" }}>Admin Dashboard</h1>
            <p style={{ color: "#444", fontSize: 14 }}>Upload notes, manage subjects and control content</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
        {[{ icon: "📚", label: "Total Notes", value: notes.length, color: "#a78bfa" }, { icon: "📖", label: "Subjects", value: sections.length, color: "#06b6d4" }, { icon: "⬇", label: "Downloads", value: "Free", color: "#10b981" }, { icon: "🗓", label: "Last Upload", value: notes.length > 0 ? formatDate([...notes].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date) : "—", color: "#f59e0b" }].map(s => (
          <div key={s.label} style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
            <div style={{ color: "#333", fontSize: 13, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "rgba(13,13,26,0.8)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 28, width: "fit-content" }}>
        {[["upload", "📤 Upload Note"], ["manage", "📋 Manage Notes"], ["subjects", "🗂 Subjects"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "rgba(167,139,250,0.15)" : "transparent", border: tab === t ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: tab === t ? "#a78bfa" : "#555", padding: "8px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{label}</button>
        ))}
      </div>

      {tab === "upload" && (
        <div style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 32, backdropFilter: "blur(10px)" }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", marginBottom: 24 }}>Upload New Note</h2>
          {success && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", color: "#10b981", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 }}>✅ Note uploaded successfully!</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Title *</label><input style={inp} placeholder="e.g. Algorithms – Sorting Techniques" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <label style={lbl}>Subject *</label>
              <select style={inp} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Exam Type *</label>
              <select style={inp} value={form.examType} onChange={e => setForm({ ...form, examType: e.target.value })}>
                {EXAM_TYPES.map(et => <option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Description *</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} placeholder="Brief overview..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div>
            <label style={lbl}>Note File * — .txt .md .pdf .doc .docx</label>
            {!form.fileName ? (
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }} onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "#a78bfa" : "rgba(167,139,250,0.2)"}`, borderRadius: 16, padding: "52px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(5,5,15,0.5)", transition: "all 0.25s", backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📂</div>
                <p style={{ color: "#ccc", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drag & drop your file here</p>
                <p style={{ color: "#333", fontSize: 13, marginBottom: 16 }}>or click to browse</p>
                <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {ACCEPTED.map(ext => <span key={ext} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#555", padding: "3px 12px", borderRadius: 20, fontSize: 12 }}>{ext}</span>)}
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(5,5,15,0.6)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 44, flexShrink: 0 }}>{fileIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.fileName}</div>
                  <div style={{ color: "#555", fontSize: 13, marginTop: 3 }}>{form.size} · {form.fileType?.toUpperCase().replace(".", "")} file</div>
                  {!isBinary ? <div style={{ color: "#10b981", fontSize: 12, marginTop: 5 }}>✓ Text file ready</div> : <div style={{ color: "#f59e0b", fontSize: 12, marginTop: 5 }}>⚠ Binary file — download only</div>}
                </div>
                <button onClick={() => setForm(f => ({ ...f, content: "", fileName: "", fileType: "", size: "", pages: "" }))} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "8px 14px", borderRadius: 8, fontSize: 13, flexShrink: 0 }}>✕</button>
              </div>
            )}
            {fileError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>⚠ {fileError}</p>}
            <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={e => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = ""; }} style={{ display: "none" }} />
          </div>
          <button onClick={handleUpload} style={{ marginTop: 28, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "13px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>📤 Upload Note</button>
        </div>
      )}

      {tab === "manage" && (
        <div style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 32, backdropFilter: "blur(10px)" }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", marginBottom: 24 }}>All Notes ({notes.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notes.map(note => {
              const sec = sections.find(s => s.id === note.section) || { color: "#888", label: "Unknown" };
              const et = EXAM_TYPES.find(e => e.id === note.examType);
              return (
                <div key={note.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(5,5,15,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ width: 44, height: 44, background: `${sec.color}18`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><SubjectIcon sectionId={note.section} color={sec.color} size={28} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title}</div>
                    <div style={{ color: "#333", fontSize: 12, marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{sec.label}</span>
                      {et && <span style={{ background: et.bg, color: et.color, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{et.label}</span>}
                      <span>· {formatDate(note.date)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(note.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", width: 36, height: 36, borderRadius: 8, fontSize: 16, flexShrink: 0 }}>🗑</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "subjects" && <SubjectsManagerTab sections={sections} setSections={setSections} notes={notes} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// STUDENT LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════
function StudentLoginPage({ onSuccess }) {
  const { setStudent, registeredStudents, setRegisteredStudents } = useApp();

  const [tab, setTab] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => { setTimeout(() => emailRef.current?.focus(), 300); }, []);
  useEffect(() => { setError(""); setSuccess(""); setPassword(""); setConfirmPw(""); }, [tab]);

  const BRANCH_COLORS = { CS: "#a78bfa", IT: "#06b6d4", EC: "#f59e0b", EE: "#f97316", ME: "#10b981", CE: "#3b82f6", EN: "#ec4899", CH: "#14b8a6" };

  const pwStrength = password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 10 ? 3 : 4;
  const pwStrengthColor = ["#ef4444", "#f59e0b", "#06b6d4", "#10b981"][pwStrength - 1];
  const pwStrengthLabel = ["Too short", "Weak", "Good", "Strong"][pwStrength - 1];

  const InpStyle = (hasErr) => ({
    width: "100%", background: "rgba(5,5,15,0.7)",
    border: `1px solid ${hasErr ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 12, padding: "12px 14px 12px 40px", color: "#fff", fontSize: 14,
    outline: "none", transition: "border 0.2s", fontFamily: "inherit", boxSizing: "border-box"
  });

  // ── Login ──
  async function handleLogin() {
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Please enter your KIET email."); return; }
    const info = parseKietEmail(email);
    if (!info) { setError("Invalid KIET email — e.g. xyz.2428cs001@kiet.edu"); return; }
    if (!password) { setError("Please enter your password."); return; }
    
    setLoading(true);
    try {
        const studentData = await studentsAPI.login({ email: info.email, password });
        // Use parsed info + backend fields
        const parsed = parseKietEmail(info.email);
        setStudent({ ...parsed, ...studentData, fullName: studentData.fullName || parsed.firstName });
        if (onSuccess) onSuccess();
    } catch (e) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  }

  // ── Sign Up ──
  async function handleSignup() {
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Please enter your KIET email."); return; }
    const info = parseKietEmail(email);
    if (!info) { setError("Invalid KIET email — e.g. xyz.2428cs001@kiet.edu"); return; }
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPw) { setError("Passwords do not match."); return; }
    
    setLoading(true);
    try {
        const payload = { ...info, password, fullName: fullName.trim() };
        const newStudent = await studentsAPI.register(payload);
        const parsed = parseKietEmail(info.email);
        setStudent({ ...parsed, ...newStudent, fullName: newStudent.fullName || parsed.firstName });
        if (onSuccess) onSuccess();
    } catch (e) {
        setError(e.message);
    } finally {
        setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 20px", position: "relative", zIndex: 10 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Logo */}
        <div className="fadeUp" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 62, height: 62, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 32px rgba(124,58,237,0.5)" }}>
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9"/><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6"/><rect x="4" y="6" width="2" height="1.5" rx="0.75" fill="#7c3aed"/><rect x="4" y="9" width="2" height="1.5" rx="0.75" fill="#7c3aed"/></svg>
          </div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 4 }}>Exam<span style={{ color: "#a78bfa" }}>Notes</span> Hub</h1>
          <p style={{ color: "#444", fontSize: 13 }}>KIET Group of Institutions · Student Portal</p>
        </div>

        {/* Card */}
        <div className="fadeUp2" style={{ background: "rgba(13,13,26,0.92)", border: "1px solid rgba(167,139,250,0.14)", borderRadius: 24, backdropFilter: "blur(20px)", boxShadow: "0 32px 80px rgba(0,0,0,0.55)", overflow: "hidden" }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {[["login", "\uD83D\uDD11 Login"], ["signup", "\u2728 Sign Up"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "16px", background: tab === key ? "rgba(167,139,250,0.08)" : "transparent",
                border: "none", borderBottom: tab === key ? "2px solid #a78bfa" : "2px solid transparent",
                color: tab === key ? "#a78bfa" : "#444", fontFamily: "Syne,sans-serif", fontWeight: 700,
                fontSize: 14, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.2px"
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: 32 }}>

            {/* LOGIN TAB */}
            {tab === "login" && (
              <div>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>Welcome back! Enter your KIET email and password to access your notes.</p>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>KIET Email</label>
                  <div style={{ position: "relative" }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="1" y="3" width="14" height="10" rx="2" stroke="#555" strokeWidth="1.2"/><path d="M1 5l7 5 7-5" stroke="#555" strokeWidth="1.2"/></svg>
                    <input ref={emailRef} type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      placeholder="xxx.xxxx@kiet.edu"
                      style={InpStyle(!!error)} />
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#555" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      placeholder="Enter your password"
                      style={{ ...InpStyle(!!error), paddingRight: 52 }} />
                    <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
                  </div>
                </div>

                {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>\u26A0 {error}</div>}

                <button onClick={handleLogin} disabled={loading} className="btn-scale"
                  style={{ width: "100%", background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? <><svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg> Signing in...</> : "\uD83D\uDD11 Login"}
                </button>

                <p style={{ textAlign: "center", marginTop: 18, color: "#444", fontSize: 13 }}>
                  Don't have an account?{" "}
                  <span onClick={() => setTab("signup")} style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 700 }}>Sign Up \u2192</span>
                </p>
              </div>
            )}

            {/* SIGNUP TAB */}
            {tab === "signup" && (
              <div>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>Create your account using your KIET institutional email.</p>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>KIET Email</label>
                  <div style={{ position: "relative" }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="1" y="3" width="14" height="10" rx="2" stroke="#555" strokeWidth="1.2"/><path d="M1 5l7 5 7-5" stroke="#555" strokeWidth="1.2"/></svg>
                    <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                      placeholder="xxxx.xxxx@kiet.edu"
                      style={InpStyle(!!error && error.includes("email"))} />
                  </div>
                  <p style={{ color: "#333", fontSize: 11, marginTop: 6 }}>Format: <code style={{ color: "#666", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 4 }}>name.YYendYYbranch&lt;roll&gt;@kiet.edu</code></p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
                  <div style={{ position: "relative" }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="8" cy="5" r="3" stroke="#555" strokeWidth="1.2"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setError(""); }}
                      placeholder="Your full name"
                      style={InpStyle(!!error && error.includes("name"))} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#555" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                      placeholder="Min. 6 characters"
                      style={{ ...InpStyle(!!error && error.includes("6")), paddingRight: 52 }} />
                    <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwStrength ? pwStrengthColor : "rgba(255,255,255,0.06)", transition: "background 0.2s" }} />)}
                      </div>
                      <span style={{ fontSize: 11, color: pwStrengthColor }}>{pwStrengthLabel}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#555" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <input type={showConfirm ? "text" : "password"} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleSignup()}
                      placeholder="Re-enter your password"
                      style={{ ...InpStyle(!!error && error.includes("match")), paddingRight: 52 }} />
                    <button onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer" }}>{showConfirm ? "Hide" : "Show"}</button>
                  </div>
                  {confirmPw && password && (
                    <p style={{ fontSize: 11, marginTop: 6, color: confirmPw === password ? "#10b981" : "#ef4444" }}>
                      {confirmPw === password ? "\u2713 Passwords match" : "\u2717 Passwords do not match"}
                    </p>
                  )}
                </div>

                {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>\u26A0 {error}</div>}

                <button onClick={handleSignup} disabled={loading} className="btn-scale"
                  style={{ width: "100%", background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? <><svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg> Creating account...</> : "\u2728 Create Account"}
                </button>

                <p style={{ textAlign: "center", marginTop: 18, color: "#444", fontSize: 13 }}>
                  Already have an account?{" "}
                  <span onClick={() => setTab("login")} style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 700 }}>Login \u2192</span>
                </p>
              </div>
            )}

          </div>
        </div>

        <p style={{ textAlign: "center", color: "#222", fontSize: 12, marginTop: 16 }}>Only KIET institutional emails accepted · @kiet.edu</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STUDENT LOGIN MODAL (triggered by navbar button)
// ═══════════════════════════════════════════════════════════════════
function StudentLoginModal() {
  const { setShowStudentLogin } = useApp();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(18px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) setShowStudentLogin(false); }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 500 }}>
        <button onClick={() => setShowStudentLogin(false)}
          style={{ position: "absolute", top: -14, right: -14, zIndex: 10, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", fontSize: 18, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ×
        </button>
        <StudentLoginPage onSuccess={() => setShowStudentLogin(false)} />
      </div>
    </div>
  );
}


function AdminLoginModal() {
  const { setShowLogin, setIsAdmin } = useApp();
  const { navigate } = useRouter();
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  function handleLogin() {
    if (pw === ADMIN_PASSWORD) { setIsAdmin(true); setShowLogin(false); navigate("admin"); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(16px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "rgba(13,13,26,0.95)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 24, padding: 44, width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>🔐</div>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 8 }}>Admin Login</h2>
        <p style={{ color: "#444", fontSize: 14, marginBottom: 28, lineHeight: 1.65 }}>Enter your admin password.<br /><span style={{ color: "#222" }}>(Hint: admin123)</span></p>
        <input ref={inputRef} type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", background: "rgba(5,5,15,0.8)", border: `1px solid ${err ? "#ef4444" : "rgba(167,139,250,0.2)"}`, borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 15, outline: "none", textAlign: "center", letterSpacing: 4, marginBottom: 8, transition: "border 0.2s" }} />
        {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>Incorrect password.</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => setShowLogin(false)} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888", padding: "12px", borderRadius: 10, fontSize: 14 }}>Cancel</button>
          <button onClick={handleLogin} style={{ flex: 1, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700 }}>Login →</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════
function AppInner() {
  const { page } = useRouter();
  const { showLogin, showStudentLogin, student } = useApp();
  const renderPage = () => {
    switch (page.name) {
      case "home": return <HomePage />;
      case "subjects": return <SubjectsPage />;
      case "subjectDetail": return <SubjectDetailPage sectionId={page.params.sectionId} />;
      case "notes": return <NotesPage />;
      case "admin": return <AdminPage />;
      default: return <HomePage />;
    }
  };

  // ── GATE: must be logged in ──
  if (!student) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#05050f" }}>
        <GlobalStyle />
        <ThreeBackground />
        {/* Minimal top bar with Login button */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(5,5,15,0.7)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(167,139,250,0.12)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 62 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9"/><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6"/><rect x="4" y="6" width="2" height="1.5" rx="0.75" fill="#7c3aed"/><rect x="4" y="9" width="2" height="1.5" rx="0.75" fill="#7c3aed"/></svg>
            </div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 19, color: "#fff", letterSpacing: "-0.3px" }}>Exam<span style={{ color: "#a78bfa" }}>Notes</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#444", fontSize: 13 }}>🔒 Login required to access content</span>
          </div>
        </div>
        <StudentLoginPage />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#05050f" }}>
      <GlobalStyle />
      <ThreeBackground />
      <Navbar />
      <main style={{ flex: 1, position: "relative", zIndex: 10 }}>{renderPage()}</main>
      <Footer />
      {showLogin && <AdminLoginModal />}
      {showStudentLogin && <StudentLoginModal />}
    </div>
  );
}

export default function App() {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [sections, setSections] = useState(SECTIONS);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showStudentLogin, setShowStudentLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [student, setStudent] = useState(null); // logged-in student info
  const [registeredStudents, setRegisteredStudents] = useState({}); // email -> {password, fullName}

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const data = await notesAPI.getAll();
        const transformed = data.map(note => ({
          ...note,
          id: note.id || note._id,
          section: note.section || note.subject || note.id || "engmath",
          description: note.description || note.content || "",
          pages: note.pages || 0,
          size: note.size || "N/A",
          uploader: note.author || "Admin",
        }));
        setNotes(transformed);
      } catch (error) {
        console.error("Failed to load notes from backend:", error);
      }
    };

    loadNotes();
  }, []);

  useEffect(() => {
    try {
      const savedStudent = localStorage.getItem("examnotes_student");
      const savedUsers = localStorage.getItem("examnotes_users");
      if (savedStudent) {
        setStudent(JSON.parse(savedStudent));
      }
      if (savedUsers) {
        setRegisteredStudents(JSON.parse(savedUsers));
      }
    } catch (error) {
      console.warn("Could not load saved login state:", error);
    }
  }, []);

  useEffect(() => {
    if (student) {
      localStorage.setItem("examnotes_student", JSON.stringify(student));
    } else {
      localStorage.removeItem("examnotes_student");
    }
  }, [student]);

  useEffect(() => {
    localStorage.setItem("examnotes_users", JSON.stringify(registeredStudents));
  }, [registeredStudents]);

  return (
    <AppCtx.Provider value={{ notes, setNotes, sections, setSections, isAdmin, setIsAdmin, showLogin, setShowLogin, showStudentLogin, setShowStudentLogin, showAdmin, setShowAdmin, student, setStudent, registeredStudents, setRegisteredStudents }}>
      <Router><AppInner /></Router>
    </AppCtx.Provider>
  );
}