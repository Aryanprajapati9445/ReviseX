import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import { adminAPI } from "../../api/client.js";
import { getFriendlyError } from "../../utils/errorMessages.js";

/** Admin login modal — verifies password server-side, stores token in sessionStorage. */
export default function AdminLoginModal() {
  const { setShowLogin, setIsAdmin } = useApp();
  const navigate = useNavigate();
  const [pw,      setPw]      = useState("");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  async function handleLogin() {
    if (!pw) return;
    setLoading(true); setErr("");
    try {
      await adminAPI.login(pw);
      setIsAdmin(true);
      setShowLogin(false);
      navigate("/admin");
    } catch (e) {
      setErr(getFriendlyError(e));
      setTimeout(() => setErr(""), 3000);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(16px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "rgba(13,13,26,0.95)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 24, padding: 44, width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>🔐</div>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 8 }}>Admin Login</h2>
        <p style={{ color: "#444", fontSize: 14, marginBottom: 28, lineHeight: 1.65 }}>Enter your admin password.</p>
        <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
          <input ref={inputRef} id="admin-password" type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)}
            style={{ width: "100%", background: "rgba(5,5,15,0.8)", border: `1px solid ${err ? "#ef4444" : "rgba(167,139,250,0.2)"}`, borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 15, outline: "none", textAlign: "center", letterSpacing: 4, marginBottom: 8, transition: "border 0.2s" }} />
          {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" onClick={() => setShowLogin(false)} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888", padding: "12px", borderRadius: 10, fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Checking..." : "Login →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
