import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { api } from "@/finance/lib/api";
import { formatDH } from "@/finance/lib/format";
import { Card } from "@/shared/components/ui/card";
import { Slider } from "@/shared/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";

export default function Tresorerie() {
  const [ce, setCe] = useState(0);
  const [cs, setCs] = useState(0);

  const { data } = useQuery({
    queryKey: ["/tresorerie", ce, cs],
    queryFn: async () => (await api.get(`/tresorerie?croissance_entrees=${ce}&croissance_sorties=${cs}`)).data,
  });

  if (!data) return <div className="text-slate-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">Trésorerie (Cash Flow)</h1>
        <p className="mt-1 text-sm text-slate-500">Flux de trésorerie et prévisions — {data.annee}</p>
      </div>

      {data.alerte_negative && (
        <Card data-testid="tresorerie-alerte" className="flex items-center gap-3 border-l-4 border-l-red-500 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-700">Alerte : la trésorerie prévisionnelle devient négative sur la période projetée.</p>
        </Card>
      )}

      <Tabs defaultValue="mensuel">
        <TabsList>
          <TabsTrigger value="mensuel" data-testid="tab-tres-mensuel">Vue mensuelle</TabsTrigger>
          <TabsTrigger value="quotidien" data-testid="tab-tres-quotidien">Vue quotidienne</TabsTrigger>
          <TabsTrigger value="prevision" data-testid="tab-tres-prevision">Prévisions</TabsTrigger>
        </TabsList>

        <TabsContent value="mensuel" className="mt-6 space-y-6">
          <Card className="border-slate-200 p-6 shadow-sm">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.mensuel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={formatDH} />
                <Legend />
                <Bar dataKey="entrees" name="Entrées" fill="#10B981" />
                <Bar dataKey="sorties" name="Sorties" fill="#F97316" />
                <Line type="monotone" dataKey="cumul" name="Trésorerie cumulée" stroke="#451119" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card className="border-slate-200 p-6 shadow-sm">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs uppercase">Mois</TableHead>
                <TableHead className="text-xs uppercase text-right">Entrées</TableHead>
                <TableHead className="text-xs uppercase text-right">Sorties</TableHead>
                <TableHead className="text-xs uppercase text-right">Solde net</TableHead>
                <TableHead className="text-xs uppercase text-right">Cumul</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.mensuel.map((m) => (
                  <TableRow key={m.mois}>
                    <TableCell className="text-sm font-medium">{m.mois}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-emerald-600">{formatDH(m.entrees)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-orange-600">{formatDH(m.sorties)}</TableCell>
                    <TableCell className={`text-right text-sm tabular-nums ${m.net < 0 ? "text-red-600" : ""}`}>{formatDH(m.net)}</TableCell>
                    <TableCell className={`text-right text-sm font-medium tabular-nums ${m.cumul < 0 ? "text-red-600" : "text-[#451119]"}`}>{formatDH(m.cumul)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="quotidien" className="mt-6">
          <Card className="border-slate-200 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-[#451119]">Détail quotidien — {data.mois_courant}</h3>
            <Table>
              <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs uppercase">Jour</TableHead>
                <TableHead className="text-xs uppercase text-right">Entrées</TableHead>
                <TableHead className="text-xs uppercase text-right">Sorties</TableHead>
                <TableHead className="text-xs uppercase text-right">Net</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.quotidien.filter((d) => d.entrees || d.sorties).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-slate-400">Aucun mouvement ce mois-ci</TableCell></TableRow>
                )}
                {data.quotidien.filter((d) => d.entrees || d.sorties).map((d) => (
                  <TableRow key={d.jour}>
                    <TableCell className="text-sm">{d.jour}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-emerald-600">{formatDH(d.entrees)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-orange-600">{formatDH(d.sorties)}</TableCell>
                    <TableCell className={`text-right text-sm tabular-nums ${d.net < 0 ? "text-red-600" : ""}`}>{formatDH(d.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="prevision" className="mt-6 space-y-6">
          <Card className="border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <div className="flex justify-between text-sm"><span className="font-medium text-slate-600">Croissance mensuelle des entrées</span><span className="font-semibold text-[#A57945]">{ce} %</span></div>
                <Slider data-testid="slider-entrees" value={[ce]} onValueChange={(v) => setCe(v[0])} min={-10} max={20} step={1} className="mt-3" />
              </div>
              <div>
                <div className="flex justify-between text-sm"><span className="font-medium text-slate-600">Croissance mensuelle des sorties</span><span className="font-semibold text-[#F97316]">{cs} %</span></div>
                <Slider data-testid="slider-sorties" value={[cs]} onValueChange={(v) => setCs(v[0])} min={-10} max={20} step={1} className="mt-3" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">Base de projection : moyenne des 3 derniers mois — Entrées {formatDH(data.moyenne_entrees)} / Sorties {formatDH(data.moyenne_sorties)}</p>
          </Card>
          <Card className="border-slate-200 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-[#451119]">Projection à 12 mois</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.previsions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={formatDH} />
                <Legend />
                <Line type="monotone" dataKey="cumul_prev" name="Trésorerie projetée" stroke="#451119" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="net_prev" name="Solde net mensuel" stroke="#A57945" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {[3, 6, 12].map((h) => (
                <div key={h} className="rounded-md border border-slate-100 p-3">
                  <p className="text-xs text-slate-500">Trésorerie à {h} mois</p>
                  <p className={`mt-1 text-lg font-medium ${data.previsions[h - 1].cumul_prev < 0 ? "text-red-600" : "text-[#451119]"}`}>{formatDH(data.previsions[h - 1].cumul_prev)}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
