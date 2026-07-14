import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLang } from "@/org/context/LangContext";
import { useTheme } from "@/org/context/ThemeContext";
import { useAuth } from "@/org/context/AuthContext";
import {
  LayoutDashboard, FolderKanban, CheckSquare, CalendarRange,
  FileText, Users, HardHat, StickyNote, Settings, CalendarClock, Gavel,
  Sun, Moon, LogOut, Languages, Menu, X, ArrowLeft,
} from "lucide-react";

const ACTIVE = [
  { key: "dashboard", to: "/dashboard", icon: LayoutDashboard },
  { key: "projects", to: "/projects", icon: FolderKanban },
  { key: "tasks", to: "/tasks", icon: CheckSquare },
  { key: "planning", to: "/planning", icon: CalendarRange },
  { key: "contacts", to: "/contacts", icon: Users },
  { key: "documents", to: "/documents", icon: FileText },
  { key: "meetings", to: "/meetings", icon: CalendarClock },
  { key: "notes", to: "/notes", icon: StickyNote },
  { key: "decisions", to: "/decisions", icon: Gavel },
];
const DISABLED = [
  { key: "site", icon: HardHat },
  { key: "settings", icon: Settings },
];

export function Layout({ children }) {
  const { t, lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const Sidebar = (
    <aside
      className="flex h-full w-64 flex-col border-r"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}
    >
      {/* Header — pinned, click to return to the portal chooser */}
      <a
        href="/"
        data-testid="back-to-home"
        title={lang === "fr" ? "Retour à l'accueil" : "Back to home"}
        className="mb-2 flex flex-shrink-0 items-center gap-2.5 px-6 pt-6 pb-2 transition-opacity hover:opacity-80"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] text-sm font-bold text-white"
          style={{ backgroundColor: "var(--org-accent)" }}>SMK</div>
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>{t("app_name")}</p>
          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{t("tagline")}</p>
        </div>
      </a>

      {/* Nav — the only part that scrolls, so the header and footer always stay visible */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <nav className="flex flex-col gap-1">
          {ACTIVE.map(({ key, to, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              data-testid={`nav-${key}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors"
              style={({ isActive }) => ({
                backgroundColor: isActive ? "var(--org-accent)" : "transparent",
                color: isActive ? "#fff" : "var(--ink)",
              })}
            >
              <Icon size={18} strokeWidth={1.75} />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
          {t("coming_soon")}
        </div>
        <nav className="flex flex-col gap-1">
          {DISABLED.map(({ key, icon: Icon }) => (
            <div
              key={key}
              data-testid={`nav-disabled-${key}`}
              title={t("coming_soon")}
              className="flex cursor-not-allowed items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium opacity-40"
              style={{ color: "var(--ink)" }}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{t(key)}</span>
              <span className="rounded-full px-1.5 py-0.5 text-[9px] uppercase" style={{ backgroundColor: "var(--bg)", color: "var(--ink-muted)" }}>
                {lang === "fr" ? "bientôt" : "soon"}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer — pinned */}
      <div className="flex-shrink-0 border-t px-4 pt-4" style={{ borderColor: "var(--org-border)" }}>
        <div className="flex items-center gap-2.5 px-2 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: "var(--org-accent)" }}>
            {(user?.name || "S").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium" style={{ color: "var(--ink)" }}>{user?.name}</p>
            <p className="truncate text-[11px]" style={{ color: "var(--ink-muted)" }}>{user?.email}</p>
          </div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg)]"
          style={{ color: "var(--ink)" }}
        >
          <LogOut size={16} strokeWidth={1.75} /> {t("logout")}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
      <div className="hidden md:block">{Sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 flex-shrink-0 items-center justify-between border-b px-4 md:px-6"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)" }}
        >
          <button className="md:hidden" data-testid="menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <a
            href="/"
            data-testid="header-back-to-home"
            className="hidden items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg)] md:flex"
            style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            {lang === "fr" ? "Changer d'espace" : "Switch space"}
          </a>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <button data-testid="lang-toggle" onClick={toggleLang} aria-label="language"
              className="flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg)]"
              style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
              <Languages size={15} strokeWidth={1.75} /> {lang.toUpperCase()}
            </button>
            <button data-testid="theme-toggle" onClick={toggleTheme} aria-label="theme"
              className="rounded-[8px] border p-2 transition-colors hover:bg-[var(--bg)]"
              style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
              {theme === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
