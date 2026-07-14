import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { api, formatApiErrorDetail } from "@/finance/lib/api";
import { NONE_VALUE } from "@/finance/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Card } from "@/shared/components/ui/card";

function normalizeOptions(opts) {
  if (!opts) return [];
  return opts.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

function SelectField({ field, testid, value, onChange }) {
  const opts = normalizeOptions(field.options);
  const hasNone = opts.some((o) => String(o.value) === NONE_VALUE);
  const selectValue = value === "" || value == null ? (hasNone ? NONE_VALUE : undefined) : String(value);
  return (
    <Select value={selectValue} onValueChange={(v) => onChange(v === NONE_VALUE ? "" : v)}>
      <SelectTrigger data-testid={`${testid}-field-${field.name}`} className="mt-1 bg-white">
        <SelectValue placeholder="Sélectionner..." />
      </SelectTrigger>
      <SelectContent>
        {opts.map((o) => (
          <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CrudManager({ title, subtitle, endpoint, testid, columns, fields, initialValues = {} }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => (await api.get(endpoint)).data,
  });

  const invalidateAll = () => {
    qc.invalidateQueries();
  };

  const saveMut = useMutation({
    mutationFn: async (payload) => {
      if (editing) return (await api.put(`${endpoint}/${editing.id}`, payload)).data;
      return (await api.post(endpoint, payload)).data;
    },
    onSuccess: () => {
      toast.success(editing ? "Modifié avec succès" : "Créé avec succès");
      setOpen(false);
      invalidateAll();
    },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`${endpoint}/${id}`)).data,
    onSuccess: () => {
      toast.success("Supprimé");
      setDeleteId(null);
      invalidateAll();
    },
    onError: (e) => toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message),
  });

  const openCreate = () => {
    setEditing(null);
    const init = {};
    fields.forEach((f) => (init[f.name] = initialValues[f.name] ?? (f.type === "number" ? 0 : "")));
    setForm(init);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const init = {};
    fields.forEach((f) => (init[f.name] = row[f.name] ?? (f.type === "number" ? 0 : "")));
    setForm(init);
    setOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = {};
    fields.forEach((f) => {
      let v = form[f.name];
      if (f.type === "number") v = Number(v) || 0;
      payload[f.name] = v;
    });
    saveMut.mutate(payload);
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    return columns.some((c) => {
      const val = c.render ? "" : String(r[c.key] ?? "");
      return val.toLowerCase().includes(search.toLowerCase());
    }) || JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#451119]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <Button data-testid={`${testid}-add-btn`} onClick={openCreate}
          className="bg-[#A57945] hover:bg-[#451119] transition-all">
          <Plus className="mr-2 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input data-testid={`${testid}-search`} placeholder="Rechercher..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {columns.map((c) => (
                  <TableHead key={c.key} className={`text-xs font-semibold uppercase tracking-wider text-slate-500 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </TableHead>
                ))}
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="py-10 text-center text-slate-400">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="py-10 text-center text-slate-400">Aucune donnée</TableCell></TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} data-testid={`${testid}-row`} className="hover:bg-slate-50 transition-colors">
                    {columns.map((c) => (
                      <TableCell key={c.key} className={`text-sm ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                        {c.render ? c.render(row) : row[c.key] ?? "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button data-testid={`${testid}-edit-btn`} variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button data-testid={`${testid}-delete-btn`} variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#451119]">{editing ? "Modifier" : "Ajouter"} — {title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-4 py-2">
            {fields.map((f) => (
              <div key={f.name} className={f.colSpan === 1 ? "col-span-1" : "col-span-2"}>
                <Label className="text-xs font-medium text-slate-600">{f.label}</Label>
                {f.type === "select" ? (
                  <SelectField field={f} testid={testid} value={form[f.name]}
                    onChange={(val) => setForm({ ...form, [f.name]: val })} />
                ) : f.type === "textarea" ? (
                  <Textarea data-testid={`${testid}-field-${f.name}`} className="mt-1 bg-white" value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                ) : (
                  <Input data-testid={`${testid}-field-${f.name}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    step={f.step} className="mt-1 bg-white" value={form[f.name] ?? ""} required={f.required}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
              </div>
            ))}
            <DialogFooter className="col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button data-testid={`${testid}-submit-btn`} type="submit" disabled={saveMut.isPending}
                className="bg-[#A57945] hover:bg-[#451119]">
                {saveMut.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction data-testid={`${testid}-confirm-delete`} className="bg-red-600 hover:bg-red-700"
              onClick={() => delMut.mutate(deleteId)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
