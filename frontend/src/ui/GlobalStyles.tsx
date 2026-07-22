import { colors, fonts } from './tokens';

/** Reset + base tipográfica. Texto base ≥14px, áreas de toque ≥44px (RNF002). */
export function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body {
        margin: 0;
        background: ${colors.bg};
        color: ${colors.text};
        font-family: ${fonts.sans};
        font-size: 14px;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
      }
      #root { display: flex; flex-direction: column; min-height: 100%; }
      button { font-family: inherit; cursor: pointer; border: none; background: none; }
      input, select, textarea { font-family: inherit; font-size: 15px; }
      /* Áreas de toque mínimas (RNF002). */
      button, a, [role="button"] { min-height: 44px; }
      a { color: inherit; text-decoration: none; }
      .scr::-webkit-scrollbar { width: 0; height: 0; }
      .scr { scrollbar-width: none; }
      h1, h2, h3 { font-family: ${fonts.serif}; font-weight: 600; margin: 0; }
      @media (prefers-reduced-motion: no-preference) {
        .fade-in { animation: fade .18s ease both; }
      }
      @keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    `}</style>
  );
}
