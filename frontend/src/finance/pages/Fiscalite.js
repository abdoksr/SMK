import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { api } from "@/finance/lib/api";
import { formatDH } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";

const SETTING_FIELDS = [
  { name: "is_tranche1_max", label: "IS — plafond tranche 1 (DH)" },
  { name: "is_tranche1_taux", label: "IS — taux tranche 1 (%)" },
  { name: "is_tranche2_max", label: "IS — plafond tranche 2 (DH)" },
  { name: "is_tranche2_taux", label: "IS — taux tranche 2 (%)" },
  { name: "is_tranche3_taux", label: "IS — taux tranche 3 (%)" },
  { name: "cnss_salariale", label: "CNSS part salariale (%)" },
  { name: "cnss_patronale", label: "CNSS part patronale (%)" },
  { name: "amo_patronale", label: "AMO patronale (%)" },
  { name: "taxe_formation", label: "Taxe formation prof. (%)" },
  { name: "masse_salariale_annuelle", label: "Masse salariale annuelle (DH)" },
];

export default function Fiscalite() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["/fiscalite"], queryFn: async () => (await api.get("/fiscalite")).data });
  const [settings, setSettings] = useState({});

  useEffect(() => { if (data?.settings) setSettings(data.settings); }, [data]);

  const save = useMutation({
    mutationFn: async (payload) => (await api.put("/settings", payload)).data,
    onSuccess: () => { toast.success("Taux mis à jour"); qc.invalidateQueries(); },
  });

  if (!data) return <div className="text-slate-400">Chargement...</div>;
  const cs = data.charges_sociales;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Fiscalité marocaine</h1>
        <p className="mt-1 text-sm text-slate-500">TVA, Impôt sur les Sociétés (IS) et charges sociales</p>
      </div>

      <Card className="flex items-center gap-3 border-l-4 border-l-[#A57945] bg-amber-50 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[#A57945]" />
        <p className="text-sm text-amber-800">Ces taux sont des <strong>estimations</strong> à ajuster selon le barème fiscal en vigueur (DGI). Modifiez-les dans l'onglet Paramètres.</p>
      </Card>

      <Tabs defaultValue="tva">
        <TabsList>
          <TabsTrigger value="tva" data-testid="tab-tva">TVA</TabsTrigger>
          <TabsTrigger value="is" data-testid="tab-is">IS</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Charges sociales</TabsTrigger>
          <TabsTrigger value="params" data-testid="tab-params">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="tva" className="mt-6">
          <Card className="border-slate-200 p-6 shadow-sm">
            <Table><TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs uppercase">Mois</TableHead>
              <TableHead className="text-xs uppercase text-right">TVA collectée</TableHead>
              <TableHead className="text-xs uppercase text-right">TVA déductible</TableHead>
              <TableHead className="text-xs uppercase text-right">TVA due</TableHead>
            </TableRow></TableHeader><TableBody>
              {data.tva.rows.map((x) => (<TableRow key={x.mois}>
                <TableCell className="text-sm">{x.mois}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatDH(x.collectee)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatDH(x.deductible)}</TableCell>
                <TableCell className={`text-right text-sm tabular-nums ${x.due < 0 ? "text-emerald-600" : ""}`}>{formatDH(x.due)}</TableCell>
              </TableRow>))}
              <TableRow className="border-t-2 border-t-[#451119] font-semibold">
                <TableCell className="text-sm text-[#451119]">Total annuel</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatDH(data.tva.total_collectee)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{formatDH(data.tva.total_deductible)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-[#451119]">{formatDH(data.tva.total_due)}</TableCell>
              </TableRow>
            </TableBody></Table>
          </Card>
        </TabsContent>

        <TabsContent value="is" className="mt-6">
          <Card className="max-w-xl border-slate-200 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-[#451119]">Impôt sur les Sociétés (barème progressif)</h3>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">Résultat net imposable</span><span className="tabular-nums">{formatDH(data.is.resultat_net)}</span></div>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">Taux effectif</span><span className="tabular-nums">{data.is.taux_effectif} %</span></div>
            <div className="flex justify-between border-t-2 border-t-[#451119] py-2.5 font-semibold text-[#451119]"><span>IS estimé</span><span data-testid="is-montant" className="tabular-nums">{formatDH(data.is.montant)}</span></div>
            <p className="mt-3 text-xs text-slate-400">Barème : {settings.is_tranche1_taux}% jusqu'à {formatDH(settings.is_tranche1_max)}, {settings.is_tranche2_taux}% jusqu'à {formatDH(settings.is_tranche2_max)}, {settings.is_tranche3_taux}% au-delà.</p>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <Card className="max-w-xl border-slate-200 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-[#451119]">Charges sociales annuelles</h3>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">Masse salariale annuelle</span><span className="tabular-nums">{formatDH(cs.masse_salariale)}</span></div>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">CNSS part salariale</span><span className="tabular-nums">{formatDH(cs.cnss_salariale)}</span></div>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">CNSS part patronale</span><span className="tabular-nums">{formatDH(cs.cnss_patronale)}</span></div>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">AMO patronale</span><span className="tabular-nums">{formatDH(cs.amo_patronale)}</span></div>
            <div className="flex justify-between border-b border-slate-100 py-2.5"><span className="text-slate-600">Taxe formation professionnelle</span><span className="tabular-nums">{formatDH(cs.taxe_formation)}</span></div>
            <div className="flex justify-between border-t-2 border-t-[#451119] py-2.5 font-semibold text-[#451119]"><span>Total charges patronales</span><span className="tabular-nums">{formatDH(cs.total_patronal)}</span></div>
          </Card>
        </TabsContent>

        <TabsContent value="params" className="mt-6">
          <Card className="max-w-2xl border-slate-200 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-[#451119]">Paramètres fiscaux (modifiables)</h3>
            <div className="grid grid-cols-2 gap-4">
              {SETTING_FIELDS.map((f) => (
                <div key={f.name}>
                  <Label className="text-xs text-slate-600">{f.label}</Label>
                  <Input data-testid={`setting-${f.name}`} type="number" step="0.01" className="mt-1 bg-white"
                    value={settings[f.name] ?? ""} onChange={(e) => setSettings({ ...settings, [f.name]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <Button data-testid="save-settings-btn" className="mt-5 bg-[#A57945] hover:bg-[#451119]"
              onClick={() => save.mutate(settings)} disabled={save.isPending}>
              {save.isPending ? "Enregistrement..." : "Enregistrer les taux"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
