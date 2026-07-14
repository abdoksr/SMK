import { Badge } from "@/shared/components/ui/badge";

const MAP = {
  // factures
  "Payée": "green", "Impayée": "red", "Partiellement payée": "orange",
  // devis
  "Accepté": "green", "Refusé": "red", "En attente": "orange",
  // projets
  "En cours": "blue", "Terminé": "green", "En pause": "orange", "Annulé": "red",
  // invest
  "Totalement amorti": "gray", "En cours d'amortissement": "blue",
  // relances
  "1ère relance": "orange", "2ème relance": "orange", "Mise en demeure": "red",
};

const STYLES = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  gray: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusBadge({ value }) {
  const color = MAP[value] || "gray";
  return (
    <Badge
      variant="outline"
      data-testid={`status-${String(value).toLowerCase().replace(/\s+/g, "-")}`}
      className={`font-medium ${STYLES[color]}`}
    >
      {value}
    </Badge>
  );
}
