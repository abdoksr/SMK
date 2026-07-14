import { useQuery } from "@tanstack/react-query";
import { Mail, CalendarClock } from "lucide-react";
import { CrudManager } from "@/finance/components/CrudManager";
import { useRefData } from "@/finance/hooks/useRefData";
import { StatusBadge } from "@/finance/components/StatusBadge";
import { api } from "@/finance/lib/api";
import { formatDH, formatDate, MODES_PAIEMENT } from "@/finance/lib/format";
import { COMPANY_NAME } from "@/finance/lib/company";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";

function Relances() {
  const { data: relances = [] } = useQuery({ queryKey: ["/relances"], queryFn: async () => (await api.get("/relances")).data });

  const sendReminder = (r) => {
    const subject = encodeURIComponent(`Rappel de paiement — Facture ${r.numero}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nSauf erreur de notre part, la facture ${r.numero} d'un montant de ${formatDH(r.solde_du)} reste impayée (échéance dépassée de ${r.jours_retard} jours).\n\nNous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais.\n\nCordialement,\n${COMPANY_NAME}`
    );
    window.location.href = `mailto:${r.client_email || ""}?subject=${subject}&body=${body}`;
  };

  return (
    <Card className="border-slate-200 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-medium text-[#451119]">Relances clients ({relances.length})</h3>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="text-xs uppercase">Facture</TableHead>
            <TableHead className="text-xs uppercase">Client</TableHead>
            <TableHead className="text-xs uppercase text-right">Solde dû</TableHead>
            <TableHead className="text-xs uppercase text-right">Retard</TableHead>
            <TableHead className="text-xs uppercase">Niveau</TableHead>
            <TableHead className="text-xs uppercase text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {relances.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-400">Aucune relance nécessaire</TableCell></TableRow>}
          {relances.map((r) => (
            <TableRow key={r.facture_id} data-testid="relance-row">
              <TableCell className="text-sm font-medium">{r.numero}</TableCell>
              <TableCell className="text-sm">{r.client_nom}</TableCell>
              <TableCell className="text-right text-sm tabular-nums text-orange-600">{formatDH(r.solde_du)}</TableCell>
              <TableCell className="text-right text-sm">{r.jours_retard} j</TableCell>
              <TableCell><StatusBadge value={r.niveau} /></TableCell>
              <TableCell className="text-right">
                <Button data-testid="send-reminder-btn" size="sm" variant="outline" onClick={() => sendReminder(r)}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Envoyer un rappel
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function Echeancier() {
  const { data: factures = [] } = useQuery({ queryKey: ["/factures"], queryFn: async () => (await api.get("/factures")).data });
  const items = factures.filter((f) => f.solde_du > 0.01 && f.date_echeance)
    .sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance));

  return (
    <Card className="border-slate-200 p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-[#451119]"><CalendarClock className="h-5 w-5" /> Échéancier de paiement</h3>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="text-xs uppercase">Échéance</TableHead>
            <TableHead className="text-xs uppercase">Facture</TableHead>
            <TableHead className="text-xs uppercase">Client</TableHead>
            <TableHead className="text-xs uppercase text-right">Solde dû</TableHead>
            <TableHead className="text-xs uppercase">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-400">Aucune échéance à venir</TableCell></TableRow>}
          {items.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="text-sm font-medium">{formatDate(f.date_echeance)}</TableCell>
              <TableCell className="text-sm">{f.numero}</TableCell>
              <TableCell className="text-sm">{f.client_nom}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{formatDH(f.solde_du)}</TableCell>
              <TableCell>{f.en_retard ? <span className="text-xs font-semibold text-red-600">⚠ Retard {f.jours_retard}j</span> : <span className="text-xs text-slate-400">À venir</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function Paiements() {
  const { factureOptions } = useRefData();

  const columns = [
    { key: "date", label: "Date", render: (r) => formatDate(r.date) },
    { key: "facture_numero", label: "Facture" },
    { key: "client_nom", label: "Client" },
    { key: "montant", label: "Montant reçu", align: "right", render: (r) => <span className="font-medium text-emerald-600">{formatDH(r.montant)}</span> },
    { key: "mode_paiement", label: "Mode" },
    { key: "banque", label: "Banque / Caisse" },
  ];

  const fields = [
    { name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
    { name: "montant", label: "Montant reçu (DH)", type: "number", step: "0.01", required: true, colSpan: 1 },
    { name: "facture_id", label: "Facture", type: "select", options: factureOptions, required: true, colSpan: 2 },
    { name: "mode_paiement", label: "Mode de paiement", type: "select", options: MODES_PAIEMENT, colSpan: 1 },
    { name: "banque", label: "Banque / Caisse", type: "text", colSpan: 1 },
    { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Paiements</h1>
        <p className="mt-1 text-sm text-slate-500">Encaissements, relances et échéancier</p>
      </div>
      <Tabs defaultValue="paiements">
        <TabsList data-testid="paiements-tabs">
          <TabsTrigger value="paiements" data-testid="tab-paiements">Paiements</TabsTrigger>
          <TabsTrigger value="relances" data-testid="tab-relances">Relances clients</TabsTrigger>
          <TabsTrigger value="echeancier" data-testid="tab-echeancier">Échéancier</TabsTrigger>
        </TabsList>
        <TabsContent value="paiements" className="mt-6">
          <CrudManager title="Paiements reçus" endpoint="/paiements" testid="paiements"
            columns={columns} fields={fields} initialValues={{ mode_paiement: "Virement" }} />
        </TabsContent>
        <TabsContent value="relances" className="mt-6"><Relances /></TabsContent>
        <TabsContent value="echeancier" className="mt-6"><Echeancier /></TabsContent>
      </Tabs>
    </div>
  );
}
