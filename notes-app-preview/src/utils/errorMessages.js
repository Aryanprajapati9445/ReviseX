/**
 * Map raw API errors to human-readable messages.
 * Never expose stack traces or raw server messages to the user.
 */
const STATUS_MESSAGES = {
  400: "Invalid request. Please check your input.",
  401: "Please log in to continue.",
  403: "You don't have permission to do that.",
  404: "That resource doesn't exist.",
  409: "This already exists.",
  413: "The file is too large.",
  429: "Too many requests. Please slow down.",
  500: "Something went wrong on our end. Please try again.",
  503: "Service temporarily unavailable. Please try again soon.",
};

/**
 * Given an error (or HTTP status code), return a safe, user-friendly message.
 * @param {Error|number|string} err
 * @returns {string}
 */
export function getFriendlyError(err) {
  if (typeof err === "number") return STATUS_MESSAGES[err] ?? "Something went wrong.";
  if (typeof err === "string") return err; // already a friendly string from our API layer

  const msg = err?.message || "";

  // Map known status codes embedded in error messages
  for (const [code, text] of Object.entries(STATUS_MESSAGES)) {
    if (msg.includes(code)) return text;
  }

  // Swallow network errors
  if (msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("networkerror")) {
    return "Network error. Please check your connection and try again.";
  }

  // Fallback — never show raw messages
  return "Something went wrong. Please try again.";
}
