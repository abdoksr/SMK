import { useQuery } from "@tanstack/react-query";
import { api } from "@/finance/lib/api";
import { NONE_VALUE } from "@/finance/lib/format";

export function useRefData() {
  const { data: clients = [] } = useQuery({ queryKey: ["/clients"], queryFn: async () => (await api.get("/clients")).data });
  const { data: projects = [] } = useQuery({ queryKey: ["/projects"], queryFn: async () => (await api.get("/projects")).data });
  const { data: factures = [] } = useQuery({ queryKey: ["/factures"], queryFn: async () => (await api.get("/factures")).data });

  return {
    clientOptions: clients.map((c) => ({ value: c.id, label: c.raison_sociale })),
    projectOptions: [{ value: NONE_VALUE, label: "— Aucun —" }, ...projects.map((p) => ({ value: p.id, label: p.nom }))],
    factureOptions: factures.map((f) => ({ value: f.id, label: `${f.numero} — ${f.client_nom} (${f.solde_du.toLocaleString("fr-FR")} DH dû)` })),
  };
}
