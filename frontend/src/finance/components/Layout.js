import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderKanban, FileText, ReceiptText, Wallet,
  CreditCard, TrendingUp, BookOpenCheck, Landmark, Package, Scale,
  CalendarRange, FileBarChart, LogOut, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/finance/context/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { COMPANY_NAME, COMPANY_SUBTITLE } from "@/finance/lib/company";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, testid: "dashboard", end: true },
  { to: "/clients", label: "Clients", icon: Users, testid: "clients" },
  { to: "/projets", label: "Projets", icon: FolderKanban, testid: "projets" },
  { to: "/devis", label: "Devis", icon: FileText, testid: "devis" },
  { to: "/factures", label: "Factures", icon: ReceiptText, testid: "factures" },
  { to: "/paiements", label: "Paiements", icon: CreditCard, testid: "paiements" },
  { to: "/depenses", label: "Dépenses", icon: Wallet, testid: "depenses" },
  { to: "/tresorerie", label: "Trésorerie", icon: TrendingUp, testid: "tresorerie" },
  { to: "/comptabilite", label: "Comptabilité", icon: BookOpenCheck, testid: "comptabilite" },
  { to: "/fiscalite", label: "Fiscalité", icon: Landmark, testid: "fiscalite" },
  { to: "/investissements", label: "Investissements", icon: Package, testid: "investissements" },
  { to: "/creances-dettes", label: "Créances & Dettes", icon: Scale, testid: "creances-dettes" },
  { to: "/budget", label: "Budget prévisionnel", icon: CalendarRange, testid: "budget" },
  { to: "/rapports", label: "Rapports", icon: FileBarChart, testid: "rapports" },
];

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#FAF7F1]">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-[#451119] text-white">
        <a
          href="/"
          data-testid="back-to-home"
          title="Retour à l'accueil"
          className="flex items-center gap-3 border-b border-white/10 px-6 py-6 transition-opacity hover:opacity-80"
        >
          <img src="/logo-smk.png" alt={COMPANY_NAME} className="h-10 w-auto" />
          <div>
            <p className="font-heading text-base font-semibold leading-tight tracking-wide">{COMPANY_NAME}</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/60">{COMPANY_SUBTITLE}</p>
          </div>
        </a>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`sidebar-nav-${item.testid}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? "bg-[#A57945] font-medium text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-2 px-3 text-xs text-white/60 truncate">{user?.email}</div>
          <a href="/" data-testid="switch-space-btn"
            className="flex w-full items-center rounded-md px-3 py-2.5 text-sm text-white/80 transition-all hover:bg-white/10 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" /> Changer d'espace
          </a>
          <Button data-testid="logout-btn" onClick={handleLogout} variant="ghost"
            className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white">
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>
      <main className="ml-64 flex-1">
        <div className="min-h-screen p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
