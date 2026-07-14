import { CrudManager } from "@/finance/components/CrudManager";
import { useRefData } from "@/finance/hooks/useRefData";
import { StatusBadge } from "@/finance/components/StatusBadge";
import { formatDH, formatDate, CATEGORIES_DEPENSES, MODES_PAIEMENT, STATUTS_PAIEMENT_DEP } from "@/finance/lib/format";

export default function Depenses() {
  const { projectOptions } = useRefData();

  const columns = [
    { key: "date", label: "Date", render: (r) => formatDate(r.date) },
    { key: "categorie", label: "Catégorie" },
    { key: "fournisseur", label: "Fournisseur" },
    { key: "description", label: "Description" },
    { key: "project_nom", label: "Projet" },
    { key: "montant_ht", label: "HT", align: "right", render: (r) => formatDH(r.montant_ht) },
    { key: "montant_ttc", label: "TTC", align: "right", render: (r) => formatDH(r.montant_ttc) },
    { key: "statut_paiement", label: "Statut", render: (r) => <StatusBadge value={r.statut_paiement} /> },
  ];

  const fields = [
    { name: "date", label: "Date", type: "date", required: true, colSpan: 1 },
    { name: "categorie", label: "Catégorie", type: "select", options: CATEGORIES_DEPENSES, colSpan: 1 },
    { name: "fournisseur", label: "Fournisseur / Bénéficiaire", type: "text", colSpan: 2 },
    { name: "description", label: "Description", type: "text", colSpan: 2 },
    { name: "project_id", label: "Projet lié (optionnel)", type: "select", options: projectOptions, colSpan: 2 },
    { name: "montant_ht", label: "Montant HT (DH)", type: "number", step: "0.01", colSpan: 1 },
    { name: "tva_pct", label: "TVA (%)", type: "number", step: "0.01", colSpan: 1 },
    { name: "mode_paiement", label: "Mode de paiement", type: "select", options: MODES_PAIEMENT, colSpan: 1 },
    { name: "statut_paiement", label: "Statut de paiement", type: "select", options: STATUTS_PAIEMENT_DEP, colSpan: 1 },
  ];

  return <CrudManager title="Dépenses" subtitle="Charges et décaissements du cabinet" endpoint="/depenses"
    testid="depenses" columns={columns} fields={fields}
    initialValues={{ categorie: "Fournisseurs", tva_pct: 20, mode_paiement: "Virement", statut_paiement: "Payée" }} />;
}
