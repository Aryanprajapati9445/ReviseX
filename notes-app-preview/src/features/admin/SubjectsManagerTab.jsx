import { useState } from "react";
import { subjectsAPI } from "../../api/client.js";
import { useToast } from "../../components/Toast.jsx";
import { getFriendlyError } from "../../utils/errorMessages.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";

const COLOR_PRESETS = ["#f59e0b","#06b6d4","#8b5cf6","#10b981","#3b82f6","#f97316","#ec4899","#ef4444","#a78bfa","#14b8a6","#fb923c","#22d3ee","#84cc16","#e879f9","#f43f5e"];

/** Admin tab for creating, editing, and deleting subjects. */
export default function SubjectsManagerTab({ sections, setSections, notes }) {
  const { success: showSuccess, error: showError } = useToast();
  const [newSub,  setNewSub]  = useState({ label: "", color: "#a78bfa" });
  const [editId,  setEditId]  = useState(null);
  const [editData,setEditData]= useState({});
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const inp = { background: "#030308", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", fontFamily: "inherit" };
  const lbl = { display: "block", color: "#444", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };

  async function handleAdd() {
    if (!newSub.label.trim()) { setError("Subject name is required."); return; }
    setSaving(true); setError("");
    try {
      const created = await subjectsAPI.create({ name: newSub.label.trim(), description: "", color: newSub.color });
      setSections(prev => [...prev, { id: created.id, label: created.name, color: created.color }]);
      setNewSub({ label: "", color: "#a78bfa" });
      showSuccess("Subject added!");
    } catch (e) {
      setError(getFriendlyError(e));
    } finally { setSaving(false); }
  }

  async function handleDelete(sec) {
    const count = notes.filter(n => n.section === sec.id).length;
    if (count > 0 && !window.confirm(`This subject has ${count} note(s). Delete anyway?`)) return;
    try {
      await subjectsAPI.delete(sec.id);
      setSections(prev => prev.filter(s => s.id !== sec.id));
      showSuccess(`"${sec.label}" deleted.`);
    } catch (e) { showError(getFriendlyError(e)); }
  }

  async function saveEdit(sec) {
    if (!editData.label.trim()) return;
    setSaving(true);
    try {
      const updated = await subjectsAPI.update(sec.id, { name: editData.label.trim(), color: editData.color });
      setSections(prev => prev.map(s => s.id === sec.id ? { ...s, label: updated.name, color: updated.color } : s));
      setEditId(null);
      showSuccess("Subject updated!");
    } catch (e) { showError(getFriendlyError(e)); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {/* Add form */}
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
          <div style={{ width: 46, height: 46, background: `${newSub.color}18`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><SubjectIcon sectionId="custom" color={newSub.color} size={30} /></div>
          <div><div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>{newSub.label || "Subject Name"}</div><div style={{ color: newSub.color, fontSize: 12, marginTop: 2 }}>Preview</div></div>
        </div>
        <button onClick={handleAdd} disabled={saving} style={{ background: saving ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", width: "100%", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "➕ Add Subject"}
        </button>
      </div>

      {/* Subject list */}
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
                    <button onClick={() => saveEdit(sec)} disabled={saving} style={{ flex: 1, background: saving ? "rgba(16,185,129,0.4)" : "#10b981", border: "none", color: "#fff", padding: "7px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "..." : "✓ Save"}</button>
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
                    <button onClick={() => { setEditId(sec.id); setEditData({ label: sec.label, color: sec.color }); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#aaa", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>✏</button>
                    <button onClick={() => handleDelete(sec)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>🗑</button>
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
