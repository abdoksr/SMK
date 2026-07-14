from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, date
import io

from db import db, serialize_list
from auth import get_current_user
from routes import compute_tva, _num, _enrich_factures, _enrich_projects, _enrich_invest, get_settings
from config import COMPANY_NAME

analytics_router = APIRouter(prefix="/api", tags=["analytics"])
protect = Depends(get_current_user)

MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
MONTHS_FR_FULL = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août",
                  "Septembre", "Octobre", "Novembre", "Décembre"]


def _month_of(s):
    try:
        return int(s[5:7])
    except (TypeError, ValueError, IndexError):
        return None


def _year_of(s):
    try:
        return int(s[0:4])
    except (TypeError, ValueError, IndexError):
        return None


async def _load_all():
    factures = await _enrich_factures(serialize_list(await db.factures.find().to_list(5000)))
    depenses = serialize_list(await db.depenses.find().to_list(5000))
    for d in depenses:
        d["_ttc"] = compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))[1]
        d["_tva"] = compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))[0]
    paiements = serialize_list(await db.paiements.find().to_list(5000))
    projects = await _enrich_projects(serialize_list(await db.projects.find().to_list(2000)))
    invest = _enrich_invest(serialize_list(await db.investissements.find().to_list(2000)))
    return factures, depenses, paiements, projects, invest


