import { COMPANY_NAME } from "@/finance/lib/company";

export default function Landing() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250,247,241,0.94), rgba(250,247,241,0.97)), url(https://images.unsplash.com/photo-1724582586458-a51791349977?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <img src="/logo-smk.png" alt={COMPANY_NAME} className="mb-6 h-14 w-auto" />
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#A57945" }}>
          Espace privé
        </p>
        <h1
          className="mt-3 font-heading text-5xl font-semibold leading-tight"
          style={{ color: "hsl(351 60% 17%)" }}
        >
          {COMPANY_NAME || "Studio Madaji Khaoula"}
        </h1>
        <p className="mt-3 max-w-md text-sm" style={{ color: "#595959" }}>
          Choisissez votre espace pour continuer
        </p>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-5 sm:flex-row">
        <a
          href="/finance"
          className="group flex-1 rounded-lg border p-8 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: "#fff", borderColor: "#E8E1D8" }}
        >
          <h2 className="font-heading text-2xl font-semibold" style={{ color: "hsl(351 60% 17%)" }}>
            Finance
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#595959" }}>
            Gestion financière — admin
          </p>
          <span
            className="mt-4 inline-block text-xs font-medium uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "#A57945" }}
          >
            Entrer →
          </span>
        </a>

        <a
          href="/org"
          className="group flex-1 rounded-lg border p-8 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: "#fff", borderColor: "#E8E1D8" }}
        >
          <h2 className="font-heading text-2xl font-semibold" style={{ color: "#A57945" }}>
            Organisation
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#595959" }}>
            Projets & suivi — architecte
          </p>
          <span
            className="mt-4 inline-block text-xs font-medium uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "#A57945" }}
          >
            Entrer →
          </span>
        </a>
      </div>

      <p className="absolute bottom-6 text-[11px]" style={{ color: "#8A8A86" }}>
        Architecture · Urbanisme · Design intérieur — Maroc
      </p>
    </div>
  );
}
