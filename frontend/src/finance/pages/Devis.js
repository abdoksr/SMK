import { useQuery } from "@tanstack/react-query";
import { CrudManager } from "@/finance/components/CrudManager";
import { useRefData } from "@/finance/hooks/useRefData";
import { StatusBadge } from "@/finance/components/StatusBadge";
import { api } from "@/finance/lib/api";
import { formatDH, formatDate, STATUTS_DEVIS } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";

export default function Devis() {
  const { clientOptions, projectOptions } = useRefData();
  const { data: devis = [] } = useQuery({ queryKey: ["/devis"], queryFn: async () => (await api.get("/devis")).data });

  const accepted = devis.filter((d) => d.statut === "Accepté").length;
  const refused = devis.filter((d) => d.statut === "Refusé").length;
  const decided = accepted + refused;
  const taux = decided > 0 ? Math.round((accepted / decided) * 100) : 0;

  const columns = [
    { key: "numero", label: "N° Devis", render: (r) => <span className="font-medium text-[#451119]">{r.numero}</span> },
    { key: "date", label: "Date", render: (r) => formatDate(r.date) },
    { key: "client_nom", label: "Client" },
    { key: "objet", label: "Objet" },
    { key: "montant_ht", label: "HT", align: "right", render: (r) => formatDH(r.montant_ht) },
    { key: "montant_ttc", label: "TTC", align: "right", render: (r) => formatDH(r.montant_ttc) },
    { key: "statut", label: "Statut", render: (r) => <StatusBadge value={r.statut} /> },
  ];

  const fields = [
    { name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
    { name: "statut", label: "Statut", type: "select", options: STATUTS_DEVIS, colSpan: 1 },
    { name: "client_id", label: "Client", type: "select", options: clientOptions, required: true, colSpan: 2 },
    { name: "project_id", label: "Projet", type: "select", options: projectOptions, colSpan: 2 },
    { name: "objet", label: "Objet", type: "text", colSpan: 2 },
    { name: "montant_ht", label: "Montant HT (DH)", type: "number", step: "0.01", colSpan: 1 },
    { name: "tva_pct", label: "TVA (%)", type: "number", step: "0.01", colSpan: 1 },
    { name: "date_reponse", label: "Date de réponse", type: "date", colSpan: 2 },
  ];

  return (
    <div className="space-y-6">
      <Card data-testid="devis-transformation" className="border-l-4 border-l-[#A57945] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taux de transformation</p>
            <p className="mt-1 text-3xl font-light text-[#451119]">{taux} %</p>
          </div>
          <div className="text-sm text-slate-600">
            <p><span className="font-semibold text-emerald-600">{accepted}</span> acceptés · <span className="font-semibold text-red-600">{refused}</span> refusés</p>
            <p className="text-slate-400">{devis.length} devis au total</p>
          </div>
        </div>
      </Card>

      <CrudManager title="Devis" subtitle="Numérotation automatique DEV-AAAA-001" endpoint="/devis"
        testid="devis" columns={columns} fields={fields}
        initialValues={{ statut: "En attente", tva_pct: 20 }} />
    </div>
  );
}
