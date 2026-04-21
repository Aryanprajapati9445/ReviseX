import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import { EXAM_TYPES, BRANCH_COLORS } from "../../constants/index.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";
import NoteCard from "../notes/NoteCard.jsx";

/** Landing page — hero, exam type bands, subjects grid, recent notes, CTA. */
export default function HomePage() {
  const navigate = useNavigate();
  const { notes, sections, student } = useApp();
  const branchColor = student ? (BRANCH_COLORS[student.branch] || "#a78bfa") : "#a78bfa";
  const recentNotes = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      {/* Student welcome banner */}
      {student && (
        <div style={{ background: `linear-gradient(135deg,${branchColor}12,rgba(13,13,26,0.9))`, borderBottom: `1px solid ${branchColor}20`, padding: "12px 40px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${branchColor}cc,${branchColor})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>{student.firstName?.charAt(0)}</div>
          <div><span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Welcome back, {student.firstName}!</span><span style={{ color: "#444", fontSize: 13, marginLeft: 10 }}>{student.branchFull} · Batch {student.batch} · Roll {student.roll}</span></div>
          <span style={{ background: `${branchColor}15`, color: branchColor, border: `1px solid ${branchColor}30`, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginLeft: "auto" }}>KIET Student</span>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "140px 40px 100px", textAlign: "center" }}>
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
            <button className="btn-scale" onClick={() => navigate("/notes")} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "15px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 8px 32px rgba(124,58,237,0.45)" }}>Browse All Notes →</button>
            <button className="btn-scale" onClick={() => navigate("/subjects")} style={{ background: "rgba(255,255,255,0.04)", color: "#aaa", border: "1px solid rgba(255,255,255,0.1)", padding: "15px 36px", borderRadius: 12, fontSize: 16 }}>Explore Subjects</button>
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
              <div key={et.id} className="card-hover" onClick={() => navigate("/notes")} style={{ background: et.bg, border: `1px solid ${et.color}30`, borderRadius: 18, padding: "22px 24px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
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
          <button onClick={() => navigate("/subjects")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#777", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>View All →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
          {sections.slice(0, 8).map(sec => (
            <div key={sec.id} className="card-hover" onClick={() => navigate(`/subjects/${sec.id}`)} style={{ background: "rgba(13,13,26,0.8)", border: `1px solid ${sec.color}18`, borderRadius: 16, padding: "20px 14px", cursor: "pointer", textAlign: "center", backdropFilter: "blur(10px)" }}>
              <div style={{ width: 52, height: 52, background: `${sec.color}15`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><SubjectIcon sectionId={sec.id} color={sec.color} size={34} /></div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 12, color: "#ccc", lineHeight: 1.3 }}>{sec.label}</div>
              <div style={{ color: sec.color, fontSize: 11, marginTop: 4, fontWeight: 600 }}>{notes.filter(n => n.section === sec.id).length} notes</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <section style={{ padding: "0 40px 80px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
            <div><div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Latest</div><h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 30, color: "#fff" }}>Recent Notes</h2></div>
            <button onClick={() => navigate("/notes")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#777", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>See All →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
            {recentNotes.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ padding: "0 40px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.25),rgba(167,139,250,0.08))", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 24, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden", backdropFilter: "blur(20px)" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, background: "radial-gradient(circle,rgba(167,139,250,0.15),transparent)", pointerEvents: "none" }} />
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 36, color: "#fff", marginBottom: 14, position: "relative" }}>Ready to ace your exams?</h2>
          <p style={{ color: "#555", fontSize: 16, marginBottom: 32, position: "relative" }}>Download free notes for MSE 1, MSE 2 and End Semester exams.</p>
          <button className="btn-scale" onClick={() => navigate("/notes")} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "15px 40px", borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: "Syne,sans-serif", boxShadow: "0 8px 32px rgba(124,58,237,0.45)" }}>Start Downloading →</button>
        </div>
      </section>
    </div>
  );
}
