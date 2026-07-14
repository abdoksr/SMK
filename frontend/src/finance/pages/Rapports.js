import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/finance/lib/api";
import { formatDH } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function Rapports() {
  const now = new Date();
  const [periode, setPeriode] = useState("mensuel");
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [downloading, setDownloading] = useState(false);

  const { data } = useQuery({
    queryKey: ["/rapports", periode, mois, annee],
    queryFn: async () => (await api.get(`/rapports?periode=${periode}&mois=${mois}&annee=${annee}`)).data,
  });

  const exportPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/rapports/pdf?periode=${periode}&mois=${mois}&annee=${annee}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${periode}_${annee}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Rapport PDF téléchargé");
    } catch (e) {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setDownloading(false);
    }
  };

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const cards = data ? [
    { label: "Chiffre d'affaires (HT)", value: formatDH(data.chiffre_affaires), accent: "#A57945" },
    { label: "Dépenses (TTC)", value: formatDH(data.depenses), accent: "#F97316" },
    { label: "Bénéfice net", value: formatDH(data.benefice), accent: "#A57945" },
    { label: "Montant encaissé", value: formatDH(data.encaisse), accent: "#10B981" },
    { label: "Nombre de factures", value: data.nb_factures, accent: "#451119" },
    { label: "Créances à encaisser", value: formatDH(data.a_encaisser), accent: "#A57945" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Rapports automatiques</h1>
        <p className="mt-1 text-sm text-slate-500">Synthèse mensuelle, trimestrielle et annuelle</p>
      </div>

      <Card className="flex flex-wrap items-end gap-4 border-slate-200 p-5 shadow-sm">
        <div className="w-44">
          <label className="text-xs font-medium text-slate-600">Période</label>
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger data-testid="rapport-periode" className="mt-1 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mensuel">Mensuel</SelectItem>
              <SelectItem value="trimestriel">Trimestriel</SelectItem>
              <SelectItem value="annuel">Annuel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periode !== "annuel" && (
          <div className="w-44">
            <label className="text-xs font-medium text-slate-600">Mois</label>
            <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
              <SelectTrigger data-testid="rapport-mois" className="mt-1 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="w-32">
          <label className="text-xs font-medium text-slate-600">Année</label>
          <Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
            <SelectTrigger data-testid="rapport-annee" className="mt-1 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button data-testid="export-pdf-btn" onClick={exportPdf} disabled={downloading} className="ml-auto bg-[#A57945] hover:bg-[#451119]">
          <FileDown className="mr-2 h-4 w-4" /> {downloading ? "Génération..." : "Exporter en PDF"}
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-l-4 p-5 shadow-sm" style={{ borderLeftColor: c.accent }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className="mt-2 text-2xl font-light text-[#451119]">{c.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
