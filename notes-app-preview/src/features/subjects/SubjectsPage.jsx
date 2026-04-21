import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import { EXAM_TYPES } from "../../constants/index.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";

/** Grid of all subjects with note counts and exam type breakdowns. */
export default function SubjectsPage() {
  const navigate = useNavigate();
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
            <div key={sec.id} className="card-hover" onClick={() => navigate(`/subjects/${sec.id}`)}
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
