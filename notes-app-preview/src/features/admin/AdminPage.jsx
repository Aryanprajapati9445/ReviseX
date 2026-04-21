import { useState, useRef } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { notesAPI, uploadAPI } from "../../api/client.js";
import { useToast } from "../../components/Toast.jsx";
import { getFriendlyError } from "../../utils/errorMessages.js";
import { EXAM_TYPES, ACCEPTED_EXT } from "../../constants/index.js";
import { getFileIcon } from "../../utils/fileHelpers.js";
import { formatDate } from "../../utils/formatDate.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";
import SubjectsManagerTab from "./SubjectsManagerTab.jsx";

/** Protected admin dashboard — upload notes, manage notes, manage subjects. */
export default function AdminPage() {
  const { notes, setNotes, invalidateNotes, sections, setSections } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const EMPTY_FORM = { title: "", section: sections[0]?.id || "engmath", examType: "mse1", description: "", pages: "", fileKey: "", fileUrl: "", fileName: "", fileType: "", mimeType: "", size: "" };
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [tab,            setTab]            = useState("upload");
  const [dragOver,       setDragOver]       = useState(false);
  const [fileError,      setFileError]      = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading,    setIsUploading]    = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const fileInputRef = useRef(null);

  const inp = { background: "#030308", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", fontFamily: "inherit" };
  const lbl = { display: "block", color: "#444", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
  const fileIcon = getFileIcon(form.fileType);

  async function handleFileSelect(file) {
    setFileError("");
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) { setFileError(`Unsupported type. Accepted: ${ACCEPTED_EXT.join(" ")}`); return; }
    const autoTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setIsUploading(true); setUploadProgress(0);
    try {
      const result = await uploadAPI.uploadFile(file, pct => setUploadProgress(pct));
      setForm(f => ({ ...f, fileKey: result.fileKey, fileUrl: result.fileUrl, fileName: result.fileName, fileType: result.fileType, mimeType: result.mimeType, size: result.size, title: f.title || autoTitle }));
    } catch (err) { setFileError("Upload failed: " + err.message); }
    finally { setIsUploading(false); setUploadProgress(100); }
  }

  async function handleUpload() {
    if (!form.title)       { showError("Please enter a title."); return; }
    if (!form.description) { showError("Please enter a description."); return; }
    if (!form.fileKey)     { showError("Please wait for the S3 upload to complete."); return; }
    setIsSaving(true);
    try {
      const created = await notesAPI.create({
        title: form.title, section: form.section, examType: form.examType,
        description: form.description, fileKey: form.fileKey, fileUrl: form.fileUrl,
        fileName: form.fileName, fileType: form.fileType, mimeType: form.mimeType,
        pages: parseInt(form.pages) || 0, size: form.size || "—", uploader: "Admin",
      });
      setNotes(prev => [created, ...prev]);
      invalidateNotes();
      setForm({ ...EMPTY_FORM, section: form.section });
      setUploadProgress(0);
      showSuccess("Note uploaded successfully!");
      setTab("manage");
    } catch (err) { showError(getFriendlyError(err)); }
    finally { setIsSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this note permanently?")) return;
    try {
      await notesAPI.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      invalidateNotes();
      showSuccess("Note deleted.");
    } catch (e) { showError(getFriendlyError(e)); }
  }

  const Spinner = () => <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "110px 40px 60px", position: "relative", zIndex: 10 }}>
      {/* Header */}
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
        {[["upload","📤 Upload Note"],["manage","📋 Manage Notes"],["subjects","🗂 Subjects"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "rgba(167,139,250,0.15)" : "transparent", border: tab === t ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: tab === t ? "#a78bfa" : "#555", padding: "8px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{label}</button>
        ))}
      </div>

      {/* Upload Tab */}
      {tab === "upload" && (
        <div style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 32, backdropFilter: "blur(10px)" }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", marginBottom: 24 }}>Upload New Note</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Title *</label><input id="note-title" style={inp} placeholder="e.g. Algorithms – Sorting Techniques" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label style={lbl}>Subject *</label>
              <select style={inp} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Exam Type *</label>
              <select style={inp} value={form.examType} onChange={e => setForm({ ...form, examType: e.target.value })}>
                {EXAM_TYPES.map(et => <option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Description *</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} placeholder="Brief overview..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>

          <label style={lbl}>File * — PDF, DOC, Image, Video, Audio (max 100 MB)</label>
          {!form.fileKey && !isUploading && (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? "#a78bfa" : "rgba(167,139,250,0.2)"}`, borderRadius: 16, padding: "52px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(5,5,15,0.5)", transition: "all 0.25s" }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>☁️</div>
              <p style={{ color: "#ccc", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drag & drop your file here</p>
              <p style={{ color: "#333", fontSize: 13, marginBottom: 16 }}>or click to browse — uploads directly to AWS S3</p>
              <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {ACCEPTED_EXT.map(ext => <span key={ext} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#444", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>{ext}</span>)}
              </div>
            </div>
          )}
          {isUploading && (
            <div style={{ background: "rgba(5,5,15,0.7)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 16, padding: "32px 28px", textAlign: "center" }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>☁️</div>
              <p style={{ color: "#ccc", fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Uploading to AWS S3…</p>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${uploadProgress}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: 8, transition: "width 0.3s ease" }} />
              </div>
              <p style={{ color: "#a78bfa", fontSize: 14, fontWeight: 700 }}>{uploadProgress}%</p>
            </div>
          )}
          {form.fileKey && !isUploading && (
            <div style={{ background: "rgba(5,5,15,0.6)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 44, flexShrink: 0 }}>{fileIcon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.fileName}</div>
                <div style={{ color: "#555", fontSize: 13, marginTop: 3 }}>{form.size} · {form.fileType?.toUpperCase().replace(".", "")} file</div>
                <div style={{ color: "#10b981", fontSize: 12, marginTop: 5 }}>✓ Uploaded to AWS S3</div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, fileKey: "", fileUrl: "", fileName: "", fileType: "", mimeType: "", size: "" }))} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "8px 14px", borderRadius: 8, fontSize: 13, flexShrink: 0 }}>✕ Remove</button>
            </div>
          )}
          {fileError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10 }}>⚠ {fileError}</p>}
          <input ref={fileInputRef} type="file" accept={ACCEPTED_EXT.join(",")} onChange={e => { const f = e.target.files[0]; if (f) handleFileSelect(f); e.target.value = ""; }} style={{ display: "none" }} />

          <button onClick={handleUpload} disabled={isSaving || isUploading || !form.fileKey}
            style={{ marginTop: 28, background: (isSaving || isUploading || !form.fileKey) ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "13px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "Syne,sans-serif", cursor: (isSaving || isUploading || !form.fileKey) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            {isSaving ? <><Spinner /> Saving…</> : "📤 Save Note"}
          </button>
        </div>
      )}

      {/* Manage Tab */}
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
