from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, date, timezone
from bson import ObjectId

from db import db, serialize, serialize_list
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["app"])
protect = Depends(get_current_user)


# ----------------------------- helpers -----------------------------
def oid(v):
    return ObjectId(v)


def _num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


async def next_numero(prefix: str, collection):
    year = datetime.now().year
    rx = f"^{prefix}-{year}-"
    n = await collection.count_documents({"numero": {"$regex": rx}}) + 1
    return f"{prefix}-{year}-{n:03d}"


def compute_tva(ht: float, tva_pct: float):
    montant_tva = round(ht * tva_pct / 100.0, 2)
    return montant_tva, round(ht + montant_tva, 2)


# ----------------------------- Clients -----------------------------
class ClientIn(BaseModel):
    raison_sociale: str
    contact: Optional[str] = ""
    telephone: Optional[str] = ""
    email: Optional[str] = ""
    adresse: Optional[str] = ""
    ville: Optional[str] = ""
    ice: Optional[str] = ""


@router.get("/clients")
async def list_clients(user=protect):
    clients = serialize_list(await db.clients.find().sort("raison_sociale", 1).to_list(1000))
    projects = serialize_list(await db.projects.find().to_list(5000))
    factures = serialize_list(await db.factures.find().to_list(5000))
    paiements = serialize_list(await db.paiements.find().to_list(5000))
    for c in clients:
        cid = c["id"]
        c_projects = [p for p in projects if p.get("client_id") == cid]
        c_factures = [f for f in factures if f.get("client_id") == cid]
        total_ttc = sum(compute_tva(_num(f["montant_ht"]), _num(f.get("tva_pct", 20)))[1] for f in c_factures)
        f_ids = {f["id"] for f in c_factures}
        total_encaisse = sum(_num(p["montant"]) for p in paiements if p.get("facture_id") in f_ids)
        c["nb_projets"] = len(c_projects)
        c["total_facture_ttc"] = round(total_ttc, 2)
        c["total_encaisse"] = round(total_encaisse, 2)
        c["solde_du"] = round(total_ttc - total_encaisse, 2)
    return clients


@router.post("/clients")
async def create_client(data: ClientIn, user=protect):
    doc = data.model_dump()
    doc["date_creation"] = datetime.now(timezone.utc).isoformat()
    res = await db.clients.insert_one(doc)
    return serialize(await db.clients.find_one({"_id": res.inserted_id}))


@router.put("/clients/{cid}")
async def update_client(cid: str, data: ClientIn, user=protect):
    await db.clients.update_one({"_id": oid(cid)}, {"$set": data.model_dump()})
    return serialize(await db.clients.find_one({"_id": oid(cid)}))


@router.delete("/clients/{cid}")
async def delete_client(cid: str, user=protect):
    await db.clients.delete_one({"_id": oid(cid)})
    return {"ok": True}


@router.get("/clients/{cid}")
async def client_detail(cid: str, user=protect):
    client = serialize(await db.clients.find_one({"_id": oid(cid)}))
    if not client:
        raise HTTPException(404, "Client introuvable")
    projects = serialize_list(await db.projects.find({"client_id": cid}).to_list(1000))
    factures = await _enrich_factures([f for f in serialize_list(await db.factures.find({"client_id": cid}).to_list(1000))])
    f_ids = {f["id"] for f in factures}
    paiements = serialize_list(await db.paiements.find().to_list(5000))
    paiements = [p for p in paiements if p.get("facture_id") in f_ids]
    return {"client": client, "projets": projects, "factures": factures, "paiements": paiements}


# ----------------------------- Projects -----------------------------
class ProjectIn(BaseModel):
    nom: str
    client_id: str
    type_projet: str
    date_debut: Optional[str] = ""
    date_fin_prevue: Optional[str] = ""
    statut: str = "En cours"
    budget_previsionnel: float = 0.0


async def _enrich_projects(projects):
    depenses = serialize_list(await db.depenses.find().to_list(5000))
    factures = serialize_list(await db.factures.find().to_list(5000))
    clients = {c["id"]: c["raison_sociale"] for c in serialize_list(await db.clients.find().to_list(2000))}
    for p in projects:
        pid = p["id"]
        cout_reel = sum(compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))[1] for d in depenses if d.get("project_id") == pid)
        ca = sum(_num(f["montant_ht"]) for f in factures if f.get("project_id") == pid)
        cout_ht = sum(_num(d["montant_ht"]) for d in depenses if d.get("project_id") == pid)
        marge = round(ca - cout_ht, 2)
        marge_pct = round((marge / ca * 100.0), 2) if ca > 0 else 0.0
        p["client_nom"] = clients.get(p.get("client_id"), "—")
        p["cout_reel"] = round(cout_reel, 2)
        p["cout_ht"] = round(cout_ht, 2)
        p["ca_facture"] = round(ca, 2)
        p["marge"] = marge
        p["marge_pct"] = marge_pct
    return projects


