import "@/org/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/org/context/AuthContext";
import { LangProvider } from "@/org/context/LangContext";
import { ThemeProvider } from "@/org/context/ThemeContext";
import { Layout } from "@/org/components/Layout";
import Login from "@/org/pages/Login";
import Dashboard from "@/org/pages/Dashboard";
import Projects from "@/org/pages/Projects";
import ProjectDetail from "@/org/pages/ProjectDetail";
import Tasks from "@/org/pages/Tasks";
import Planning from "@/org/pages/Planning";
import Contacts from "@/org/pages/Contacts";
import Documents from "@/org/pages/Documents";
import Meetings from "@/org/pages/Meetings";
import Decisions from "@/org/pages/Decisions";
import Notes from "@/org/pages/Notes";

function Protected({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--bg)", color: "var(--ink-muted)" }}>…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicOnly({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--bg)" }} />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <LangProvider>
          <BrowserRouter basename="/org">
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
                <Route path="/projects" element={<Protected><Projects /></Protected>} />
                <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
                <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
                <Route path="/planning" element={<Protected><Planning /></Protected>} />
                <Route path="/contacts" element={<Protected><Contacts /></Protected>} />
                <Route path="/documents" element={<Protected><Documents /></Protected>} />
                <Route path="/meetings" element={<Protected><Meetings /></Protected>} />
                <Route path="/decisions" element={<Protected><Decisions /></Protected>} />
                <Route path="/notes" element={<Protected><Notes /></Protected>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </LangProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
