import { useState, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { notesAPI, uploadAPI } from "../../api/client.js";
import { useToast } from "../../components/Toast.jsx";
import { getFriendlyError } from "../../utils/errorMessages.js";
import { EXAM_TYPES, ACCEPTED_EXT } from "../../constants/index.js";
import { getFileIcon } from "../../utils/fileHelpers.js";
import { formatDate } from "../../utils/formatDate.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";
import SubjectsManagerTab from "./SubjectsManagerTab.jsx";

const inp = { background: "#030308", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit" };
const lbl = { display: "block", color: "#444", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" };
const Spinner = () => <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeDasharray="20 24"/></svg>;

/** Returns a fresh queue item for a given File object */
function makeItem(file, defaults) {
  return {
    _id:      crypto.randomUUID(),
    file,
    title:    file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    description: "",
    section:  defaults.section,
    examType: defaults.examType,
    pages:    "",
    // S3 upload state
    status:   "pending",   // pending | uploading | done | error | saved
    progress: 0,
    error:    "",
    // S3 result
    fileKey: "", fileUrl: "", fileName: "", fileType: "", mimeType: "", size: "",
  };
}

/** Protected admin dashboard — upload notes, manage notes, manage subjects. */
export default function AdminPage() {
  const { notes, setNotes, invalidateNotes, sections, setSections, invalidateSubjects } = useApp();
  const { success: showSuccess, error: showError } = useToast();

  const [tab,      setTab]      = useState("upload");
  const [dragOver, setDragOver] = useState(false);
  const [queue,    setQueue]    = useState([]);       // array of queue items
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Global defaults applied to every newly added file
  const [defaults, setDefaults] = useState({
    section:  sections[0]?.id || "engmath",
    examType: "mse1",
  });

  const fileInputRef = useRef(null);

  // ── helpers ───────────────────────────────────────────────────────────
  const updateItem = useCallback((id, patch) =>
    setQueue(q => q.map(it => it._id === id ? { ...it, ...patch } : it)), []);

  const removeItem = useCallback((id) =>
    setQueue(q => q.filter(it => it._id !== id)), []);

  // ── add files to queue ────────────────────────────────────────────────
  function addFiles(files) {
    const valid = [];
    for (const file of files) {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!ACCEPTED_EXT.includes(ext)) {
        showError(`"${file.name}" — unsupported type, skipped.`);
        continue;
      }
      valid.push(makeItem(file, defaults));
    }
    if (valid.length) setQueue(q => [...q, ...valid]);
  }

  // ── upload one item to S3 ─────────────────────────────────────────────
  async function uploadItem(item) {
    updateItem(item._id, { status: "uploading", progress: 0, error: "" });
    try {
      const result = await uploadAPI.uploadFile(item.file, pct =>
        updateItem(item._id, { progress: pct })
      );
      updateItem(item._id, {
        status:   "done",
        progress: 100,
        fileKey:  result.fileKey,
        fileUrl:  result.fileUrl,
        fileName: result.fileName,
        fileType: result.fileType,
        mimeType: result.mimeType,
        size:     result.size,
      });
    } catch (err) {
      updateItem(item._id, { status: "error", error: err.message });
    }
  }

  // ── upload ALL pending items (3 at a time) ────────────────────────────
  async function uploadAll() {
    const pending = queue.filter(it => it.status === "pending");
    if (!pending.length) return;

    // Upload in batches of 3 to avoid overwhelming the browser/S3
    for (let i = 0; i < pending.length; i += 3) {
      await Promise.all(pending.slice(i, i + 3).map(uploadItem));
    }
  }

  // ── save one completed item to DB ─────────────────────────────────────
  async function saveItem(item) {
    if (!item.title.trim()) { showError(`"${item.fileName || item.title}" — title is required.`); return false; }
    try {
      const created = await notesAPI.create({
        title: item.title, section: item.section, examType: item.examType,
        description: item.description, fileKey: item.fileKey, fileUrl: item.fileUrl,
        fileName: item.fileName, fileType: item.fileType, mimeType: item.mimeType,
        pages: parseInt(item.pages) || 0, size: item.size || "—", uploader: "Admin",
      });
      setNotes(prev => [created, ...prev]);
      updateItem(item._id, { status: "saved" });
      return true;
    } catch (err) {
      updateItem(item._id, { status: "error", error: getFriendlyError(err) });
      return false;
    }
  }

  // ── save ALL done items to DB ─────────────────────────────────────────
  async function saveAll() {
    const done = queue.filter(it => it.status === "done");
    if (!done.length) { showError("No files ready to save. Upload them to S3 first."); return; }

    // Validate titles before saving
    for (const item of done) {
      if (!item.title.trim()) {
        showError(`Fill in the title for all notes before saving.`);
        return;
      }
    }

    setIsSavingAll(true);
    let saved = 0;
    for (const item of done) {
      const ok = await saveItem(item);
      if (ok) saved++;
    }
    invalidateNotes();
    setIsSavingAll(false);
    if (saved) {
      showSuccess(`${saved} note${saved > 1 ? "s" : ""} saved successfully!`);
      // Remove saved items from queue
      setQueue(q => q.filter(it => it.status !== "saved"));
      if (queue.filter(it => it.status !== "saved").length === 0) setTab("manage");
    }
  }

  // ── delete note ───────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("Delete this note permanently?")) return;
    try {
      await notesAPI.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      invalidateNotes();
      showSuccess("Note deleted.");
    } catch (e) { showError(getFriendlyError(e)); }
  }

  // ── computed ──────────────────────────────────────────────────────────
  const pendingCount   = queue.filter(it => it.status === "pending").length;
  const uploadingCount = queue.filter(it => it.status === "uploading").length;
  const doneCount      = queue.filter(it => it.status === "done").length;
  const hasQueue       = queue.length > 0;

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
        {[
          { icon: "📚", label: "Total Notes",  value: notes.length,      color: "#a78bfa" },
          { icon: "📖", label: "Subjects",     value: sections.length,   color: "#06b6d4" },
          { icon: "⬇",  label: "Downloads",    value: "Free",            color: "#10b981" },
          { icon: "🗓", label: "Last Upload",  value: notes.length > 0 ? formatDate([...notes].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date) : "—", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
            <div style={{ color: "#333", fontSize: 13, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "rgba(13,13,26,0.8)", borderRadius: 12, padding: 4, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 28, width: "fit-content" }}>
        {[["upload", "📤 Upload Notes"], ["manage", "📋 Manage Notes"], ["subjects", "🗂 Subjects"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "rgba(167,139,250,0.15)" : "transparent", border: tab === t ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent", color: tab === t ? "#a78bfa" : "#555", padding: "8px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>{label}</button>
        ))}
      </div>

      {/* ── UPLOAD TAB ── */}
      {tab === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Global defaults row */}
          <div style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 24px", backdropFilter: "blur(10px)" }}>
            <p style={{ color: "#555", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>Default settings for all new files</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>Subject</label>
                <select style={inp} value={defaults.section} onChange={e => setDefaults(d => ({ ...d, section: e.target.value }))}>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Exam Type</label>
                <select style={inp} value={defaults.examType} onChange={e => setDefaults(d => ({ ...d, examType: e.target.value }))}>
                  {EXAM_TYPES.map(et => <option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles([...e.dataTransfer.files]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "#a78bfa" : "rgba(167,139,250,0.2)"}`, borderRadius: 16, padding: "44px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(5,5,15,0.5)", transition: "all 0.25s" }}
          >
            <div style={{ fontSize: 48, marginBottom: 10 }}>☁️</div>
            <p style={{ color: "#ccc", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drag &amp; drop multiple files here</p>
            <p style={{ color: "#333", fontSize: 13, marginBottom: 16 }}>or click to browse — uploads directly to AWS S3</p>
            <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {ACCEPTED_EXT.map(ext => <span key={ext} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#444", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>{ext}</span>)}
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXT.join(",")} onChange={e => { addFiles([...e.target.files]); e.target.value = ""; }} style={{ display: "none" }} />

          {/* Queue */}
          {hasQueue && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Queue header + bulk actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <p style={{ color: "#555", fontSize: 13, fontWeight: 700 }}>
                  {queue.length} file{queue.length > 1 ? "s" : ""} —{" "}
                  <span style={{ color: "#a78bfa" }}>{pendingCount} pending</span>
                  {uploadingCount > 0 && <span style={{ color: "#f59e0b" }}>, {uploadingCount} uploading</span>}
                  {doneCount > 0 && <span style={{ color: "#10b981" }}>, {doneCount} ready to save</span>}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {pendingCount > 0 && (
                    <button onClick={uploadAll} disabled={uploadingCount > 0}
                      style={{ background: uploadingCount > 0 ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: uploadingCount > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      {uploadingCount > 0 ? <><Spinner /> Uploading…</> : `⬆ Upload All to S3 (${pendingCount})`}
                    </button>
                  )}
                  {doneCount > 0 && (
                    <button onClick={saveAll} disabled={isSavingAll}
                      style={{ background: isSavingAll ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isSavingAll ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      {isSavingAll ? <><Spinner /> Saving…</> : `💾 Save All Notes (${doneCount})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Individual file cards */}
              {queue.map(item => {
                const icon = getFileIcon(item.fileType || ("." + item.file.name.split(".").pop().toLowerCase()));
                const statusColor = { pending: "#555", uploading: "#f59e0b", done: "#10b981", error: "#ef4444", saved: "#a78bfa" }[item.status];
                const statusLabel = { pending: "Pending", uploading: `${item.progress}%`, done: "✓ Ready to save", error: "✕ Error", saved: "✓ Saved" }[item.status];

                return (
                  <div key={item._id} style={{ background: "rgba(13,13,26,0.85)", border: `1px solid ${item.status === "error" ? "rgba(239,68,68,0.3)" : item.status === "saved" ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 16, padding: "18px 20px", backdropFilter: "blur(10px)" }}>

                    {/* File row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 32, flexShrink: 0 }}>{icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#888", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</div>
                        <div style={{ color: statusColor, fontSize: 12, fontWeight: 700, marginTop: 2 }}>{statusLabel}</div>
                      </div>
                      {/* Per-file upload/save buttons */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {item.status === "pending" && (
                          <button onClick={() => uploadItem(item)} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Upload</button>
                        )}
                        {item.status === "done" && (
                          <button onClick={() => saveItem(item).then(ok => { if (ok) { invalidateNotes(); showSuccess("Note saved!"); setQueue(q => q.filter(it => it._id !== item._id)); }})} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                        )}
                        {item.status === "error" && (
                          <button onClick={() => { updateItem(item._id, { status: "pending", error: "" }); uploadItem(item); }} style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
                        )}
                        {item.status !== "uploading" && (
                          <button onClick={() => removeItem(item._id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", width: 30, height: 30, borderRadius: 8, fontSize: 14, cursor: "pointer" }}>✕</button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar (uploading only) */}
                    {item.status === "uploading" && (
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 14 }}>
                        <div style={{ height: "100%", width: `${item.progress}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: 6, transition: "width 0.3s ease" }} />
                      </div>
                    )}

                    {/* Error message */}
                    {item.status === "error" && item.error && (
                      <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 14 }}>⚠ {item.error}</p>
                    )}

                    {/* Metadata form (shown once uploaded or when pending) */}
                    {(item.status === "done" || item.status === "pending") && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ gridColumn: "1/-1" }}>
                          <label style={lbl}>Title *</label>
                          <input style={inp} value={item.title} onChange={e => updateItem(item._id, { title: e.target.value })} placeholder="Note title…" />
                        </div>
                        <div>
                          <label style={lbl}>Subject</label>
                          <select style={inp} value={item.section} onChange={e => updateItem(item._id, { section: e.target.value })}>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Exam Type</label>
                          <select style={inp} value={item.examType} onChange={e => updateItem(item._id, { examType: e.target.value })}>
                            {EXAM_TYPES.map(et => <option key={et.id} value={et.id}>{et.icon} {et.label}</option>)}
                          </select>
                        </div>
                        <div style={{ gridColumn: "1/-1" }}>
                          <label style={lbl}>Description</label>
                          <textarea style={{ ...inp, height: 64, resize: "vertical" }} value={item.description} onChange={e => updateItem(item._id, { description: e.target.value })} placeholder="Brief overview of this note…" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MANAGE TAB ── */}
      {tab === "manage" && <ManageTab notes={notes} sections={sections} onDelete={handleDelete} />}

      {tab === "subjects" && <SubjectsManagerTab sections={sections} setSections={setSections} notes={notes} invalidateSubjects={invalidateSubjects} />}
    </div>
  );
}

// ── Manage Tab Component ──────────────────────────────────────────────────────
function ManageTab({ notes, sections, onDelete }) {
  const [filterSection,  setFilterSection]  = useState("all");
  const [filterExamType, setFilterExamType] = useState("all");
  const [selected,       setSelected]       = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  // ── filtered list ─────────────────────────────────────────────────────
  const filtered = notes.filter(n =>
    (filterSection  === "all" || n.section  === filterSection) &&
    (filterExamType === "all" || n.examType === filterExamType)
  );

  // ── selection helpers ─────────────────────────────────────────────────
  const allSelected  = filtered.length > 0 && filtered.every(n => selected.has(n.id));
  const someSelected = selected.size > 0;

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(n => next.delete(n.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(n => next.add(n.id)); return next; });
    }
  }

  // ── bulk delete ───────────────────────────────────────────────────────
  async function bulkDelete() {
    if (!window.confirm(`Delete ${selected.size} note${selected.size > 1 ? "s" : ""} permanently?`)) return;
    setIsBulkDeleting(true);
    let deleted = 0;
    for (const id of selected) {
      try { await notesAPI.delete(id); deleted++; } catch { /* skip */ }
    }
    // Refresh page notes via parent
    showSuccess(`${deleted} note${deleted > 1 ? "s" : ""} deleted.`);
    setSelected(new Set());
    setIsBulkDeleting(false);
    // Trigger a page refresh to re-fetch notes list
    window.location.reload();
  }

  return (
    <div style={{ background: "rgba(13,13,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 32, backdropFilter: "blur(10px)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 22, color: "#fff" }}>
          All Notes <span style={{ color: "#555", fontSize: 16 }}>({filtered.length}{filtered.length !== notes.length ? ` of ${notes.length}` : ""})</span>
        </h2>
        {someSelected && (
          <button onClick={bulkDelete} disabled={isBulkDeleting}
            style={{ background: isBulkDeleting ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isBulkDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {isBulkDeleting ? <><Spinner /> Deleting…</> : `🗑 Delete Selected (${selected.size})`}
          </button>
        )}
      </div>

      {/* Subject filter tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {[{ id: "all", label: "All Subjects" }, ...sections].map(s => (
          <button key={s.id} onClick={() => setFilterSection(s.id)}
            style={{ background: filterSection === s.id ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.03)", border: `1px solid ${filterSection === s.id ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.07)"}`, color: filterSection === s.id ? "#a78bfa" : "#555", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.18s" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Exam type filter + Select All row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {/* Exam type pills */}
        <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {[{ id: "all", label: "All Types", icon: "📋" }, ...EXAM_TYPES].map(et => (
            <button key={et.id} onClick={() => setFilterExamType(et.id)}
              style={{ background: filterExamType === et.id ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${filterExamType === et.id ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.07)"}`, color: filterExamType === et.id ? "#06b6d4" : "#555", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.18s" }}>
              {et.icon} {et.label}
            </button>
          ))}
        </div>

        {/* Select All checkbox */}
        {filtered.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#555", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
              style={{ width: 16, height: 16, accentColor: "#a78bfa", cursor: "pointer" }} />
            Select All ({filtered.length})
          </label>
        )}
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#333" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14 }}>No notes match the current filters.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(note => {
            const sec  = sections.find(s => s.id === note.section) || { color: "#888", label: "Unknown" };
            const et   = EXAM_TYPES.find(e => e.id === note.examType);
            const isSel = selected.has(note.id);
            return (
              <div key={note.id}
                onClick={() => toggleOne(note.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, background: isSel ? "rgba(124,58,237,0.1)" : "rgba(5,5,15,0.6)", border: `1px solid ${isSel ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.05)"}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer", transition: "all 0.18s" }}>

                {/* Checkbox */}
                <input type="checkbox" checked={isSel} onChange={() => toggleOne(note.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 16, height: 16, accentColor: "#a78bfa", cursor: "pointer", flexShrink: 0 }} />

                {/* Subject icon */}
                <div style={{ width: 40, height: 40, background: `${sec.color}18`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SubjectIcon sectionId={note.section} color={sec.color} size={24} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title}</div>
                  <div style={{ color: "#333", fontSize: 12, marginTop: 3, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: sec.color, fontWeight: 600 }}>{sec.label}</span>
                    {et && <span style={{ background: et.bg, color: et.color, fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20 }}>{et.icon} {et.label}</span>}
                    <span>· {formatDate(note.date)}</span>
                  </div>
                </div>

                {/* Delete button */}
                <button onClick={e => { e.stopPropagation(); onDelete(note.id); }}
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", width: 34, height: 34, borderRadius: 8, fontSize: 15, flexShrink: 0, cursor: "pointer" }}>🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