@router.get("/projects")
async def list_projects(user=protect):
    projects = serialize_list(await db.projects.find().sort("nom", 1).to_list(2000))
    return await _enrich_projects(projects)


@router.post("/projects")
async def create_project(data: ProjectIn, user=protect):
    res = await db.projects.insert_one(data.model_dump())
    return serialize(await db.projects.find_one({"_id": res.inserted_id}))


@router.put("/projects/{pid}")
async def update_project(pid: str, data: ProjectIn, user=protect):
    await db.projects.update_one({"_id": oid(pid)}, {"$set": data.model_dump()})
    return serialize(await db.projects.find_one({"_id": oid(pid)}))


@router.delete("/projects/{pid}")
async def delete_project(pid: str, user=protect):
    await db.projects.delete_one({"_id": oid(pid)})
    return {"ok": True}


# ----------------------------- Devis -----------------------------
class DevisIn(BaseModel):
    date: str
    client_id: str
    project_id: Optional[str] = ""
    objet: Optional[str] = ""
    montant_ht: float = 0.0
    tva_pct: float = 20.0
    statut: str = "En attente"
    date_reponse: Optional[str] = ""


def _enrich_common(items, clients, projects):
    for it in items:
        tva, ttc = compute_tva(_num(it["montant_ht"]), _num(it.get("tva_pct", 20)))
        it["montant_tva"] = tva
        it["montant_ttc"] = ttc
        it["client_nom"] = clients.get(it.get("client_id"), "—")
        it["project_nom"] = projects.get(it.get("project_id"), "—")
    return items


@router.get("/devis")
async def list_devis(user=protect):
    items = serialize_list(await db.devis.find().sort("numero", -1).to_list(2000))
    clients = {c["id"]: c["raison_sociale"] for c in serialize_list(await db.clients.find().to_list(2000))}
    projects = {p["id"]: p["nom"] for p in serialize_list(await db.projects.find().to_list(2000))}
    return _enrich_common(items, clients, projects)


@router.post("/devis")
async def create_devis(data: DevisIn, user=protect):
    doc = data.model_dump()
    doc["numero"] = await next_numero("DEV", db.devis)
    res = await db.devis.insert_one(doc)
    return serialize(await db.devis.find_one({"_id": res.inserted_id}))


@router.put("/devis/{did}")
async def update_devis(did: str, data: DevisIn, user=protect):
    await db.devis.update_one({"_id": oid(did)}, {"$set": data.model_dump()})
    return serialize(await db.devis.find_one({"_id": oid(did)}))


@router.delete("/devis/{did}")
async def delete_devis(did: str, user=protect):
    await db.devis.delete_one({"_id": oid(did)})
    return {"ok": True}


# ----------------------------- Factures -----------------------------
class FactureIn(BaseModel):
    date_emission: str
    client_id: str
    project_id: Optional[str] = ""
    type_facture: str = "Facture unique"
    montant_ht: float = 0.0
    tva_pct: float = 20.0
    date_echeance: Optional[str] = ""


async def _enrich_factures(factures):
    paiements = serialize_list(await db.paiements.find().to_list(5000))
    clients = {c["id"]: c["raison_sociale"] for c in serialize_list(await db.clients.find().to_list(2000))}
    projects = {p["id"]: p["nom"] for p in serialize_list(await db.projects.find().to_list(2000))}
    today = date.today()
    for f in factures:
        tva, ttc = compute_tva(_num(f["montant_ht"]), _num(f.get("tva_pct", 20)))
        encaisse = round(sum(_num(p["montant"]) for p in paiements if p.get("facture_id") == f["id"]), 2)
        solde = round(ttc - encaisse, 2)
        if encaisse <= 0.009:
            statut = "Impayée"
        elif solde <= 0.01:
            statut = "Payée"
        else:
            statut = "Partiellement payée"
        retard = 0
        ech = f.get("date_echeance")
        if solde > 0.01 and ech:
            try:
                d = date.fromisoformat(ech)
                if today > d:
                    retard = (today - d).days
            except ValueError:
                pass
        f["montant_tva"] = tva
        f["montant_ttc"] = ttc
        f["montant_encaisse"] = encaisse
        f["solde_du"] = solde
        f["statut"] = statut
        f["jours_retard"] = retard
        f["en_retard"] = retard > 0
        f["client_nom"] = clients.get(f.get("client_id"), "—")
        f["project_nom"] = projects.get(f.get("project_id"), "—")
    return factures


@router.get("/factures")
async def list_factures(user=protect):
    factures = serialize_list(await db.factures.find().sort("numero", -1).to_list(5000))
    return await _enrich_factures(factures)


