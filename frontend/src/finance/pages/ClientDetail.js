import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, Hash } from "lucide-react";
import { api } from "@/finance/lib/api";
import { formatDH, formatDate } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import { StatusBadge } from "@/finance/components/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";

export default function ClientDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["/clients", id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  });

  if (isLoading || !data) return <div className="text-slate-400">Chargement...</div>;
  const { client, projets, factures, paiements } = data;

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center text-sm text-slate-500 hover:text-[#A57945]">
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux clients
      </Link>

      <Card className="border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#451119]" data-testid="client-detail-name">{client.raison_sociale}</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-4">
          <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{client.telephone || "—"}</span>
          <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{client.email || "—"}</span>
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{client.ville || "—"}</span>
          <span className="flex items-center gap-2"><Hash className="h-4 w-4 text-slate-400" />ICE {client.ice || "—"}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-slate-200 p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-lg font-medium text-[#451119]">Projets ({projets.length})</h3>
          <div className="space-y-3">
            {projets.length === 0 && <p className="text-sm text-slate-400">Aucun projet</p>}
            {projets.map((p) => (
              <div key={p.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.nom}</span>
                  <StatusBadge value={p.statut} />
                </div>
                <p className="mt-1 text-xs text-slate-400">{p.type_projet}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-slate-200 p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-lg font-medium text-[#451119]">Factures</h3>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs uppercase">Numéro</TableHead>
                <TableHead className="text-xs uppercase text-right">TTC</TableHead>
                <TableHead className="text-xs uppercase text-right">Solde dû</TableHead>
                <TableHead className="text-xs uppercase">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factures.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-slate-400">Aucune facture</TableCell></TableRow>}
              {factures.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm font-medium">{f.numero}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatDH(f.montant_ttc)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatDH(f.solde_du)}</TableCell>
                  <TableCell><StatusBadge value={f.statut} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h3 className="mb-3 mt-6 text-lg font-medium text-[#451119]">Paiements</h3>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs uppercase">Date</TableHead>
                <TableHead className="text-xs uppercase">Mode</TableHead>
                <TableHead className="text-xs uppercase text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.length === 0 && <TableRow><TableCell colSpan={3} className="py-6 text-center text-slate-400">Aucun paiement</TableCell></TableRow>}
              {paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                  <TableCell className="text-sm">{p.mode_paiement}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-emerald-600">{formatDH(p.montant)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
