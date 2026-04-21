import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { getFileCategory } from "../../utils/fileHelpers.js";

// Lazy-load PDF.js viewer only when needed
const PDFViewer = lazy(() => import("./PDFViewer.jsx"));

/**
 * Sandboxed file viewer modal.
 * Rendered via a React portal so it's always on top of everything,
 * including the fixed Navbar (which creates its own stacking context).
 */
export default function FileViewer({ url, fileName, mimeType, fileType, onClose }) {
  const category = getFileCategory(fileType, mimeType);
  const [textContent, setTextContent] = useState(null);

  // Fetch text/markdown files
  useEffect(() => {
    if (category !== "text") return;
    fetch(url)
      .then(r => r.text())
      .then(setTextContent)
      .catch(() => setTextContent("Could not load file content."));
  }, [url, category]);

  // Robust body scroll lock:
  // Setting overflow:hidden alone doesn't stop overscroll on iOS/Chrome.
  // Fix: freeze the body at its current scroll position using position:fixed,
  // then restore it exactly when the modal closes.
  useEffect(() => {
    const scrollY    = window.scrollY;
    const body       = document.body;
    const prevStyle  = {
      position:          body.style.position,
      top:               body.style.top,
      left:              body.style.left,
      right:             body.style.right,
      overflow:          body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    body.style.position           = "fixed";
    body.style.top                = `-${scrollY}px`;
    body.style.left               = "0";
    body.style.right              = "0";
    body.style.overflow           = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      Object.assign(body.style, prevStyle);
      window.scrollTo(0, scrollY); // restore exact position
    };
  }, []);


  // Close on Escape key
  const handleKey = useCallback(e => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const renderContent = () => {
    switch (category) {
      case "pdf":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PDFViewer url={url} />
          </Suspense>
        );

      case "image":
        return (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" }}>
            <img
              src={url}
              alt={fileName}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
            />
          </div>
        );

      case "video":
        return (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#000" }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={url} controls style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 10 }} />
          </div>
        );

      case "audio":
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 48 }}>
            <div style={{ fontSize: 80, lineHeight: 1 }}>🎵</div>
            <p style={{ color: "#ccc", fontSize: 15, fontWeight: 600, textAlign: "center", maxWidth: 340 }}>{fileName}</p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={url} controls style={{ width: "100%", maxWidth: 420 }} />
          </div>
        );

      case "text":
        return (
          <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
            {textContent === null
              ? <LoadingSpinner />
              : <pre style={{ color: "#e2e2f0", fontSize: 14, lineHeight: 1.75, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{textContent}</pre>
            }
          </div>
        );

      case "doc":
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/*
              Microsoft Office Online Viewer — renders .doc/.docx in-browser.
              Unlike Google Docs viewer, Office Online fetches the file directly
              from the signed URL in the browser — your URL never hits Google's servers.
              Requires the URL to be publicly accessible (signed CloudFront URL works ✅).
            */}
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={fileName}
              style={{ flex: 1, width: "100%", border: "none", display: "block" }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(13,13,26,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#555", fontSize: 12 }}>Powered by Microsoft Office Online</span>
              <a href={url} download={fileName} style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>⬇ Download instead</a>
            </div>
          </div>
        );


      default:
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 48 }}>
            <div style={{ fontSize: 72, lineHeight: 1 }}>📄</div>
            <p style={{ color: "#ccc", fontSize: 16, fontWeight: 600 }}>{fileName}</p>
            <p style={{ color: "#555", fontSize: 14, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
              This file type can't be previewed inline. Download it to view.
            </p>
            <a
              href={url}
              download={fileName}
              style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", padding: "12px 32px", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}
            >
              ⬇ Download File
            </a>
          </div>
        );
    }
  };

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999, // above Navbar (200), above everything
        display: "flex",
        flexDirection: "column",
        background: "rgba(3,3,10,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        overscrollBehavior: "none",   // stops rubber-band scroll leaking to page
        touchAction: "none",          // prevent touch scroll propagation on mobile
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${fileName}`}
    >
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        background: "rgba(13,13,26,0.9)",
        borderBottom: "1px solid rgba(167,139,250,0.1)",
        flexShrink: 0,
      }}>
        {/* File type badge */}
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>
          {categoryIcon(category)}
        </div>

        {/* File info */}
        <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
          <div style={{
            fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15,
            color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {fileName}
          </div>
          <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>
            {mimeType || fileType || "Unknown type"}
          </div>
        </div>

        {/* Open in new tab */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          style={btnStyle}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9 2h5v5M14 2L8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Open
        </a>

        {/* Download */}
        <a
          href={url}
          download={fileName}
          title="Download file"
          style={btnStyle}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Download
        </a>

        {/* Close */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            width: 36, height: 36, flexShrink: 0,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            fontSize: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
        >
          ×
        </button>
      </div>

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: category === "pdf" ? "#525659" : "rgba(10,10,20,0.6)",
        // PDF viewers look best on a neutral gray background (matches Acrobat / browser defaults)
      }}>
        {renderContent()}
      </div>
    </div>
  );

  // Render into document.body via portal — bypasses any parent z-index/stacking context
  return createPortal(modal, document.body);
}

/** Small shared style for header action buttons */
const btnStyle = {
  display: "flex", alignItems: "center", gap: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#aaa",
  padding: "7px 14px",
  borderRadius: 9,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
  fontFamily: "inherit",
};

/** Returns an emoji representation of the file category. */
function categoryIcon(cat) {
  const icons = { pdf: "📕", image: "🖼", video: "🎬", audio: "🎵", text: "📝", doc: "📘" };
  return icons[cat] || "📄";
}

function LoadingSpinner() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#555" }}>
      <svg width="24" height="24" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="9" cy="9" r="7" stroke="#a78bfa" strokeWidth="2" strokeDasharray="20 24" />
      </svg>
      <span style={{ fontSize: 14 }}>Loading...</span>
    </div>
  );
}
