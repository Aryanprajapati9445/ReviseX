/** Shared constants — exam types, branch colours, etc. */

export const EXAM_TYPES = [
  { id: "mse1",   label: "MSE 1",   color: "#3b82f6", bg: "#0f1e35", icon: "I"  },
  { id: "mse2",   label: "MSE 2",   color: "#10b981", bg: "#0a1f18", icon: "II" },
  { id: "endsem", label: "End Sem", color: "#f59e0b", bg: "#201508", icon: "★"  },
];

export const BRANCH_COLORS = {
  CS: "#a78bfa", IT: "#06b6d4", EC: "#f59e0b",
  EE: "#f97316", ME: "#10b981", CE: "#3b82f6",
  EN: "#ec4899", CH: "#14b8a6",
};

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "text/markdown",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav",
];

export const ACCEPTED_EXT = [
  ".pdf", ".doc", ".docx", ".txt", ".md",
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".mp4", ".webm", ".mp3", ".wav",
];
