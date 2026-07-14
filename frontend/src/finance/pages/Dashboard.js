import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  Percent, Banknote, Calendar,
} from "lucide-react";
import { api } from "@/finance/lib/api";
import { formatDH } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";

const COLORS = ["#451119", "#A57945", "#A57945", "#10B981", "#F97316", "#64748B"];

function Kpi({ label, value, icon: Icon, accent = "#A57945", testid, alert }) {
  return (
    <Card data-testid={testid} className="border-l-4 border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
      style={{ borderLeftColor: accent }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-light tracking-tight ${alert ? "text-red-600" : "text-[#451119]"}`}>{value}</p>
        </div>
        <div className="rounded-md p-2" style={{ backgroundColor: `${accent}15` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={1.5} />
        </div>
      </div>
    </Card>
  );
}

const tooltipFmt = (v) => formatDH(v);

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["/dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });

  if (isLoading || !data) return <div className="text-slate-400">Chargement du tableau de bord...</div>;
  const k = data.kpi;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">Vue d'ensemble — Exercice {data.annee}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi testid="kpi-ca-mois" label="CA du mois" value={formatDH(k.ca_mois)} icon={TrendingUp} accent="#A57945" />
        <Kpi testid="kpi-ca-trimestre" label="CA du trimestre" value={formatDH(k.ca_trimestre)} icon={Calendar} accent="#A57945" />
        <Kpi testid="kpi-ca-annee" label="CA de l'année" value={formatDH(k.ca_annee)} icon={TrendingUp} accent="#451119" />
        <Kpi testid="kpi-benefice" label="Bénéfice net (annuel)" value={formatDH(k.benefice_net)} icon={Banknote} accent="#A57945" alert={k.benefice_net < 0} />
        <Kpi testid="kpi-tresorerie" label="Trésorerie disponible" value={formatDH(k.tresorerie)} icon={Wallet} accent="#10B981" alert={k.tresorerie < 0} />
        <Kpi testid="kpi-depenses" label="Dépenses de l'année" value={formatDH(k.depenses_annee)} icon={ArrowDownCircle} accent="#F97316" />
        <Kpi testid="kpi-a-encaisser" label="À encaisser (créances)" value={formatDH(k.a_encaisser)} icon={ArrowUpCircle} accent="#A57945" />
        <Kpi testid="kpi-a-payer" label="À payer (dettes)" value={formatDH(k.a_payer)} icon={ArrowDownCircle} accent="#F97316" />
        <Kpi testid="kpi-factures-retard" label="Factures en retard" value={k.factures_retard} icon={AlertTriangle} accent="#EF4444" alert={k.factures_retard > 0} />
        <Kpi testid="kpi-marge" label="Marge nette moyenne" value={`${k.marge_nette} %`} icon={Percent} accent="#A57945" alert={k.marge_nette < 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-[#451119]">CA vs Dépenses (12 mois)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.ca_depenses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={tooltipFmt} />
              <Legend />
              <Line type="monotone" dataKey="ca" name="Chiffre d'affaires" stroke="#A57945" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#F97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-slate-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-[#451119]">Évolution de la trésorerie</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.tresorerie_evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={tooltipFmt} />
              <Line type="monotone" dataKey="tresorerie" name="Trésorerie cumulée" stroke="#451119" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-slate-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-[#451119]">Répartition des dépenses</h3>
          {data.depenses_categorie.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-400">Aucune dépense enregistrée</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.depenses_categorie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                  {data.depenses_categorie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={tooltipFmt} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="border-slate-200 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-[#451119]">Marge par projet</h3>
          {data.marge_projet.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-400">Aucun projet enregistré</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.marge_projet}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="nom" tick={{ fontSize: 10, fill: "#64748B" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={tooltipFmt} />
                <Bar dataKey="marge" name="Marge">
                  {data.marge_projet.map((e, i) => <Cell key={i} fill={e.marge < 0 ? "#EF4444" : "#10B981"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
