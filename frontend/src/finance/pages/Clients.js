import { Link } from "react-router-dom";
import { CrudManager } from "@/finance/components/CrudManager";
import { formatDH } from "@/finance/lib/format";

export default function Clients() {
  const columns = [
    { key: "raison_sociale", label: "Raison sociale", render: (r) => (
      <Link to={`/clients/${r.id}`} data-testid="client-detail-link" className="font-medium text-[#A57945] hover:underline">{r.raison_sociale}</Link>
    )},
    { key: "contact", label: "Contact" },
    { key: "ville", label: "Ville" },
    { key: "ice", label: "ICE" },
    { key: "nb_projets", label: "Projets", align: "right" },
    { key: "total_facture_ttc", label: "Facturé TTC", align: "right", render: (r) => formatDH(r.total_facture_ttc) },
    { key: "solde_du", label: "Solde dû", align: "right", render: (r) => (
      <span className={r.solde_du > 0 ? "font-medium text-orange-600" : "text-slate-600"}>{formatDH(r.solde_du)}</span>
    )},
  ];

  const fields = [
    { name: "raison_sociale", label: "Raison sociale", type: "text", required: true, colSpan: 2 },
    { name: "contact", label: "Contact", type: "text", colSpan: 1 },
    { name: "telephone", label: "Téléphone", type: "text", colSpan: 1 },
    { name: "email", label: "Email", type: "text", colSpan: 1 },
    { name: "ice", label: "ICE", type: "text", colSpan: 1 },
    { name: "adresse", label: "Adresse", type: "text", colSpan: 2 },
    { name: "ville", label: "Ville", type: "text", colSpan: 1 },
  ];

  return <CrudManager title="Clients" subtitle="Gestion du portefeuille clients" endpoint="/clients"
    testid="clients" columns={columns} fields={fields} />;
}
