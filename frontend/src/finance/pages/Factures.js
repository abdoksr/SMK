import { CrudManager } from "@/finance/components/CrudManager";
import { useRefData } from "@/finance/hooks/useRefData";
import { StatusBadge } from "@/finance/components/StatusBadge";
import { formatDH, formatDate, TYPES_FACTURE } from "@/finance/lib/format";
import { AlertTriangle } from "lucide-react";

export default function Factures() {
  const { clientOptions, projectOptions } = useRefData();

  const columns = [
    { key: "numero", label: "N° Facture", render: (r) => <span className="font-medium text-[#451119]">{r.numero}</span> },
    { key: "date_emission", label: "Émission", render: (r) => formatDate(r.date_emission) },
    { key: "client_nom", label: "Client" },
    { key: "montant_ttc", label: "TTC", align: "right", render: (r) => formatDH(r.montant_ttc) },
    { key: "montant_encaisse", label: "Encaissé", align: "right", render: (r) => formatDH(r.montant_encaisse) },
    { key: "solde_du", label: "Solde dû", align: "right", render: (r) => formatDH(r.solde_du) },
    { key: "date_echeance", label: "Échéance", render: (r) => formatDate(r.date_echeance) },
    { key: "statut", label: "Statut", render: (r) => (
      <div className="flex flex-col gap-1">
        <StatusBadge value={r.statut} />
        {r.en_retard && (
          <span data-testid="facture-retard" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
            <AlertTriangle className="h-3 w-3" /> ⚠ RETARD {r.jours_retard}j
          </span>
        )}
      </div>
    )},
  ];

  const fields = [
    { name: "date_emission", label: "Date d'émission", type: "date", required: true, colSpan: 1 },
    { name: "date_echeance", label: "Date d'échéance", type: "date", colSpan: 1 },
    { name: "client_id", label: "Client", type: "select", options: clientOptions, required: true, colSpan: 2 },
    { name: "project_id", label: "Projet", type: "select", options: projectOptions, colSpan: 2 },
    { name: "type_facture", label: "Type de facture", type: "select", options: TYPES_FACTURE, colSpan: 2 },
    { name: "montant_ht", label: "Montant HT (DH)", type: "number", step: "0.01", colSpan: 1 },
    { name: "tva_pct", label: "TVA (%)", type: "number", step: "0.01", colSpan: 1 },
  ];

  return <CrudManager title="Factures" subtitle="Statut et retards calculés automatiquement — FA-AAAA-001" endpoint="/factures"
    testid="factures" columns={columns} fields={fields}
    initialValues={{ type_facture: "Facture unique", tva_pct: 20 }} />;
}
