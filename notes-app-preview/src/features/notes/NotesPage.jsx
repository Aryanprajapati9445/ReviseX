import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import { EXAM_TYPES } from "../../constants/index.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";
import NoteCard from "./NoteCard.jsx";

/** Full notes library page with search, subject/exam filters, and sort controls. */
export default function NotesPage() {
  const { notes, sections } = useApp();
  const [search,        setSearch]        = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const [activeExam,    setActiveExam]    = useState(null);
  const [sort,          setSort]          = useState("newest");
  const debouncedSearch = useDebounce(search, 250);

  let filtered = notes.filter(n => {
    const matchSec    = !activeSection  || n.section  === activeSection;
    const matchExam   = !activeExam     || n.examType === activeExam;
    const matchSearch = !debouncedSearch || n.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || (n.description || "").toLowerCase().includes(debouncedSearch.toLowerCase());
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

      {/* Search + sort */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input id="notes-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search notes..." style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", flex: 1, minWidth: 220, backdropFilter: "blur(10px)" }} />
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 16px", color: "#aaa", fontSize: 14, outline: "none" }}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="az">A → Z</option>
        </select>
      </div>

      {/* Subject filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => setActiveSection(null)} style={{ background: activeSection === null ? "rgba(167,139,250,0.15)" : "rgba(13,13,26,0.6)", border: `1px solid ${activeSection === null ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.06)"}`, color: activeSection === null ? "#a78bfa" : "#444", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>All Subjects</button>
        {sections.map(sec => (
          <button key={sec.id} onClick={() => setActiveSection(activeSection === sec.id ? null : sec.id)}
            style={{ background: activeSection === sec.id ? `${sec.color}18` : "rgba(13,13,26,0.6)", border: `1px solid ${activeSection === sec.id ? sec.color + "40" : "rgba(255,255,255,0.06)"}`, color: activeSection === sec.id ? sec.color : "#444", padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex" }}><SubjectIcon sectionId={sec.id} color={activeSection === sec.id ? sec.color : "#555"} size={14} /></span>{sec.label}
          </button>
        ))}
      </div>

      {/* Exam type filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        <button onClick={() => setActiveExam(null)} style={{ background: activeExam === null ? "rgba(167,139,250,0.12)" : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === null ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}`, color: activeExam === null ? "#a78bfa" : "#444", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>All Exams</button>
        {EXAM_TYPES.map(et => (
          <button key={et.id} onClick={() => setActiveExam(activeExam === et.id ? null : et.id)}
            style={{ background: activeExam === et.id ? et.bg : "rgba(13,13,26,0.6)", border: `1px solid ${activeExam === et.id ? et.color + "50" : "rgba(255,255,255,0.06)"}`, color: activeExam === et.id ? et.color : "#444", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {et.icon} {et.label}
          </button>
        ))}
      </div>

      <div style={{ color: "#333", fontSize: 13, marginBottom: 20 }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>

      {filtered.length === 0
        ? <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}><div style={{ fontSize: 52, marginBottom: 12 }}>📭</div><p>No notes match your filters.</p></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
            {filtered.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
      }
    </div>
  );
}
