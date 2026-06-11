import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Home from "@/pages/Home";
import Levels from "@/pages/Levels";
import Play from "@/pages/Play";
import Battle from "@/pages/Battle";
import BattleRoom from "@/pages/BattleRoom";
import { Toaster } from "sonner";
import "@/App.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-charcoal-soft animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#FFFBF3",
              border: "2px solid #3D3833",
              color: "#3D3833",
              boxShadow: "0 4px 0 #3D3833",
              borderRadius: "14px",
              fontFamily: 'Nunito, system-ui, sans-serif',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<RedirectIfAuthed><Welcome /></RedirectIfAuthed>} />
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
          <Route path="/home" element={<Protected><Home /></Protected>} />
          <Route path="/levels" element={<Protected><Levels /></Protected>} />
          <Route path="/play/:level" element={<Protected><Play /></Protected>} />
          <Route path="/battle" element={<Protected><Battle /></Protected>} />
          <Route path="/battle/:code" element={<Protected><BattleRoom /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