# ----------------------------- Dashboard -----------------------------
@analytics_router.get("/dashboard")
async def dashboard(user=protect):
    factures, depenses, paiements, projects, invest = await _load_all()
    now = date.today()
    year = now.year
    q = (now.month - 1) // 3

    def fac_ht(f):
        return _num(f["montant_ht"])

    ca_mois = sum(fac_ht(f) for f in factures if _year_of(f["date_emission"]) == year and _month_of(f["date_emission"]) == now.month)
    ca_trim = sum(fac_ht(f) for f in factures if _year_of(f["date_emission"]) == year and ((_month_of(f["date_emission"]) or 1) - 1) // 3 == q)
    ca_annee = sum(fac_ht(f) for f in factures if _year_of(f["date_emission"]) == year)
    dep_annee = sum(d["_ttc"] for d in depenses if _year_of(d["date"]) == year)
    dep_ht_annee = sum(_num(d["montant_ht"]) for d in depenses if _year_of(d["date"]) == year)
    benefice_net = round(ca_annee - dep_ht_annee, 2)

    total_encaisse = sum(_num(p["montant"]) for p in paiements)
    total_dep_payee = sum(d["_ttc"] for d in depenses if d.get("statut_paiement") == "Payée")
    tresorerie = round(total_encaisse - total_dep_payee, 2)

    a_encaisser = round(sum(f["solde_du"] for f in factures if f["solde_du"] > 0.01), 2)
    a_payer = round(sum(d["_ttc"] for d in depenses if d.get("statut_paiement") == "Impayée"), 2)
    factures_retard = sum(1 for f in factures if f["en_retard"])
    marge_nette = round((benefice_net / ca_annee * 100.0), 1) if ca_annee > 0 else 0.0

    ca_dep = []
    for m in range(1, 13):
        mca = sum(fac_ht(f) for f in factures if _year_of(f["date_emission"]) == year and _month_of(f["date_emission"]) == m)
        mdep = sum(d["_ttc"] for d in depenses if _year_of(d["date"]) == year and _month_of(d["date"]) == m)
        ca_dep.append({"mois": MONTHS_FR[m - 1], "ca": round(mca, 2), "depenses": round(mdep, 2)})

    tres = []
    cumul = 0.0
    for m in range(1, 13):
        entrees = sum(_num(p["montant"]) for p in paiements if _year_of(p["date"]) == year and _month_of(p["date"]) == m)
        sorties = sum(d["_ttc"] for d in depenses if d.get("statut_paiement") == "Payée" and _year_of(d["date"]) == year and _month_of(d["date"]) == m)
        cumul += entrees - sorties
        tres.append({"mois": MONTHS_FR[m - 1], "tresorerie": round(cumul, 2)})

    cats = {}
    for d in depenses:
        if _year_of(d["date"]) == year:
            cats[d["categorie"]] = cats.get(d["categorie"], 0) + d["_ttc"]
    dep_cat = [{"name": k, "value": round(v, 2)} for k, v in cats.items()]

    marge_proj = [{"nom": p["nom"], "marge": p["marge"]} for p in projects][:12]

    return {
        "kpi": {
            "ca_mois": round(ca_mois, 2), "ca_trimestre": round(ca_trim, 2), "ca_annee": round(ca_annee, 2),
            "benefice_net": benefice_net, "tresorerie": tresorerie, "depenses_annee": round(dep_annee, 2),
            "a_encaisser": a_encaisser, "a_payer": a_payer, "factures_retard": factures_retard,
            "marge_nette": marge_nette,
        },
        "ca_depenses": ca_dep, "tresorerie_evolution": tres,
        "depenses_categorie": dep_cat, "marge_projet": marge_proj,
        "annee": year,
    }


# ----------------------------- Trésorerie -----------------------------
@analytics_router.get("/tresorerie")
async def tresorerie(annee: int = None, croissance_entrees: float = 0.0, croissance_sorties: float = 0.0, user=protect):
    _, depenses, paiements, _, _ = await _load_all()
    year = annee or date.today().year

    mensuel = []
    cumul = 0.0
    for m in range(1, 13):
        entrees = sum(_num(p["montant"]) for p in paiements if _year_of(p["date"]) == year and _month_of(p["date"]) == m)
        sorties = sum(d["_ttc"] for d in depenses if d.get("statut_paiement") == "Payée" and _year_of(d["date"]) == year and _month_of(d["date"]) == m)
        net = entrees - sorties
        cumul += net
        mensuel.append({"mois": MONTHS_FR_FULL[m - 1], "entrees": round(entrees, 2), "sorties": round(sorties, 2),
                        "net": round(net, 2), "cumul": round(cumul, 2)})

    now = date.today()
    import calendar
    ndays = calendar.monthrange(year, now.month)[1]
    quotidien = []
    dcumul = 0.0
    for jour in range(1, ndays + 1):
        ds = f"{year}-{now.month:02d}-{jour:02d}"
        e = sum(_num(p["montant"]) for p in paiements if p["date"] == ds)
        s = sum(d["_ttc"] for d in depenses if d.get("statut_paiement") == "Payée" and d["date"] == ds)
        dcumul += e - s
        quotidien.append({"jour": ds, "entrees": round(e, 2), "sorties": round(s, 2), "net": round(e - s, 2)})

    last3_e = sum(m["entrees"] for m in mensuel[max(0, now.month - 3):now.month]) / 3.0 if now.month >= 1 else 0
    last3_s = sum(m["sorties"] for m in mensuel[max(0, now.month - 3):now.month]) / 3.0 if now.month >= 1 else 0
    base_cumul = cumul
    previsions = []
    alerte = False
    pe, ps = last3_e, last3_s
    pcumul = base_cumul
    for i in range(1, 13):
        pe = pe * (1 + croissance_entrees / 100.0)
        ps = ps * (1 + croissance_sorties / 100.0)
        pnet = pe - ps
        pcumul += pnet
        if pcumul < 0:
            alerte = True
        previsions.append({"mois": f"M+{i}", "entrees_prev": round(pe, 2), "sorties_prev": round(ps, 2),
                           "net_prev": round(pnet, 2), "cumul_prev": round(pcumul, 2)})

    return {"mensuel": mensuel, "quotidien": quotidien, "previsions": previsions,
            "alerte_negative": alerte, "moyenne_entrees": round(last3_e, 2), "moyenne_sorties": round(last3_s, 2),
            "annee": year, "mois_courant": MONTHS_FR_FULL[now.month - 1]}


# ----------------------------- Comptabilité -----------------------------
async def _compute_compta(year):
    factures, depenses, paiements, _, invest = await _load_all()
    recettes = []
    dep_journal = []
    for m in range(1, 13):
        r = sum(_num(p["montant"]) for p in paiements if _year_of(p["date"]) == year and _month_of(p["date"]) == m)
        d = sum(x["_ttc"] for x in depenses if _year_of(x["date"]) == year and _month_of(x["date"]) == m)
        recettes.append({"mois": MONTHS_FR_FULL[m - 1], "montant": round(r, 2)})
        dep_journal.append({"mois": MONTHS_FR_FULL[m - 1], "montant": round(d, 2)})

    ca = sum(_num(f["montant_ht"]) for f in factures if _year_of(f["date_emission"]) == year)
    by_cat = {}
    for x in depenses:
        if _year_of(x["date"]) == year:
            by_cat[x["categorie"]] = by_cat.get(x["categorie"], 0) + _num(x["montant_ht"])
    charges_personnel = round(by_cat.get("Salaires", 0), 2)
    charges_externes = round(sum(v for k, v in by_cat.items() if k in ("Fournisseurs", "Logiciels", "Marketing", "Déplacements")), 2)
    charges_diverses = round(by_cat.get("Charges diverses", 0), 2)
    dotations = round(sum(i["amort_annuel"] for i in invest if i["statut"] == "En cours d'amortissement"), 2)
    resultat = round(ca - charges_externes - charges_personnel - charges_diverses - dotations, 2)

    tresorerie = round(sum(_num(p["montant"]) for p in paiements) - sum(x["_ttc"] for x in depenses if x.get("statut_paiement") == "Payée"), 2)
    creances = round(sum(f["solde_du"] for f in factures if f["solde_du"] > 0.01), 2)
    immob_nettes = round(sum(i["vnc"] for i in invest), 2)
    dettes = round(sum(x["_ttc"] for x in depenses if x.get("statut_paiement") == "Impayée"), 2)

    return {
        "recettes": recettes, "depenses_journal": dep_journal,
        "resultat": {
            "chiffre_affaires": round(ca, 2), "charges_externes": charges_externes,
            "charges_personnel": charges_personnel, "charges_diverses": charges_diverses,
            "dotations_amortissements": dotations, "resultat_net": resultat,
        },
        "bilan": {
            "actif": {"tresorerie": tresorerie, "creances_clients": creances, "immobilisations_nettes": immob_nettes,
                      "total": round(tresorerie + creances + immob_nettes, 2)},
            "passif": {"dettes_fournisseurs": dettes, "capitaux_propres_resultat": round(tresorerie + creances + immob_nettes - dettes, 2),
                       "total": round(tresorerie + creances + immob_nettes, 2)},
        },
    }


@analytics_router.get("/comptabilite")
async def comptabilite(annee: int = None, user=protect):
    return await _compute_compta(annee or date.today().year)


# ----------------------------- Fiscalité -----------------------------
def calc_is(resultat, s):
    if resultat <= 0:
        return 0.0
    t1 = s["is_tranche1_max"]; t2 = s["is_tranche2_max"]
    tax = 0.0
    tax += min(resultat, t1) * s["is_tranche1_taux"] / 100.0
    if resultat > t1:
        tax += (min(resultat, t2) - t1) * s["is_tranche2_taux"] / 100.0
    if resultat > t2:
        tax += (resultat - t2) * s["is_tranche3_taux"] / 100.0
    return round(tax, 2)


@analytics_router.get("/fiscalite")
async def fiscalite(annee: int = None, user=protect):
    year = annee or date.today().year
    factures, depenses, _, _, _ = await _load_all()
    s = await get_settings()

    tva_rows = []
    tot_col = tot_ded = 0.0
    for m in range(1, 13):
        collectee = sum(f["montant_tva"] for f in factures if _year_of(f["date_emission"]) == year and _month_of(f["date_emission"]) == m)
        deductible = sum(x["_tva"] for x in depenses if _year_of(x["date"]) == year and _month_of(x["date"]) == m)
        due = collectee - deductible
        tot_col += collectee; tot_ded += deductible
        tva_rows.append({"mois": MONTHS_FR_FULL[m - 1], "collectee": round(collectee, 2),
                         "deductible": round(deductible, 2), "due": round(due, 2)})

    compta = await _compute_compta(year)
    resultat = compta["resultat"]["resultat_net"]
    is_montant = calc_is(resultat, s)

    masse = _num(s.get("masse_salariale_annuelle", 0))
    charges_sociales = {
        "masse_salariale": round(masse, 2),
        "cnss_salariale": round(masse * s["cnss_salariale"] / 100.0, 2),
        "cnss_patronale": round(masse * s["cnss_patronale"] / 100.0, 2),
        "amo_patronale": round(masse * s["amo_patronale"] / 100.0, 2),
        "taxe_formation": round(masse * s["taxe_formation"] / 100.0, 2),
    }
    charges_sociales["total_patronal"] = round(
        charges_sociales["cnss_patronale"] + charges_sociales["amo_patronale"] + charges_sociales["taxe_formation"], 2)

    return {
        "tva": {"rows": tva_rows, "total_collectee": round(tot_col, 2), "total_deductible": round(tot_ded, 2),
                "total_due": round(tot_col - tot_ded, 2)},
        "is": {"resultat_net": resultat, "montant": is_montant, "taux_effectif": round(is_montant / resultat * 100.0, 2) if resultat > 0 else 0.0},
        "charges_sociales": charges_sociales,
        "settings": s,
    }


# ----------------------------- Créances & Dettes -----------------------------
@analytics_router.get("/creances-dettes")
async def creances_dettes(user=protect):
    factures, depenses, _, _, _ = await _load_all()
    creances = [{"numero": f["numero"], "client_nom": f["client_nom"], "montant_ttc": f["montant_ttc"],
                 "encaisse": f["montant_encaisse"], "solde_du": f["solde_du"], "jours_retard": f["jours_retard"],
                 "date_echeance": f.get("date_echeance"), "statut": f["statut"]}
                for f in factures if f["solde_du"] > 0.01]
    creances.sort(key=lambda x: -x["jours_retard"])
    dettes = [{"date": d["date"], "fournisseur": d.get("fournisseur", ""), "categorie": d["categorie"],
               "montant_ttc": compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))[1]}
              for d in depenses if d.get("statut_paiement") == "Impayée"]
    return {"creances": creances, "dettes": dettes,
            "total_creances": round(sum(c["solde_du"] for c in creances), 2),
            "total_dettes": round(sum(d["montant_ttc"] for d in dettes), 2)}