@router.post("/factures")
async def create_facture(data: FactureIn, user=protect):
    doc = data.model_dump()
    doc["numero"] = await next_numero("FA", db.factures)
    res = await db.factures.insert_one(doc)
    return serialize(await db.factures.find_one({"_id": res.inserted_id}))


@router.put("/factures/{fid}")
async def update_facture(fid: str, data: FactureIn, user=protect):
    await db.factures.update_one({"_id": oid(fid)}, {"$set": data.model_dump()})
    return serialize(await db.factures.find_one({"_id": oid(fid)}))


@router.delete("/factures/{fid}")
async def delete_facture(fid: str, user=protect):
    await db.factures.delete_one({"_id": oid(fid)})
    await db.paiements.delete_many({"facture_id": fid})
    return {"ok": True}


# ----------------------------- Paiements -----------------------------
class PaiementIn(BaseModel):
    date: str
    facture_id: str
    montant: float
    mode_paiement: str = "Virement"
    banque: Optional[str] = ""
    notes: Optional[str] = ""


@router.get("/paiements")
async def list_paiements(user=protect):
    paiements = serialize_list(await db.paiements.find().sort("date", -1).to_list(5000))
    factures = {f["id"]: f for f in serialize_list(await db.factures.find().to_list(5000))}
    clients = {c["id"]: c["raison_sociale"] for c in serialize_list(await db.clients.find().to_list(2000))}
    for p in paiements:
        f = factures.get(p.get("facture_id"))
        p["facture_numero"] = f["numero"] if f else "—"
        cid = f.get("client_id") if f else None
        p["client_nom"] = clients.get(cid, "—")
    return paiements


@router.post("/paiements")
async def create_paiement(data: PaiementIn, user=protect):
    f = await db.factures.find_one({"_id": oid(data.facture_id)})
    doc = data.model_dump()
    doc["client_id"] = f.get("client_id") if f else None
    res = await db.paiements.insert_one(doc)
    return serialize(await db.paiements.find_one({"_id": res.inserted_id}))


@router.put("/paiements/{pid}")
async def update_paiement(pid: str, data: PaiementIn, user=protect):
    f = await db.factures.find_one({"_id": oid(data.facture_id)})
    doc = data.model_dump()
    doc["client_id"] = f.get("client_id") if f else None
    await db.paiements.update_one({"_id": oid(pid)}, {"$set": doc})
    return serialize(await db.paiements.find_one({"_id": oid(pid)}))


@router.delete("/paiements/{pid}")
async def delete_paiement(pid: str, user=protect):
    await db.paiements.delete_one({"_id": oid(pid)})
    return {"ok": True}


@router.get("/relances")
async def relances(user=protect):
    factures = await _enrich_factures(serialize_list(await db.factures.find().to_list(5000)))
    clients = {c["id"]: c for c in serialize_list(await db.clients.find().to_list(2000))}
    out = []
    for f in factures:
        if f["solde_du"] > 0.01 and f["jours_retard"] > 0:
            r = f["jours_retard"]
            if r <= 15:
                niveau = "1ère relance"
            elif r <= 30:
                niveau = "2ème relance"
            else:
                niveau = "Mise en demeure"
            c = clients.get(f.get("client_id"), {})
            out.append({
                "facture_id": f["id"], "numero": f["numero"], "client_nom": f["client_nom"],
                "client_email": c.get("email", ""), "solde_du": f["solde_du"],
                "jours_retard": r, "niveau": niveau, "date_echeance": f.get("date_echeance"),
            })
    out.sort(key=lambda x: -x["jours_retard"])
    return out


# ----------------------------- Dépenses -----------------------------
class DepenseIn(BaseModel):
    date: str
    categorie: str
    fournisseur: Optional[str] = ""
    description: Optional[str] = ""
    project_id: Optional[str] = ""
    montant_ht: float = 0.0
    tva_pct: float = 20.0
    mode_paiement: str = "Virement"
    statut_paiement: str = "Payée"


@router.get("/depenses")
async def list_depenses(user=protect):
    items = serialize_list(await db.depenses.find().sort("date", -1).to_list(5000))
    projects = {p["id"]: p["nom"] for p in serialize_list(await db.projects.find().to_list(2000))}
    for d in items:
        tva, ttc = compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))
        d["montant_tva"] = tva
        d["montant_ttc"] = ttc
        d["project_nom"] = projects.get(d.get("project_id"), "—")
    return items


@router.post("/depenses")
async def create_depense(data: DepenseIn, user=protect):
    res = await db.depenses.insert_one(data.model_dump())
    return serialize(await db.depenses.find_one({"_id": res.inserted_id}))


