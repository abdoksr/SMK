export function formatDH(value) {
  const n = Number(value || 0);
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} DH`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatDate(str) {
  if (!str) return "—";
  try {
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return str;
  }
}

export const CATEGORIES_DEPENSES = ["Salaires", "Fournisseurs", "Logiciels", "Marketing", "Déplacements", "Charges diverses"];
export const TYPES_PROJET = ["Architecture", "Urbanisme", "Architecture d'intérieur"];
export const STATUTS_PROJET = ["En cours", "Terminé", "En pause", "Annulé"];
export const STATUTS_DEVIS = ["En attente", "Accepté", "Refusé"];
export const TYPES_FACTURE = ["Facture d'acompte", "Facture finale", "Facture unique"];
export const MODES_PAIEMENT = ["Virement", "Chèque", "Espèces", "Carte bancaire", "Effet"];
export const STATUTS_PAIEMENT_DEP = ["Payée", "Impayée"];
export const CATEGORIES_INVEST = ["Matériel informatique", "Logiciels", "Mobilier", "Véhicules"];
export const NONE_VALUE = "__none__";
