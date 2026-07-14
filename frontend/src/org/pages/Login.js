import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/org/context/AuthContext";
import { useLang } from "@/org/context/LangContext";
import { apiError } from "@/org/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const msg = apiError(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div className="hidden w-1/2 bg-cover bg-center lg:block"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1549140600-78c9b8275e9d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200')" }}>
        <div className="flex h-full w-full flex-col justify-end p-12" style={{ background: "linear-gradient(to top, rgba(22,22,26,0.75), rgba(22,22,26,0.1))" }}>
          <h2 className="text-3xl font-semibold text-white">{t("app_name")}</h2>
          <p className="mt-2 max-w-sm text-sm text-white/80">{t("tagline")}</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <a href="/" data-testid="login-back-home"
            className="mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "var(--ink-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> {lang === "fr" ? "Retour à l'accueil" : "Back to home"}
          </a>
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] text-sm font-bold text-white" style={{ backgroundColor: "var(--org-accent)" }}>SMK</div>
              <span className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{t("app_name")}</span>
            </div>
            <button data-testid="login-lang-toggle" onClick={toggleLang}
              className="rounded-[8px] border px-2.5 py-1 text-xs font-medium" style={{ borderColor: "var(--org-border)", color: "var(--ink)" }}>
              {lang.toUpperCase()}
            </button>
          </div>

          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>{t("welcome_back")}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>{t("login_subtitle")}</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("email")}</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-[8px] border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--org-accent)]"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}
                placeholder="admin@smk.ma"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>{t("password")}</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-[8px] border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--org-accent)]"
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--org-border)", color: "var(--ink)" }}
                placeholder="••••••••"
              />
            </div>

            {error && <p data-testid="login-error" className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

            <button
              data-testid="login-submit"
              type="submit"
              disabled={busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-[8px] py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--org-accent)" }}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? t("signing_in") : t("sign_in")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