# ----------------------------- Budget comparaison -----------------------------
@analytics_router.get("/budget-comparaison/{annee}")
async def budget_comparaison(annee: int, user=protect):
    from routes import read_budget
    budget = await read_budget(annee, user)
    factures, depenses, _, _, _ = await _load_all()
    ca_reel = sum(_num(f["montant_ht"]) for f in factures if _year_of(f["date_emission"]) == annee)
    dep_reel = sum(compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))[1] for d in depenses if _year_of(d["date"]) == annee)
    ca_budget = sum(sum(v) for v in budget.get("ca", {}).values())
    dep_budget = sum(sum(v) for v in budget.get("depenses", {}).values())
    return {
        "ca": {"budget": round(ca_budget, 2), "reel": round(ca_reel, 2), "ecart": round(ca_reel - ca_budget, 2),
               "ecart_pct": round((ca_reel - ca_budget) / ca_budget * 100, 1) if ca_budget else 0},
        "depenses": {"budget": round(dep_budget, 2), "reel": round(dep_reel, 2), "ecart": round(dep_reel - dep_budget, 2),
                     "ecart_pct": round((dep_reel - dep_budget) / dep_budget * 100, 1) if dep_budget else 0},
        "benefice": {"budget": round(ca_budget - dep_budget, 2), "reel": round(ca_reel - dep_reel, 2)},
    }


