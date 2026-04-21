import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import { EXAM_TYPES } from "../../constants/index.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";
import NoteCard from "../notes/NoteCard.jsx";

/** Individual subject page filtered by subject ID from URL params. */
export default function SubjectDetailPage() {
  const { id: sectionId } = useParams();
  const navigate = useNavigate();
  const { notes, sections } = useApp();
  const sec = sections.find(s => s.id === sectionId);
  const [search,     setSearch]     = useState("");
  const [activeExam, setActiveExam] = useState(null);
  const debouncedSearch = useDebounce(search, 250);

  if (!sec) return (
    <div style={{ textAlign: "center", padding: "160px 40px", color: "#555" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
      <p style={{ marginBottom: 20 }}>Subject not found.</p>
      <button onClick={() => navigate("/subjects")} style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", padding: "11px 24px", borderRadius: 10, fontWeight: 700 }}>← Back to Subjects</button>
    </div>
  );

  const sectionNotes = notes.filter(n => n.section === sectionId);
  const filtered = sectionNotes.filter(n => {
    const matchSearch = !debouncedSearch || n.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchExam   = !activeExam || n.examType === activeExam;
    return matchSearch && matchExam;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "110px 40px 60px", position: "relative", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, color: "#333", fontSize: 13 }}>
        <span onClick={() => navigate("/subjects")} style={{ cursor: "pointer", color: "#a78bfa" }}>Subjects</span>
        <span>›</span><span style={{ color: "#666" }}>{sec.label}</span>
      </div>
      <div className="fadeUp" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36, flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, background: `${sec.color}18`, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${sec.color}30`, flexShrink: 0 }}>
          <SubjectIcon sectionId={sec.id} color={sec.color} size={48} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 34, color: "#fff", marginBottom: 4 }}>{sec.label}</h1>
          <p style={{ color: "#444", fontSize: 14 }}>{sectionNotes.length} note{sectionNotes.length !== 1 ? "s" : ""} available</p>
        </div>
        <input id="subject-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search notes..." style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", width: 240, backdropFilter: "blur(10px)" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        <button onClick={() => setActiveExam(null)} style={{ background: activeExam === null ? "rgba(167,139,250,0.15)" : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === null ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.07)"}`, color: activeExam === null ? "#a78bfa" : "#555", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>All Exams</button>
        {EXAM_TYPES.map(et => (
          <button key={et.id} onClick={() => setActiveExam(activeExam === et.id ? null : et.id)} style={{ background: activeExam === et.id ? et.bg : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === et.id ? et.color + "50" : "rgba(255,255,255,0.07)"}`, color: activeExam === et.id ? et.color : "#555", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{et.icon} {et.label}</button>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}><div style={{ fontSize: 52, marginBottom: 12 }}>📭</div><p>No notes found.</p></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
            {filtered.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
      }
    </div>
  );
}
