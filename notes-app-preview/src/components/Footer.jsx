import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

/** Site-wide footer with navigation links and subject list. */
export default function Footer() {
  const navigate = useNavigate();
  const { sections } = useApp();
  return (
    <footer style={{ background: "rgba(5,5,15,0.98)", borderTop: "1px solid rgba(167,139,250,0.1)", padding: "52px 40px 28px", position: "relative", zIndex: 10 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9"/><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6"/></svg>
              </div>
              <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>ReviseX</span>
            </div>
            <p style={{ color: "#333", fontSize: 14, lineHeight: 1.85, maxWidth: 280 }}>Free, high-quality engineering exam notes. Study smarter, score higher.</p>
          </div>
          <div>
            <div style={{ color: "#444", fontWeight: 700, fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px" }}>Navigate</div>
            {[["Home", "/"], ["Subjects", "/subjects"], ["Notes", "/notes"]].map(([label, path]) => (
              <div key={path} onClick={() => navigate(path)} style={{ color: "#333", fontSize: 14, marginBottom: 10, cursor: "pointer", textTransform: "capitalize", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#a78bfa"}
                onMouseLeave={e => e.target.style.color = "#333"}>{label}</div>
            ))}
          </div>
          <div>
            <div style={{ color: "#444", fontWeight: 700, fontSize: 11, marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px" }}>Subjects</div>
            {sections.slice(0, 6).map(s => <div key={s.id} style={{ color: "#333", fontSize: 13, marginBottom: 8 }}>{s.label}</div>)}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 22, display: "flex", justifyContent: "space-between", color: "#222", fontSize: 13, flexWrap: "wrap", gap: 8 }}>
          <span>© 2026 ReviseX. All rights reserved.</span>
          <span>Built for KIET Engineering Students 🎓</span>
        </div>
      </div>
    </footer>
  );
}
