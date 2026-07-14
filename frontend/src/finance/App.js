import "@/finance/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/finance/context/AuthContext";
import { Toaster } from "@/shared/components/ui/sonner";
import { Layout } from "@/finance/components/Layout";
import Login from "@/finance/pages/Login";
import Dashboard from "@/finance/pages/Dashboard";
import Clients from "@/finance/pages/Clients";
import ClientDetail from "@/finance/pages/ClientDetail";
import Projets from "@/finance/pages/Projets";
import Devis from "@/finance/pages/Devis";
import Factures from "@/finance/pages/Factures";
import Paiements from "@/finance/pages/Paiements";
import Depenses from "@/finance/pages/Depenses";
import Tresorerie from "@/finance/pages/Tresorerie";
import Comptabilite from "@/finance/pages/Comptabilite";
import Fiscalite from "@/finance/pages/Fiscalite";
import Investissements from "@/finance/pages/Investissements";
import CreancesDettes from "@/finance/pages/CreancesDettes";
import Budget from "@/finance/pages/Budget";
import Rapports from "@/finance/pages/Rapports";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Chargement...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/clients" element={<Protected><Clients /></Protected>} />
      <Route path="/clients/:id" element={<Protected><ClientDetail /></Protected>} />
      <Route path="/projets" element={<Protected><Projets /></Protected>} />
      <Route path="/devis" element={<Protected><Devis /></Protected>} />
      <Route path="/factures" element={<Protected><Factures /></Protected>} />
      <Route path="/paiements" element={<Protected><Paiements /></Protected>} />
      <Route path="/depenses" element={<Protected><Depenses /></Protected>} />
      <Route path="/tresorerie" element={<Protected><Tresorerie /></Protected>} />
      <Route path="/comptabilite" element={<Protected><Comptabilite /></Protected>} />
      <Route path="/fiscalite" element={<Protected><Fiscalite /></Protected>} />
      <Route path="/investissements" element={<Protected><Investissements /></Protected>} />
      <Route path="/creances-dettes" element={<Protected><CreancesDettes /></Protected>} />
      <Route path="/budget" element={<Protected><Budget /></Protected>} />
      <Route path="/rapports" element={<Protected><Rapports /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/finance">
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
