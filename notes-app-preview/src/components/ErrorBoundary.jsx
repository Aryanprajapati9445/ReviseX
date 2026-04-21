import { Component } from "react";

/**
 * Catches runtime React errors and renders a graceful fallback instead of
 * crashing the entire page (white screen of death).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production, send to Sentry / LogRocket here — NEVER show raw error in UI
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>⚠️</div>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 22, color: "#fff" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#555", fontSize: 15, maxWidth: 380, lineHeight: 1.7 }}>
            We hit an unexpected error. Please refresh the page or go back to the home screen.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
            style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", border: "none", color: "#fff", padding: "12px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