# ----------------------------- Rapports -----------------------------
async def _rapport_data(periode, annee, mois):
    factures, depenses, paiements, projects, _ = await _load_all()

    def in_period(dstr):
        if _year_of(dstr) != annee:
            return False
        if periode == "mensuel":
            return _month_of(dstr) == mois
        if periode == "trimestriel":
            m = _month_of(dstr) or 1
            return (m - 1) // 3 == (mois - 1) // 3
        return True

    ca = sum(_num(f["montant_ht"]) for f in factures if in_period(f["date_emission"]))
    dep = sum(compute_tva(_num(d["montant_ht"]), _num(d.get("tva_pct", 20)))[1] for d in depenses if in_period(d["date"]))
    dep_ht = sum(_num(d["montant_ht"]) for d in depenses if in_period(d["date"]))
    encaisse = sum(_num(p["montant"]) for p in paiements if in_period(p["date"]))
    nb_factures = sum(1 for f in factures if in_period(f["date_emission"]))
    a_encaisser = sum(f["solde_du"] for f in factures if f["solde_du"] > 0.01)
    return {
        "periode": periode, "annee": annee, "mois": mois,
        "chiffre_affaires": round(ca, 2), "depenses": round(dep, 2),
        "benefice": round(ca - dep_ht, 2), "encaisse": round(encaisse, 2),
        "nb_factures": nb_factures, "a_encaisser": round(a_encaisser, 2),
    }


