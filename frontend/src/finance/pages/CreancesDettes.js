import { useQuery } from "@tanstack/react-query";
import { api } from "@/finance/lib/api";
import { formatDH, formatDate } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";

export default function CreancesDettes() {
  const { data } = useQuery({ queryKey: ["/creances-dettes"], queryFn: async () => (await api.get("/creances-dettes")).data });
  if (!data) return <div className="text-slate-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Créances & Dettes</h1>
        <p className="mt-1 text-sm text-slate-500">Vue consolidée des impayés</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-l-4 border-l-[#A57945] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total créances clients</p>
          <p className="mt-2 text-2xl font-light text-[#451119]">{formatDH(data.total_creances)}</p>
        </Card>
        <Card className="border-l-4 border-l-[#F97316] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total dettes fournisseurs</p>
          <p className="mt-2 text-2xl font-light text-orange-600">{formatDH(data.total_dettes)}</p>
        </Card>
      </div>

      <Card className="border-slate-200 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-[#451119]">Créances clients (factures impayées / partielles)</h3>
        <Table><TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead className="text-xs uppercase">Facture</TableHead>
          <TableHead className="text-xs uppercase">Client</TableHead>
          <TableHead className="text-xs uppercase text-right">TTC</TableHead>
          <TableHead className="text-xs uppercase text-right">Solde dû</TableHead>
          <TableHead className="text-xs uppercase">Échéance</TableHead>
          <TableHead className="text-xs uppercase text-right">Retard</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.creances.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-400">Aucune créance</TableCell></TableRow>}
          {data.creances.map((c) => (<TableRow key={c.numero}>
            <TableCell className="text-sm font-medium">{c.numero}</TableCell>
            <TableCell className="text-sm">{c.client_nom}</TableCell>
            <TableCell className="text-right text-sm tabular-nums">{formatDH(c.montant_ttc)}</TableCell>
            <TableCell className="text-right text-sm tabular-nums text-orange-600">{formatDH(c.solde_du)}</TableCell>
            <TableCell className="text-sm">{formatDate(c.date_echeance)}</TableCell>
            <TableCell className="text-right text-sm">{c.jours_retard > 0 ? <span className="font-semibold text-red-600">{c.jours_retard} j</span> : "—"}</TableCell>
          </TableRow>))}
        </TableBody></Table>
      </Card>

      <Card className="border-slate-200 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-[#451119]">Dettes fournisseurs (dépenses impayées)</h3>
        <Table><TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead className="text-xs uppercase">Date</TableHead>
          <TableHead className="text-xs uppercase">Fournisseur</TableHead>
          <TableHead className="text-xs uppercase">Catégorie</TableHead>
          <TableHead className="text-xs uppercase text-right">TTC</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.dettes.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-400">Aucune dette</TableCell></TableRow>}
          {data.dettes.map((d, i) => (<TableRow key={i}>
            <TableCell className="text-sm">{formatDate(d.date)}</TableCell>
            <TableCell className="text-sm">{d.fournisseur || "—"}</TableCell>
            <TableCell className="text-sm">{d.categorie}</TableCell>
            <TableCell className="text-right text-sm tabular-nums text-orange-600">{formatDH(d.montant_ttc)}</TableCell>
          </TableRow>))}
        </TableBody></Table>
      </Card>
    </div>
  );
}