@router.put("/depenses/{did}")
async def update_depense(did: str, data: DepenseIn, user=protect):
    await db.depenses.update_one({"_id": oid(did)}, {"$set": data.model_dump()})
    return serialize(await db.depenses.find_one({"_id": oid(did)}))


@router.delete("/depenses/{did}")
async def delete_depense(did: str, user=protect):
    await db.depenses.delete_one({"_id": oid(did)})
    return {"ok": True}


# ----------------------------- Investissements -----------------------------
class InvestIn(BaseModel):
    designation: str
    categorie: str = "Matériel informatique"
    date_acquisition: str
    valeur_ht: float = 0.0
    duree_annees: int = 5


def _enrich_invest(items):
    today = date.today()
    for it in items:
        valeur = _num(it["valeur_ht"])
        duree = int(it.get("duree_annees", 5)) or 1
        taux = round(100.0 / duree, 2)
        amort_annuel = round(valeur / duree, 2)
        annees_ecoulees = 0
        try:
            da = date.fromisoformat(it["date_acquisition"])
            annees_ecoulees = today.year - da.year + (1 if (today.month, today.day) >= (da.month, da.day) else 0)
            annees_ecoulees = max(0, annees_ecoulees)
        except (ValueError, KeyError):
            pass
        annees_amorties = min(annees_ecoulees, duree)
        amort_cumule = round(amort_annuel * annees_amorties, 2)
        vnc = round(max(0.0, valeur - amort_cumule), 2)
        it["taux_annuel"] = taux
        it["amort_annuel"] = amort_annuel
        it["annees_ecoulees"] = annees_ecoulees
        it["amort_cumule"] = amort_cumule
        it["vnc"] = vnc
        it["statut"] = "Totalement amorti" if vnc <= 0.01 else "En cours d'amortissement"
    return items


@router.get("/investissements")
async def list_invest(user=protect):
    return _enrich_invest(serialize_list(await db.investissements.find().sort("date_acquisition", -1).to_list(2000)))


@router.post("/investissements")
async def create_invest(data: InvestIn, user=protect):
    res = await db.investissements.insert_one(data.model_dump())
    return serialize(await db.investissements.find_one({"_id": res.inserted_id}))


@router.put("/investissements/{iid}")
async def update_invest(iid: str, data: InvestIn, user=protect):
    await db.investissements.update_one({"_id": oid(iid)}, {"$set": data.model_dump()})
    return serialize(await db.investissements.find_one({"_id": oid(iid)}))


@router.delete("/investissements/{iid}")
async def delete_invest(iid: str, user=protect):
    await db.investissements.delete_one({"_id": oid(iid)})
    return {"ok": True}


# ----------------------------- Settings (taux) -----------------------------
DEFAULT_SETTINGS = {
    "is_tranche1_max": 300000, "is_tranche1_taux": 12.5,
    "is_tranche2_max": 1000000, "is_tranche2_taux": 20.0,
    "is_tranche3_taux": 28.0,
    "cnss_salariale": 4.48, "cnss_patronale": 8.98,
    "amo_patronale": 4.11, "taxe_formation": 1.6,
    "masse_salariale_annuelle": 0.0,
}


async def get_settings():
    s = await db.settings.find_one({"_id": "global"})
    if not s:
        s = {"_id": "global", **DEFAULT_SETTINGS}
        await db.settings.insert_one(s)
    merged = {**DEFAULT_SETTINGS, **{k: v for k, v in s.items() if k != "_id"}}
    return merged


@router.get("/settings")
async def read_settings(user=protect):
    return await get_settings()


@router.put("/settings")
async def write_settings(data: Dict, user=protect):
    data.pop("_id", None)
    await db.settings.update_one({"_id": "global"}, {"$set": data}, upsert=True)
    return await get_settings()


# ----------------------------- Budget -----------------------------
@router.get("/budget/{annee}")
async def read_budget(annee: int, user=protect):
    b = await db.budget.find_one({"_id": f"budget-{annee}"})
    if not b:
        b = {
            "_id": f"budget-{annee}", "annee": annee,
            "ca": {"Architecture": [0] * 12, "Urbanisme": [0] * 12, "Architecture d'intérieur": [0] * 12},
            "depenses": {"Salaires": [0] * 12, "Fournisseurs": [0] * 12, "Logiciels": [0] * 12,
                         "Marketing": [0] * 12, "Déplacements": [0] * 12, "Charges diverses": [0] * 12},
        }
        await db.budget.insert_one(b)
    b.pop("_id", None)
    return b


@router.put("/budget/{annee}")
async def write_budget(annee: int, data: Dict, user=protect):
    data.pop("_id", None)
    data["annee"] = annee
    await db.budget.update_one({"_id": f"budget-{annee}"}, {"$set": data}, upsert=True)
    b = await db.budget.find_one({"_id": f"budget-{annee}"})
    b.pop("_id", None)
    return b
