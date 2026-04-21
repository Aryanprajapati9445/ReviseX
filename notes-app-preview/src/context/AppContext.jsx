import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { notesAPI, subjectsAPI } from "../api/client.js";
import { cachedFetch, invalidateCachePrefix } from "../api/cache.js";
import { withRetry } from "../utils/retry.js";

const AppCtx = createContext(null);

/** Access global app state: notes, sections, student session, admin flag. */
export function useApp() { return useContext(AppCtx); }

export function AppProvider({ children }) {
  const [notes,    setNotesState]   = useState([]);
  const [sections, setSections]     = useState([]);
  const [isAdmin,  setIsAdmin]      = useState(false);
  const [showLogin, setShowLogin]   = useState(false);
  const [showStudentLogin, setShowStudentLogin] = useState(false);
  const [student,  setStudentState] = useState(null);

  // ── Persist student session ──────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("revisex_student");
      if (saved) setStudentState(JSON.parse(saved));
    } catch { /* ignore corrupt data */ }
  }, []);

  const setStudent = useCallback((s) => {
    setStudentState(s);
    if (s) localStorage.setItem("revisex_student", JSON.stringify(s));
    else   localStorage.removeItem("revisex_student");
  }, []);

  // ── Persist admin token in sessionStorage ────────────────────────
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (token) setIsAdmin(true);
  }, []);

  // ── Load notes and sections from backend (with retry + cache) ────
  const refreshNotes = useCallback(async (signal) => {
    try {
      const data = await withRetry(() =>
        cachedFetch("notes-all", () => notesAPI.getAll(), 60_000)
      );
      if (signal?.aborted) return;
      setNotesState(data.map(n => ({
        ...n,
        id:          n.id   || n._id,
        section:     n.section || n.subject || "engmath",
        description: n.description || n.content || "",
        pages:       n.pages || 0,
        size:        n.size  || "N/A",
        uploader:    n.author || "Admin",
      })));
    } catch (e) {
      if (!signal?.aborted) console.error("Failed to load notes:", e);
    }
  }, []);

  const refreshSections = useCallback(async (signal) => {
    try {
      const data = await withRetry(() =>
        cachedFetch("subjects-all", () => subjectsAPI.getAll(), 300_000)
      );
      if (signal?.aborted) return;
      if (data?.length > 0) {
        setSections(data.map(s => ({ id: s.id, label: s.name, color: s.color || "#a78bfa" })));
      }
    } catch (e) {
      if (!signal?.aborted) console.warn("Could not load subjects, using defaults:", e);
    }
  }, []);

  /** Call after admin creates/deletes a note so the list refreshes. */
  const invalidateNotes = useCallback(() => {
    invalidateCachePrefix("notes-");
    const ctrl = new AbortController();
    refreshNotes(ctrl.signal);
  }, [refreshNotes]);

  useEffect(() => {
    if (!student) return;   // don't fetch until logged in
    const ctrl = new AbortController();
    refreshNotes(ctrl.signal);
    refreshSections(ctrl.signal);
    return () => ctrl.abort();
  }, [student, refreshNotes, refreshSections]);

  return (
    <AppCtx.Provider value={{
      notes, setNotes: setNotesState, invalidateNotes,
      sections, setSections,
      isAdmin, setIsAdmin,
      showLogin, setShowLogin,
      showStudentLogin, setShowStudentLogin,
      student, setStudent,
    }}>
      {children}
    </AppCtx.Provider>
  );
}
