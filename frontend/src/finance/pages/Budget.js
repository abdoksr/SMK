import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/finance/lib/api";
import { formatDH } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function Grid({ title, data, section, onChange }) {
  const cats = Object.keys(data[section] || {});
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="font-medium text-[#451119]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-xs uppercase text-slate-500">Poste</th>
              {MONTHS.map((m) => <th key={m} className="px-1 py-2 text-center text-xs text-slate-500">{m}</th>)}
              <th className="px-3 py-2 text-right text-xs uppercase text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => {
              const total = (data[section][cat] || []).reduce((a, b) => a + Number(b || 0), 0);
              return (
                <tr key={cat} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium">{cat}</td>
                  {MONTHS.map((_, i) => (
                    <td key={i} className="px-0.5 py-1">
                      <Input type="number" data-testid={`budget-${section}-${cat}-${i}`}
                        className="h-8 w-20 border-slate-200 px-1 text-right text-xs"
                        value={data[section][cat][i] ?? 0}
                        onChange={(e) => onChange(section, cat, i, Number(e.target.value))} />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums text-[#451119]">{formatDH(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function Budget() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const { data } = useQuery({ queryKey: [`/budget/${year}`], queryFn: async () => (await api.get(`/budget/${year}`)).data });
  const { data: comp } = useQuery({ queryKey: [`/budget-comparaison/${year}`], queryFn: async () => (await api.get(`/budget-comparaison/${year}`)).data });
  const [grid, setGrid] = useState(null);

  useEffect(() => { if (data) setGrid(JSON.parse(JSON.stringify(data))); }, [data]);

  const save = useMutation({
    mutationFn: async (payload) => (await api.put(`/budget/${year}`, payload)).data,
    onSuccess: () => { toast.success("Budget enregistré"); qc.invalidateQueries(); },
  });

  const onChange = (section, cat, i, val) => {
    const g = { ...grid };
    g[section][cat][i] = val;
    setGrid({ ...g });
  };

  if (!grid) return <div className="text-slate-400">Chargement...</div>;

  const caBudget = Object.values(grid.ca).flat().reduce((a, b) => a + Number(b || 0), 0);
  const depBudget = Object.values(grid.depenses).flat().reduce((a, b) => a + Number(b || 0), 0);

  const Ecart = ({ item }) => (
    <span className={item.ecart >= 0 ? "text-emerald-600" : "text-red-600"}>
      {formatDH(item.ecart)} ({item.ecart_pct}%)
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Budget prévisionnel {year}</h1>
          <p className="mt-1 text-sm text-slate-500">Grille mensuelle éditable et comparaison Réel vs Budget</p>
        </div>
        <Button data-testid="budget-save-btn" className="bg-[#A57945] hover:bg-[#451119]" onClick={() => save.mutate(grid)} disabled={save.isPending}>
          {save.isPending ? "Enregistrement..." : "Enregistrer le budget"}
        </Button>
      </div>

      <Grid title="Prévision du chiffre d'affaires par type de projet" data={grid} section="ca" onChange={onChange} />
      <Grid title="Prévision des dépenses par catégorie" data={grid} section="depenses" onChange={onChange} />

      <Card className="border-slate-200 p-6 shadow-sm">
        <h3 className="mb-1 text-lg font-medium text-[#451119]">Bénéfice prévisionnel</h3>
        <p className="text-2xl font-light text-[#451119]">{formatDH(caBudget - depBudget)}</p>
      </Card>

      {comp && (
        <Card className="overflow-hidden border-slate-200 shadow-sm" data-testid="budget-comparaison">
          <div className="border-b border-slate-100 px-5 py-3"><h3 className="font-medium text-[#451119]">Comparaison Réel vs Budget</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50">
              <th className="px-4 py-2 text-left text-xs uppercase text-slate-500">Indicateur</th>
              <th className="px-4 py-2 text-right text-xs uppercase text-slate-500">Budget</th>
              <th className="px-4 py-2 text-right text-xs uppercase text-slate-500">Réel</th>
              <th className="px-4 py-2 text-right text-xs uppercase text-slate-500">Écart</th>
            </tr></thead>
            <tbody>
              <tr className="border-t border-slate-100"><td className="px-4 py-2.5 font-medium">Chiffre d'affaires</td><td className="px-4 py-2.5 text-right tabular-nums">{formatDH(comp.ca.budget)}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatDH(comp.ca.reel)}</td><td className="px-4 py-2.5 text-right tabular-nums"><Ecart item={comp.ca} /></td></tr>
              <tr className="border-t border-slate-100"><td className="px-4 py-2.5 font-medium">Dépenses</td><td className="px-4 py-2.5 text-right tabular-nums">{formatDH(comp.depenses.budget)}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatDH(comp.depenses.reel)}</td><td className="px-4 py-2.5 text-right tabular-nums"><Ecart item={comp.depenses} /></td></tr>
              <tr className="border-t-2 border-t-[#451119] font-semibold"><td className="px-4 py-2.5 text-[#451119]">Bénéfice</td><td className="px-4 py-2.5 text-right tabular-nums">{formatDH(comp.benefice.budget)}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatDH(comp.benefice.reel)}</td><td className="px-4 py-2.5 text-right">—</td></tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
