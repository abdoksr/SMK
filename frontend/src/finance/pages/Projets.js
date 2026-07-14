import { CrudManager } from "@/finance/components/CrudManager";
import { useRefData } from "@/finance/hooks/useRefData";
import { StatusBadge } from "@/finance/components/StatusBadge";
import { formatDH, formatDate, TYPES_PROJET, STATUTS_PROJET } from "@/finance/lib/format";
import { AlertTriangle } from "lucide-react";

export default function Projets() {
  const { clientOptions } = useRefData();

  const columns = [
    { key: "nom", label: "Projet", render: (r) => <span className="font-medium text-[#451119]">{r.nom}</span> },
    { key: "client_nom", label: "Client" },
    { key: "type_projet", label: "Type" },
    { key: "statut", label: "Statut", render: (r) => <StatusBadge value={r.statut} /> },
    { key: "budget_previsionnel", label: "Budget", align: "right", render: (r) => formatDH(r.budget_previsionnel) },
    { key: "ca_facture", label: "CA facturé", align: "right", render: (r) => formatDH(r.ca_facture) },
    { key: "cout_ht", label: "Coût réel", align: "right", render: (r) => formatDH(r.cout_ht) },
    { key: "marge", label: "Marge", align: "right", render: (r) => {
      const low = r.marge < 0 || r.marge_pct < 15;
      return (
        <span className={`inline-flex items-center gap-1 font-medium ${r.marge < 0 ? "text-red-600" : low ? "text-orange-600" : "text-emerald-600"}`}>
          {low && <AlertTriangle className="h-3.5 w-3.5" />}
          {formatDH(r.marge)} ({r.marge_pct}%)
        </span>
      );
    }},
  ];

  const fields = [
    { name: "nom", label: "Nom du projet", type: "text", required: true, colSpan: 2 },
    { name: "client_id", label: "Client", type: "select", options: clientOptions, required: true, colSpan: 2 },
    { name: "type_projet", label: "Type de projet", type: "select", options: TYPES_PROJET, colSpan: 1 },
    { name: "statut", label: "Statut", type: "select", options: STATUTS_PROJET, colSpan: 1 },
    { name: "date_debut", label: "Date de début", type: "date", colSpan: 1 },
    { name: "date_fin_prevue", label: "Date de fin prévue", type: "date", colSpan: 1 },
    { name: "budget_previsionnel", label: "Budget prévisionnel (DH)", type: "number", step: "0.01", colSpan: 2 },
  ];

  return <CrudManager title="Projets" subtitle="Suivi de la rentabilité par projet" endpoint="/projects"
    testid="projets" columns={columns} fields={fields}
    initialValues={{ type_projet: "Architecture", statut: "En cours" }} />;
}
