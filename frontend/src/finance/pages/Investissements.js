import { CrudManager } from "@/finance/components/CrudManager";
import { StatusBadge } from "@/finance/components/StatusBadge";
import { formatDH, formatDate, CATEGORIES_INVEST } from "@/finance/lib/format";

export default function Investissements() {
  const columns = [
    { key: "designation", label: "Désignation", render: (r) => <span className="font-medium text-[#451119]">{r.designation}</span> },
    { key: "categorie", label: "Catégorie" },
    { key: "date_acquisition", label: "Acquisition", render: (r) => formatDate(r.date_acquisition) },
    { key: "valeur_ht", label: "Valeur HT", align: "right", render: (r) => formatDH(r.valeur_ht) },
    { key: "duree_annees", label: "Durée", align: "right", render: (r) => `${r.duree_annees} ans` },
    { key: "amort_annuel", label: "Amort./an", align: "right", render: (r) => formatDH(r.amort_annuel) },
    { key: "amort_cumule", label: "Amort. cumulé", align: "right", render: (r) => formatDH(r.amort_cumule) },
    { key: "vnc", label: "VNC", align: "right", render: (r) => <span className="font-medium">{formatDH(r.vnc)}</span> },
    { key: "statut", label: "Statut", render: (r) => <StatusBadge value={r.statut} /> },
  ];

  const fields = [
    { name: "designation", label: "Désignation", type: "text", required: true, colSpan: 2 },
    { name: "categorie", label: "Catégorie", type: "select", options: CATEGORIES_INVEST, colSpan: 1 },
    { name: "date_acquisition", label: "Date d'acquisition", type: "date", required: true, colSpan: 1 },
    { name: "valeur_ht", label: "Valeur d'acquisition HT (DH)", type: "number", step: "0.01", colSpan: 1 },
    { name: "duree_annees", label: "Durée d'amortissement (années)", type: "number", colSpan: 1 },
  ];

  return <CrudManager title="Investissements & Amortissements" subtitle="Amortissement linéaire" endpoint="/investissements"
    testid="investissements" columns={columns} fields={fields}
    initialValues={{ categorie: "Matériel informatique", duree_annees: 5 }} />;
}
