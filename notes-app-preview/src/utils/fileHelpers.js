/** Return an emoji icon for a given file extension string (e.g. ".pdf"). */
export function getFileIcon(fileType) {
  if (!fileType) return "📄";
  if (fileType === ".pdf") return "📕";
  if (fileType === ".md")  return "📝";
  if (fileType.includes("doc")) return "📘";
  if (/\.(mp4|webm)/.test(fileType)) return "🎬";
  if (/\.(mp3|wav)/.test(fileType))  return "🎵";
  if (/\.(jpg|jpeg|png|gif|webp)/.test(fileType)) return "🖼";
  return "📄";
}

/** Determine media category from a file extension for the FileViewer. */
export function getFileCategory(fileType, mimeType) {
  if (!fileType && !mimeType) return "unknown";
  const ext = (fileType || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  if (ext === ".pdf" || mime === "application/pdf") return "pdf";
  if (/\.(jpg|jpeg|png|gif|webp)/.test(ext) || mime.startsWith("image/")) return "image";
  if (/\.(mp4|webm)/.test(ext) || mime.startsWith("video/")) return "video";
  if (/\.(mp3|wav)/.test(ext) || mime.startsWith("audio/")) return "audio";
  if (/\.(txt|md)/.test(ext) || mime === "text/plain" || mime === "text/markdown") return "text";
  if (/\.(doc|docx)/.test(ext)) return "doc";
  return "unknown";
}
