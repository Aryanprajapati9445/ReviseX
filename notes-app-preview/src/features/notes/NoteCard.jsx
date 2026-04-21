import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { notesAPI } from "../../api/client.js";
import { getCachedUrl, setCachedUrl } from "../../api/cache.js";
import { useToast } from "../../components/Toast.jsx";
import { EXAM_TYPES } from "../../constants/index.js";
import { getFileIcon } from "../../utils/fileHelpers.js";
import { getFriendlyError } from "../../utils/errorMessages.js";
import SubjectIcon from "../../components/SubjectIcon.jsx";
import FileViewer from "./FileViewer.jsx";

/**
 * Displays a single note card with view (inline) and download (attachment) actions.
 * Uses signed S3 URLs with client-side caching to reduce backend load.
 */
export default function NoteCard({ note }) {
  const { sections } = useApp();
  const { error: showError } = useToast();
  const sec = sections.find(s => s.id === note.section) || { color: "#888", label: "Unknown" };
  const et  = EXAM_TYPES.find(e => e.id === note.examType);
  const [loadingView, setLoadingView] = useState(false);
  const [loadingDl,   setLoadingDl]   = useState(false);
  const [viewerUrl,   setViewerUrl]   = useState(null);
  const [viewerMeta,  setViewerMeta]  = useState(null);

  const hasS3File = !!note.fileKey;
  const fileIcon  = getFileIcon(note.fileType);

  async function handleView() {
    if (!hasS3File) {
      if (note.content?.startsWith("data:")) window.open(note.content, "_blank");
      else showError("No file attached to this note.");
      return;
    }
    setLoadingView(true);
    try {
      // Use cached URL if still valid
      const cached = getCachedUrl(note.id + "-view");
      const result = cached || await notesAPI.getViewUrl(note.id);
      if (!cached) setCachedUrl(note.id + "-view", result);
      setViewerUrl(result.url);
      setViewerMeta({ fileName: result.fileName, mimeType: result.mimeType, fileType: note.fileType });
    } catch (e) {
      showError(getFriendlyError(e));
    } finally {
      setLoadingView(false);
    }
  }

  async function handleDownload() {
    if (!hasS3File) {
      // Legacy fallback
      const a = document.createElement("a");
      if (note.content?.startsWith("data:")) {
        a.href = note.content;
        a.download = note.fileName || note.title + (note.fileType || ".bin");
      } else {
        a.href = URL.createObjectURL(new Blob([note.content || ""], { type: "text/plain" }));
        a.download = note.fileName || note.title + ".txt";
      }
      a.click();
      return;
    }
    setLoadingDl(true);
    try {
      const cached = getCachedUrl(note.id + "-dl");
      const { url, fileName } = cached || await notesAPI.getDownloadUrl(note.id);
      if (!cached) setCachedUrl(note.id + "-dl", { url, fileName });
      const a = document.createElement("a");
      a.href = url; a.download = fileName || note.title; a.click();
    } catch (e) {
      showError(getFriendlyError(e));
    } finally {
      setLoadingDl(false);
    }
  }

  const Spinner = ({ color = "currentColor" }) => (
    <svg width="13" height="13" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="2" strokeDasharray="20 24" />
    </svg>
  );

  return (
    <>
      <div className="card-hover" style={{ background: "rgba(13,13,26,0.8)", border: `1px solid ${sec.color}20`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", backdropFilter: "blur(10px)" }}>
        <div style={{ background: `linear-gradient(135deg,${sec.color}18,${sec.color}06)`, padding: "22px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, background: `${sec.color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SubjectIcon sectionId={note.section} color={sec.color} size={30} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ background: `${sec.color}18`, color: sec.color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{sec.label}</span>
            </div>
            {hasS3File && (
              <span style={{ fontSize: 11, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                {fileIcon} {note.fileType?.replace(".", "").toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div style={{ padding: "14px 20px", flex: 1 }}>
          {et && <span style={{ background: et.bg, color: et.color, border: `1px solid ${et.color}40`, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, display: "inline-block", marginBottom: 10 }}>{et.icon} {et.label}</span>}
          <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 8, lineHeight: 1.35 }}>{note.title}</h3>
          <p style={{ color: "#4a4a6a", fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>{note.description}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#333" }}>
            {note.pages > 0 && <span>📄 {note.pages}p</span>}
            {note.size && note.size !== "N/A" && <span>💾 {note.size}</span>}
            <span>🗓 {new Date(note.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${sec.color}15`, display: "flex", gap: 8 }}>
          <button onClick={handleView} disabled={loadingView}
            style={{ flex: 1, background: "transparent", border: `1px solid ${sec.color}40`, color: sec.color, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: loadingView ? 0.6 : 1, cursor: loadingView ? "wait" : "pointer" }}>
            {loadingView ? <Spinner /> : <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/><circle cx="7" cy="7" r="2" fill="currentColor"/></svg>}
            {loadingView ? "Opening..." : "View"}
          </button>
          <button onClick={handleDownload} disabled={loadingDl}
            style={{ flex: 2, background: `linear-gradient(135deg,${sec.color}cc,${sec.color})`, border: "none", color: "#fff", padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 4px 16px ${sec.color}33`, opacity: loadingDl ? 0.7 : 1, cursor: loadingDl ? "wait" : "pointer" }}>
            {loadingDl ? <Spinner color="white" /> : <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {loadingDl ? "Downloading..." : "Download"}
          </button>
        </div>
      </div>

      {viewerUrl && (
        <FileViewer
          url={viewerUrl}
          fileName={viewerMeta?.fileName || note.title}
          mimeType={viewerMeta?.mimeType}
          fileType={viewerMeta?.fileType || note.fileType}
          onClose={() => { setViewerUrl(null); setViewerMeta(null); }}
        />
      )}
    </>
  );
}
