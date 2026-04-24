import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import { studentsAPI } from "../../api/client.js";
import { parseKietEmail } from "../../utils/parseKietEmail.js";
import { BRANCH_COLORS } from "../../constants/index.js";
import { getFriendlyError } from "../../utils/errorMessages.js";

/**
 * Student login / signup page (used both as full page and as modal content).
 * Supports OTP-verified signup + JWT login from the backend.
 */
export function StudentLoginPage({ onSuccess }) {
  const { student, setStudent } = useApp();
  const navigate = useNavigate();
  const [tab,        setTab]        = useState("login");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [fullName,   setFullName]   = useState("");
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showPw,     setShowPw]     = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [otp,        setOtp]        = useState("");
  const emailRef = useRef(null);

  useEffect(() => { setTimeout(() => emailRef.current?.focus(), 300); }, []);
  useEffect(() => { setError(""); setSuccess(""); setPassword(""); setConfirmPw(""); setSignupStep(1); setOtp(""); }, [tab]);

  // ── Redirect if already logged in ─────────────────────────────────
  useEffect(() => {
    if (student) {
      if (onSuccess) onSuccess();
      else navigate("/", { replace: true });
    }
  }, [student, onSuccess, navigate]);

  const pwStrength = password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 10 ? 3 : 4;
  const pwStrengthColor = ["#ef4444","#f59e0b","#06b6d4","#10b981"][pwStrength - 1];
  const pwStrengthLabel = ["Too short","Weak","Good","Strong"][pwStrength - 1];

  const InpStyle = (hasErr) => ({
    width: "100%", background: "rgba(5,5,15,0.7)",
    border: `1px solid ${hasErr ? "#ef4444" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 12, padding: "12px 14px 12px 40px", color: "#fff", fontSize: 14,
    outline: "none", transition: "border 0.2s", fontFamily: "inherit", boxSizing: "border-box"
  });

  async function handleLogin() {
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Please enter your KIET email."); return; }
    const info = parseKietEmail(email);
    if (!info) { setError("Invalid KIET email — e.g. xyz.2428cs001@kiet.edu"); return; }
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      const studentData = await studentsAPI.login({ email: info.email, password });
      const parsed = parseKietEmail(info.email);
      setStudent({ ...parsed, ...studentData, fullName: studentData.fullName || parsed.firstName });
      if (onSuccess) onSuccess();
      else navigate("/", { replace: true }); // standalone /login page: go home
    } catch (e) { setError(getFriendlyError(e)); }
    finally { setLoading(false); }
  }

  async function handleSendOtp() {
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Please enter your KIET email."); return; }
    const info = parseKietEmail(email);
    if (!info) { setError("Invalid KIET email — e.g. xyz.2428cs001@kiet.edu"); return; }
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await studentsAPI.sendOtp(info.email);
      setSignupStep(2);
      setSuccess("OTP sent! Please check your email.");
    } catch (e) { setError(getFriendlyError(e)); }
    finally { setLoading(false); }
  }

  async function handleCompleteSignup() {
    setError(""); setSuccess("");
    if (!otp.trim() || otp.length !== 6) { setError("Please enter a valid 6-digit OTP."); return; }
    const info = parseKietEmail(email);
    setLoading(true);
    try {
      const payload = { ...info, password, fullName: fullName.trim(), otp: otp.trim() };
      const newStudent = await studentsAPI.register(payload);
      const parsed = parseKietEmail(info.email);
      setStudent({ ...parsed, ...newStudent, fullName: newStudent.fullName || parsed.firstName });
      if (onSuccess) onSuccess();
      else navigate("/", { replace: true }); // standalone /login page: go home
    } catch (e) { setError(getFriendlyError(e)); }
    finally { setLoading(false); }
  }

  const EMailIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="1" y="3" width="14" height="10" rx="2" stroke="#555" strokeWidth="1.2"/><path d="M1 5l7 5 7-5" stroke="#555" strokeWidth="1.2"/></svg>;
  const LockIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#555" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  const UserIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="8" cy="5" r="3" stroke="#555" strokeWidth="1.2"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>;

  // Don't render the auth form if already logged in (redirect effect will fire)
  if (student) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 20px" }}>
        <p style={{ color: "#a78bfa", fontSize: 15, fontFamily: "Syne,sans-serif" }}>You're already logged in. Redirecting…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 20px", position: "relative", zIndex: 10 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div className="fadeUp" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 62, height: 62, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 32px rgba(124,58,237,0.5)" }}>
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.9"/><rect x="10" y="3" width="6" height="14" rx="1.5" fill="white" opacity="0.6"/><rect x="4" y="6" width="2" height="1.5" rx="0.75" fill="#7c3aed"/><rect x="4" y="9" width="2" height="1.5" rx="0.75" fill="#7c3aed"/></svg>
          </div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 4 }}>Revise<span style={{ color: "#a78bfa" }}>X</span></h1>
          <p style={{ color: "#444", fontSize: 13 }}>KIET Group of Institutions · Student Portal</p>
        </div>

        <div className="fadeUp2" style={{ background: "rgba(13,13,26,0.92)", border: "1px solid rgba(167,139,250,0.14)", borderRadius: 24, backdropFilter: "blur(20px)", boxShadow: "0 32px 80px rgba(0,0,0,0.55)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {[["login","🔑 Login"],["signup","✨ Sign Up"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "16px", background: tab === key ? "rgba(167,139,250,0.08)" : "transparent", border: "none", borderBottom: tab === key ? "2px solid #a78bfa" : "2px solid transparent", color: tab === key ? "#a78bfa" : "#444", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: 32 }}>
            {/* LOGIN */}
            {tab === "login" && (
              <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>Welcome back! Enter your KIET email and password.</p>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>KIET Email</label>
                  <div style={{ position: "relative" }}><EMailIcon /><input ref={emailRef} id="student-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="xxx.xxxx@kiet.edu" style={InpStyle(!!error)} /></div>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                  <div style={{ position: "relative" }}><LockIcon /><input type={showPw ? "text" : "password"} id="student-password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter your password" style={{ ...InpStyle(!!error), paddingRight: 52 }} /><button onClick={() => setShowPw(v => !v)} type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button></div>
                </div>
                {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}
                <button type="submit" disabled={loading} className="btn-scale" style={{ width: "100%", background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? <><svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg> Signing in...</> : "🔑 Login"}
                </button>
                <p style={{ textAlign: "center", marginTop: 18, color: "#444", fontSize: 13 }}>Don't have an account? <span onClick={() => setTab("signup")} style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 700 }}>Sign Up →</span></p>
              </form>
            )}

            {/* SIGNUP STEP 1 */}
            {tab === "signup" && signupStep === 1 && (
              <form onSubmit={e => { e.preventDefault(); handleSendOtp(); }}>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>Create your account using your KIET institutional email.</p>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>KIET Email</label>
                  <div style={{ position: "relative" }}><EMailIcon /><input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="xxxx.xxxx@kiet.edu" style={InpStyle(!!error && error.includes("email"))} /></div>
                  <p style={{ color: "#333", fontSize: 11, marginTop: 6 }}>Format: <code style={{ color: "#666", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 4 }}>name.YYendYYbranch&lt;roll&gt;@kiet.edu</code></p>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
                  <div style={{ position: "relative" }}><UserIcon /><input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setError(""); }} placeholder="Your full name" style={InpStyle(!!error && error.includes("name"))} /></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
                  <div style={{ position: "relative" }}><LockIcon /><input type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Min. 6 characters" style={{ ...InpStyle(!!error && error.includes("6")), paddingRight: 52 }} /><button onClick={() => setShowPw(v => !v)} type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button></div>
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>{[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwStrength ? pwStrengthColor : "rgba(255,255,255,0.06)", transition: "background 0.2s" }} />)}</div>
                      <span style={{ fontSize: 11, color: pwStrengthColor }}>{pwStrengthLabel}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Confirm Password</label>
                  <div style={{ position: "relative" }}><LockIcon /><input type={showConfirm ? "text" : "password"} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleSendOtp()} placeholder="Re-enter your password" style={{ ...InpStyle(!!error && error.includes("match")), paddingRight: 52 }} /><button onClick={() => setShowConfirm(v => !v)} type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", fontSize: 11, cursor: "pointer" }}>{showConfirm ? "Hide" : "Show"}</button></div>
                  {confirmPw && password && <p style={{ fontSize: 11, marginTop: 6, color: confirmPw === password ? "#10b981" : "#ef4444" }}>{confirmPw === password ? "✓ Passwords match" : "✗ Passwords do not match"}</p>}
                </div>
                {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}
                <button type="submit" disabled={loading} className="btn-scale" style={{ width: "100%", background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 4px 20px rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? <><svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg> Processing...</> : "Verify Email →"}
                </button>
                <p style={{ textAlign: "center", marginTop: 18, color: "#444", fontSize: 13 }}>Already have an account? <span onClick={() => setTab("login")} style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 700 }}>Login →</span></p>
              </form>
            )}

            {/* SIGNUP STEP 2 - OTP */}
            {tab === "signup" && signupStep === 2 && (
              <form onSubmit={e => { e.preventDefault(); handleCompleteSignup(); }}>
                <p style={{ color: "#555", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>We sent a 6-digit code to <strong>{email}</strong>. Enter it below.</p>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", color: "#555", fontSize: 11, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.5px" }}>Verification Code</label>
                  <input type="text" maxLength={6} value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }} placeholder="000000" style={{ width: "100%", background: "rgba(13,13,26,0.6)", border: `1px solid ${!!error ? "#ef4444" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "12px", color: "#fff", fontSize: 24, letterSpacing: 8, textAlign: "center", outline: "none" }} />
                </div>
                {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}
                {success && <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#10b981", fontSize: 13 }}>{success}</div>}
                <button type="submit" disabled={loading} className="btn-scale" style={{ width: "100%", background: loading ? "rgba(16,185,129,0.4)" : "linear-gradient(135deg,#10b981,#34d399)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: loading ? "not-allowed" : "pointer", marginBottom: 16 }}>
                  {loading ? <><svg width="17" height="17" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg> Completing...</> : "✨ Complete Registration"}
                </button>
                <p style={{ textAlign: "center", color: "#444", fontSize: 13 }}><span onClick={() => { setSignupStep(1); setOtp(""); setError(""); setSuccess(""); }} style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 700 }}>← Back</span></p>
              </form>
            )}
          </div>
        </div>
        <p style={{ textAlign: "center", color: "#222", fontSize: 12, marginTop: 16 }}>Only KIET institutional emails accepted · @kiet.edu</p>
      </div>
    </div>
  );
}

/** Modal wrapper for StudentLoginPage shown from Navbar. */
export function StudentLoginModal() {
  const { setShowStudentLogin } = useApp();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(18px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) setShowStudentLogin(false); }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 500 }}>
        <button onClick={() => setShowStudentLogin(false)} style={{ position: "absolute", top: -14, right: -14, zIndex: 10, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</button>
        <StudentLoginPage onSuccess={() => setShowStudentLogin(false)} />
      </div>
    </div>
  );
}
