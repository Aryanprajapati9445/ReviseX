/**
 * Retry an async function up to maxAttempts times with exponential backoff.
 * Backoff: 1s → 2s → 4s between attempts.
 * Do NOT use on auth calls — failures there should be instant.
 */
export async function withRetry(fn, maxAttempts = 3, baseMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxAttempts - 1) throw e; // bubble up on last attempt
      await new Promise(r => setTimeout(r, baseMs * 2 ** i)); // 1s, 2s, 4s
    }
  }
}
