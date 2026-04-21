/**
 * PDF viewer via browser's native renderer.
 * Loaded lazily — not bundled on initial load.
 */
export default function PDFViewer({ url }) {
  return (
    <iframe
      src={url}
      title="PDF Viewer"
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
        // Browser's built-in PDF viewer handles the rest
      }}
    />
  );
}
