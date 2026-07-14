import { useQuery } from "@tanstack/react-query";
import { api } from "@/finance/lib/api";
import { formatDH } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";

function Row({ label, value, bold, negative }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-2.5 ${bold ? "border-t-2 border-t-[#451119] font-semibold" : ""}`}>
      <span className={bold ? "text-[#451119]" : "text-slate-600"}>{label}</span>
      <span className={`tabular-nums ${negative && value < 0 ? "text-red-600" : bold ? "text-[#451119]" : "text-slate-800"}`}>{formatDH(value)}</span>
    </div>
  );
}

export default function Comptabilite() {
  const year = new Date().getFullYear();
  const { data } = useQuery({ queryKey: ["/comptabilite"], queryFn: async () => (await api.get("/comptabilite")).data });
  if (!data) return <div className="text-slate-400">Chargement...</div>;
  const r = data.resultat;
  const b = data.bilan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Comptabilité simplifiée</h1>
        <p className="mt-1 text-sm text-slate-500">Exercice {year}</p>
      </div>

      <Tabs defaultValue="resultat">
        <TabsList>
          <TabsTrigger value="resultat" data-testid="tab-resultat">Compte de résultat</TabsTrigger>
          <TabsTrigger value="bilan" data-testid="tab-bilan">Bilan</TabsTrigger>
          <TabsTrigger value="journaux" data-testid="tab-journaux">Journaux</TabsTrigger>
        </TabsList>

        <TabsContent value="resultat" className="mt-6">
          <Card className="max-w-2xl border-slate-200 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-[#451119]">Compte de résultat simplifié</h3>
            <Row label="Chiffre d'affaires" value={r.chiffre_affaires} />
            <Row label="− Charges externes" value={-r.charges_externes} />
            <Row label="− Charges de personnel" value={-r.charges_personnel} />
            <Row label="− Charges diverses" value={-r.charges_diverses} />
            <Row label="− Dotations aux amortissements" value={-r.dotations_amortissements} />
            <Row label="= Résultat net" value={r.resultat_net} bold negative />
          </Card>
        </TabsContent>

        <TabsContent value="bilan" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-slate-200 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-[#451119]">Actif</h3>
              <Row label="Trésorerie" value={b.actif.tresorerie} />
              <Row label="Créances clients" value={b.actif.creances_clients} />
              <Row label="Immobilisations nettes" value={b.actif.immobilisations_nettes} />
              <Row label="Total Actif" value={b.actif.total} bold />
            </Card>
            <Card className="border-slate-200 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-[#451119]">Passif</h3>
              <Row label="Dettes fournisseurs" value={b.passif.dettes_fournisseurs} />
              <Row label="Capitaux propres + résultat" value={b.passif.capitaux_propres_resultat} />
              <Row label="Total Passif" value={b.passif.total} bold />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journaux" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-slate-200 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-[#451119]">Journal des recettes</h3>
              <Table><TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs uppercase">Mois</TableHead>
                <TableHead className="text-xs uppercase text-right">Recettes</TableHead>
              </TableRow></TableHeader><TableBody>
                {data.recettes.map((x) => (<TableRow key={x.mois}><TableCell className="text-sm">{x.mois}</TableCell><TableCell className="text-right text-sm tabular-nums text-emerald-600">{formatDH(x.montant)}</TableCell></TableRow>))}
              </TableBody></Table>
            </Card>
            <Card className="border-slate-200 p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-[#451119]">Journal des dépenses</h3>
              <Table><TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs uppercase">Mois</TableHead>
                <TableHead className="text-xs uppercase text-right">Dépenses</TableHead>
              </TableRow></TableHeader><TableBody>
                {data.depenses_journal.map((x) => (<TableRow key={x.mois}><TableCell className="text-sm">{x.mois}</TableCell><TableCell className="text-right text-sm tabular-nums text-orange-600">{formatDH(x.montant)}</TableCell></TableRow>))}
              </TableBody></Table>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
