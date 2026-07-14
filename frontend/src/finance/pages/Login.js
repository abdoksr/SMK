import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth, formatApiErrorDetail } from "@/finance/context/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { COMPANY_NAME } from "@/finance/lib/company";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-[#451119] p-12 text-white lg:flex"
        style={{
          backgroundImage: "linear-gradient(rgba(69,17,25,0.88), rgba(44,10,15,0.94)), url(https://images.unsplash.com/photo-1724582586458-a51791349977?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200)",
          backgroundSize: "cover", backgroundPosition: "center",
        }}>
        <div className="flex items-center gap-3">
          <img src="/logo-smk.png" alt={COMPANY_NAME} className="h-11 w-auto" />
          <span className="font-heading text-2xl font-semibold tracking-wide">{COMPANY_NAME}</span>
        </div>
        <div>
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight">
            Pilotez la santé financière de votre studio
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Trésorerie, rentabilité, fiscalité marocaine et prévisions — tout en un seul outil de pilotage professionnel.
          </p>
        </div>
        <p className="text-sm text-white/50">Architecture · Urbanisme · Architecture d'intérieur</p>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <a href="/" data-testid="login-back-home"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#451119]">
            <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
          </a>
          <h2 className="font-heading text-2xl font-semibold text-[#451119]">Connexion</h2>
          <p className="mt-1 text-sm text-slate-500">Accédez à votre tableau de bord</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm text-slate-600">Email</Label>
              <Input id="email" data-testid="login-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="admin@smk.ma" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm text-slate-600">Mot de passe</Label>
              <Input id="password" data-testid="login-password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5" />
            </div>
            {error && <p data-testid="login-error" className="text-sm text-red-600">{error}</p>}
            <Button data-testid="login-submit" type="submit" disabled={loading}
              className="w-full bg-[#A57945] hover:bg-[#451119] transition-all">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
