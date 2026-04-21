import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { BRANCH_COLORS } from "../constants/index.js";

/** Top navigation bar with scroll-aware glass effect and student/admin session indicators. */
export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isAdmin, setShowLogin, setIsAdmin, student, setStudent, setShowStudentLogin } = useApp();
  const branchColor = student ? (BRANCH_COLORS[student.branch] || "#a78bfa") : "#a78bfa";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navItems = [
    { label: "Home",     path: "/"         },
    { label: "Subjects", path: "/subjects"  },
    { label: "Notes",    path: "/notes"     },
  ];
  const active = (path) => location.pathname === path;

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: scrolled ? "rgba(5,5,15,0.95)" : "rgba(5,5,15,0.4)", backdropFilter: "blur(20px)", borderBottom: scrolled ? "1px solid rgba(167,139,250,0.15)" : "1px solid transparent", transition: "all 0.35s", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>
      {/* Logo */}
      <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9"/><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6"/><rect x="4" y="6" width="2" height="1.5" rx="0.75" fill="#7c3aed"/><rect x="4" y="9" width="2" height="1.5" rx="0.75" fill="#7c3aed"/></svg>
        </div>
        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.3px" }}>Revise<span style={{ color: "#a78bfa" }}>X</span></span>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {navItems.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ background: active(item.path) ? "rgba(167,139,250,0.15)" : "transparent", border: active(item.path) ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: active(item.path) ? "#a78bfa" : "#777", padding: "7px 18px", borderRadius: 10, fontSize: 14, fontWeight: active(item.path) ? 600 : 400, transition: "all 0.2s" }}>
            {item.label}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => navigate("/admin")}
            style={{ background: active("/admin") ? "rgba(167,139,250,0.15)" : "transparent", border: active("/admin") ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: active("/admin") ? "#a78bfa" : "#777", padding: "7px 18px", borderRadius: 10, fontSize: 14, fontWeight: active("/admin") ? 600 : 400, transition: "all 0.2s" }}>
            Admin
          </button>
        )}
      </div>

      {/* Right side — student badge + auth buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            <button onClick={() => { setIsAdmin(false); sessionStorage.removeItem("admin_token"); navigate("/"); }}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", padding: "7px 16px", borderRadius: 8, fontSize: 13 }}>
              Logout
            </button>
          </>
        ) : (
          <button className="btn-scale" onClick={() => setShowLogin(true)}
            style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
            Admin Login
          </button>
        )}
        {student && (
          <button onClick={() => setStudent(null)}
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
