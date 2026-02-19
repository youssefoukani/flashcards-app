import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage    from "./pages/AuthPage";
import Dashboard   from "./pages/Dashboard";
import FolderPage  from "./pages/FolderPage";
import StudyPage   from "./pages/StudyPage";
import JoinPage    from "./pages/JoinPage";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          /* Palette */
          --bg:        #09090f;
          --surface:   #111118;
          --surface2:  #1a1a24;
          --surface3:  #22222f;
          --border:    #2a2a3a;
          --border2:   #38384d;

          /* Accents */
          --accent:    #7c6aff;
          --accent2:   #ff6ab0;
          --accent3:   #6af0ff;
          --accentDim: rgba(124,106,255,0.15);

          /* Text */
          --text:      #f0eeff;
          --textSub:   #b8b4d0;
          --muted:     #6b6885;

          /* Misc */
          --radius:    16px;
          --radiusSm:  10px;
          --shadow:    0 4px 32px rgba(0,0,0,0.5);
          --glow:      0 0 24px rgba(124,106,255,0.25);
          --font:      'Montserrat', sans-serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font);
          font-size: 16px;
          min-height: 100vh;
          /* Subtle noise texture */
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        }

        button  { font-family: var(--font); cursor: pointer; border: none; outline: none; }
        input, textarea, select { font-family: var(--font); }

        /* Scrollbar */
        ::-webkit-scrollbar       { width: 6px; }
        ::-webkit-scrollbar-track  { background: var(--bg); }
        ::-webkit-scrollbar-thumb  { background: var(--border2); border-radius: 3px; }

        /* Animations */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .fade-up  { animation: fadeUp  0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-in  { animation: fadeIn  0.3s ease both; }

        /* Stagger util */
        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.10s; }
        .stagger-3 { animation-delay: 0.15s; }
        .stagger-4 { animation-delay: 0.20s; }
        .stagger-5 { animation-delay: 0.25s; }

        /* Hover glow button */
        .btn-glow {
          position: relative;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-glow:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(124,106,255,0.4);
        }
        .btn-glow:active { transform: translateY(0); }

        /* Ghost button */
        .btn-ghost {
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .btn-ghost:hover {
          background: var(--surface3) !important;
          border-color: var(--border2) !important;
          color: var(--text) !important;
        }

        /* Card hover */
        .card-hover {
          transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .card-hover:hover {
          border-color: var(--accent) !important;
          transform: translateY(-3px);
          box-shadow: var(--glow);
        }

        /* Input focus */
        .input-field:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accentDim);
        }
      `}</style>

      <Routes>
        <Route path="/"          element={<AuthPage />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/folders/:id" element={<PrivateRoute><FolderPage /></PrivateRoute>} />
        <Route path="/study/:id"   element={<PrivateRoute><StudyPage /></PrivateRoute>} />
        <Route path="/join"        element={<PrivateRoute><JoinPage /></PrivateRoute>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}