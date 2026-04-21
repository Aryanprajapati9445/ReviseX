/** Injects global CSS tokens, animations, and utility classes into the document head. */
export default function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
      *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
      html { scroll-behavior:smooth; }
      body { background:#05050f; color:#e2e2f0; font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden; }
      ::-webkit-scrollbar { width:5px; }
      ::-webkit-scrollbar-track { background:#0a0a18; }
      ::-webkit-scrollbar-thumb { background:#2a2a4a; border-radius:4px; }
      input,textarea,select { font-family:inherit; }
      button { cursor:pointer; }
      @keyframes fadeUp  { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes pulse   { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      @keyframes slideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
      .fadeUp  { animation: fadeUp 0.55s ease both; }
      .fadeUp2 { animation: fadeUp 0.55s 0.12s ease both; }
      .fadeUp3 { animation: fadeUp 0.55s 0.24s ease both; }
      .card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease !important; }
      .card-hover:hover { transform: translateY(-6px) !important; box-shadow: 0 24px 60px rgba(0,0,0,0.6) !important; }
      .btn-scale { transition: transform 0.15s ease, opacity 0.15s ease !important; }
      .btn-scale:hover  { transform: scale(1.05) !important; opacity:0.92; }
      .btn-scale:active { transform: scale(0.97) !important; }
      .glass { background: rgba(13,13,26,0.75) !important; backdrop-filter: blur(16px); }
    `}</style>
  );
}