@analytics_router.get("/rapports")
async def rapports(periode: str = "mensuel", annee: int = None, mois: int = None, user=protect):
    now = date.today()
    return await _rapport_data(periode, annee or now.year, mois or now.month)


def _fmt(v):
    return f"{v:,.2f}".replace(",", " ").replace(".", ",") + " DH"


@analytics_router.get("/rapports/pdf")
async def rapport_pdf(periode: str = "mensuel", annee: int = None, mois: int = None, user=protect):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    now = date.today()
    annee = annee or now.year
    mois = mois or now.month
    data = await _rapport_data(periode, annee, mois)

    label = {"mensuel": f"Mensuel — {MONTHS_FR_FULL[mois - 1]} {annee}",
             "trimestriel": f"Trimestriel — T{(mois - 1) // 3 + 1} {annee}",
             "annuel": f"Annuel — {annee}"}[periode]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=25 * mm, leftMargin=20 * mm, rightMargin=20 * mm)
    styles = getSampleStyleSheet()
    navy = colors.HexColor("#1F3864")
    title_style = ParagraphStyle("t", parent=styles["Title"], textColor=navy, fontSize=20)
    sub = ParagraphStyle("s", parent=styles["Normal"], textColor=colors.HexColor("#64748B"), fontSize=11)
    elems = [Paragraph(f"{COMPANY_NAME} — Rapport Financier", title_style), Spacer(1, 4),
             Paragraph(label, sub), Spacer(1, 16)]

    rows = [
        ["Indicateur", "Valeur"],
        ["Chiffre d'affaires (HT)", _fmt(data["chiffre_affaires"])],
        ["Dépenses (TTC)", _fmt(data["depenses"])],
        ["Bénéfice net", _fmt(data["benefice"])],
        ["Montant encaissé", _fmt(data["encaisse"])],
        ["Nombre de factures", str(data["nb_factures"])],
        ["Créances à encaisser", _fmt(data["a_encaisser"])],
    ]
    t = Table(rows, colWidths=[100 * mm, 60 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elems += [t, Spacer(1, 20),
              Paragraph(f"Généré le {now.strftime('%d/%m/%Y')} — Devise : Dirham marocain (DH)", sub)]
    doc.build(elems)
    buf.seek(0)
    fname = f"rapport_{periode}_{annee}_{mois}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})
