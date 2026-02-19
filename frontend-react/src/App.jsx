// ============================================================
// App.jsx — Root dell'applicazione con routing
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import FolderPage from "./pages/FolderPage";
import StudyPage from "./pages/StudyPage";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  return (
    <BrowserRouter>
      {/* Font Google importato via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0f0e11;
          --surface: #1a1820;
          --surface2: #252230;
          --border: #2e2b3a;
          --accent: #c8b8ff;
          --accent2: #ff9eb5;
          --text: #ece8f5;
          --muted: #8a8599;
          --radius: 14px;
          --font-display: 'DM Serif Display', serif;
          --font-body: 'DM Sans', sans-serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          min-height: 100vh;
        }

        button {
          font-family: var(--font-body);
          cursor: pointer;
          border: none;
          outline: none;
        }

        input {
          font-family: var(--font-body);
        }

        /* Animazione fade-in globale */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.4s ease both;
        }
      `}</style>

      <Routes>
        {/* "/" → pagina di login/registrazione */}
        <Route path="/" element={<AuthPage />} />

        {/* Rotte protette */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/folders/:id"
          element={
            <PrivateRoute>
              <FolderPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/study/:id"
          element={
            <PrivateRoute>
              <StudyPage />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}