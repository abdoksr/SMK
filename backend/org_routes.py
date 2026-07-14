from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date
import uuid
import os
import logging
import bcrypt
import jwt

from db import client

# ------------------------------------------------------------------ DB (org uses its own database on the same Atlas cluster)
db = client[os.environ.get("DB_NAME_ORG", "smk_org")]

JWT_SECRET_ORG = os.environ["JWT_SECRET_ORG"]
JWT_ALGORITHM = "HS256"

org_router = APIRouter(prefix="/api/org", tags=["org"])

logger = logging.getLogger("smk.org")


# ------------------------------------------------------------------ helpers
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET_ORG, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, JWT_SECRET_ORG, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ------------------------------------------------------------------ models
class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ProjectBody(BaseModel):
    name: str
    reference: Optional[str] = None
    type: Optional[str] = "architecture"
    discipline: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    program: Optional[str] = None
    surface: Optional[str] = None
    status: Optional[str] = "prospect"
    priority: Optional[str] = "normale"
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    next_step_text: Optional[str] = None
    notes: Optional[str] = None
    template_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    reference: Optional[str] = None
    type: Optional[str] = None
    discipline: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    program: Optional[str] = None
    surface: Optional[str] = None
    status: Optional[str] = None
    current_step_id: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    next_step_text: Optional[str] = None
    notes: Optional[str] = None


class StepBody(BaseModel):
    name: str
    status: Optional[str] = "non_commencee"
    order: Optional[int] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = 0
    notes: Optional[str] = None


class StepUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    order: Optional[int] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    notes: Optional[str] = None


class SubItem(BaseModel):
    title: Optional[str] = None
    label: Optional[str] = None
    done: bool = False


class TaskBody(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    step_id: Optional[str] = None
    priority: Optional[str] = "normale"
    status: Optional[str] = "a_faire"
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    subtasks: Optional[List[dict]] = None
    checklist: Optional[List[dict]] = None
    reminder_at: Optional[str] = None
    notes: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    step_id: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    subtasks: Optional[List[dict]] = None
    checklist: Optional[List[dict]] = None
    reminder_at: Optional[str] = None
    notes: Optional[str] = None


# ------------------------------------------------------------------ progress
async def recompute_progress(project_id: str, owner_id: str):
    steps = await db.project_steps.find(
        {"project_id": project_id, "owner_id": owner_id}, {"_id": 0}
    ).to_list(500)
    if not steps:
        progress = 0
    else:
        progress = round(sum(s.get("progress", 0) for s in steps) / len(steps))
    await db.projects.update_one(
        {"id": project_id, "owner_id": owner_id},
        {"$set": {"progress": progress, "updated_at": now_iso()}},
    )
    return progress


# ------------------------------------------------------------------ auth routes
@org_router.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]},
    }


@org_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ------------------------------------------------------------------ templates
@org_router.get("/project-templates")
async def get_templates(user: dict = Depends(get_current_user)):
    tpls = await db.project_templates.find({}, {"_id": 0}).to_list(50)
    return tpls


# ------------------------------------------------------------------ projects
@org_router.get("/projects")
async def list_projects(
    status: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = {"owner_id": user["id"]}
    if status:
        q["status"] = status
    if type:
        q["type"] = type
    if priority:
        q["priority"] = priority
    projects = await db.projects.find(q, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return projects


@org_router.post("/projects")
async def create_project(body: ProjectBody, user: dict = Depends(get_current_user)):
    pid = new_id()
    doc = {
        "id": pid,
        "owner_id": user["id"],
        "name": body.name,
        "reference": body.reference,
        "type": body.type,
        "discipline": body.discipline,
        "client_name": body.client_name,
        "address": body.address,
        "city": body.city,
        "description": body.description,
        "program": body.program,
        "surface": body.surface,
        "status": body.status or "prospect",
        "current_step_id": None,
        "priority": body.priority or "normale",
        "start_date": body.start_date,
        "target_date": body.target_date,
        "progress": 0,
        "next_step_text": body.next_step_text,
        "notes": body.notes,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.projects.insert_one(doc)

    if body.template_id:
        tpl = await db.project_templates.find_one({"id": body.template_id}, {"_id": 0})
        if tpl:
            if not body.type or body.type == "architecture":
                await db.projects.update_one(
                    {"id": pid}, {"$set": {"type": tpl.get("type", body.type)}}
                )
            step_name_to_id = {}
            for s in sorted(tpl.get("steps", []), key=lambda x: x.get("order", 0)):
                sid = new_id()
                step_name_to_id[s["name"]] = sid
                await db.project_steps.insert_one({
                    "id": sid,
                    "owner_id": user["id"],
                    "project_id": pid,
                    "name": s["name"],
                    "status": "non_commencee",
                    "order": s.get("order", 0),
                    "start_date": None,
                    "target_date": None,
                    "progress": 0,
                    "notes": None,
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                })
            for t in tpl.get("tasks", []):
                await db.tasks.insert_one({
                    "id": new_id(),
                    "owner_id": user["id"],
                    "title": t["title"],
                    "description": None,
                    "project_id": pid,
                    "step_id": step_name_to_id.get(t.get("step_name")),
                    "priority": "normale",
                    "status": "a_faire",
                    "start_date": None,
                    "due_date": None,
                    "estimated_duration_minutes": None,
                    "subtasks": [],
                    "checklist": [],
                    "reminder_at": None,
                    "notes": None,
                    "responsible_id": user["id"],
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                })
    doc = await db.projects.find_one({"id": pid}, {"_id": 0})
    return doc


@org_router.get("/projects/{pid}")
async def get_project(pid: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": pid, "owner_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return p


@org_router.put("/projects/{pid}")
async def update_project(pid: str, body: ProjectUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    updates["updated_at"] = now_iso()
    res = await db.projects.update_one(
        {"id": pid, "owner_id": user["id"]}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return await db.projects.find_one({"id": pid}, {"_id": 0})


@org_router.delete("/projects/{pid}")
async def delete_project(pid: str, user: dict = Depends(get_current_user)):
    res = await db.projects.update_one(
        {"id": pid, "owner_id": user["id"]},
        {"$set": {"status": "archive", "updated_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return {"ok": True, "status": "archive"}


# ------------------------------------------------------------------ steps
@org_router.get("/projects/{pid}/steps")
async def list_steps(pid: str, user: dict = Depends(get_current_user)):
    steps = await db.project_steps.find(
        {"project_id": pid, "owner_id": user["id"]}, {"_id": 0}
    ).sort("order", 1).to_list(500)
    return steps


@org_router.post("/projects/{pid}/steps")
async def create_step(pid: str, body: StepBody, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": pid, "owner_id": user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    order = body.order
    if order is None:
        count = await db.project_steps.count_documents(
            {"project_id": pid, "owner_id": user["id"]}
        )
        order = count
    doc = {
        "id": new_id(),
        "owner_id": user["id"],
        "project_id": pid,
        "name": body.name,
        "status": body.status or "non_commencee",
        "order": order,
        "start_date": body.start_date,
        "target_date": body.target_date,
        "progress": body.progress or 0,
        "notes": body.notes,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.project_steps.insert_one(doc)
    await recompute_progress(pid, user["id"])
    return clean(doc)


@org_router.put("/steps/{sid}")
async def update_step(sid: str, body: StepUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "status" in updates:
        if updates["status"] == "terminee":
            updates["progress"] = 100
        elif updates["status"] == "non_commencee" and "progress" not in updates:
            updates["progress"] = 0
    updates["updated_at"] = now_iso()
    step = await db.project_steps.find_one({"id": sid, "owner_id": user["id"]})
    if not step:
        raise HTTPException(status_code=404, detail="Étape introuvable")
    await db.project_steps.update_one({"id": sid}, {"$set": updates})
    await recompute_progress(step["project_id"], user["id"])
    return await db.project_steps.find_one({"id": sid}, {"_id": 0})


@org_router.delete("/steps/{sid}")
async def delete_step(sid: str, user: dict = Depends(get_current_user)):
    step = await db.project_steps.find_one({"id": sid, "owner_id": user["id"]})
    if not step:
        raise HTTPException(status_code=404, detail="Étape introuvable")
    await db.project_steps.delete_one({"id": sid})
    await recompute_progress(step["project_id"], user["id"])
    return {"ok": True}


# ------------------------------------------------------------------ tasks
@org_router.get("/tasks")
async def list_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    view: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = {"owner_id": user["id"]}
    if project_id:
        q["project_id"] = project_id
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority

    tasks = await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

    if view:
        today = date.today().isoformat()
        week_end = (date.today() + timedelta(days=7)).isoformat()
        open_statuses = {"a_faire", "en_cours", "en_attente", "bloquee", "a_verifier"}

        def due(t):
            return (t.get("due_date") or "")[:10]

        if view == "today":
            tasks = [t for t in tasks if due(t) == today and t["status"] in open_statuses]
        elif view == "week":
            tasks = [
                t for t in tasks
                if due(t) and today <= due(t) <= week_end and t["status"] in open_statuses
            ]
        elif view == "overdue":
            tasks = [
                t for t in tasks
                if due(t) and due(t) < today and t["status"] in open_statuses
            ]
    return tasks


@org_router.post("/tasks")
async def create_task(body: TaskBody, user: dict = Depends(get_current_user)):
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="Le titre est obligatoire")
    doc = {
        "id": new_id(),
        "owner_id": user["id"],
        "title": body.title.strip(),
        "description": body.description,
        "project_id": body.project_id,
        "step_id": body.step_id,
        "priority": body.priority or "normale",
        "status": body.status or "a_faire",
        "start_date": body.start_date,
        "due_date": body.due_date,
        "estimated_duration_minutes": body.estimated_duration_minutes,
        "subtasks": body.subtasks or [],
        "checklist": body.checklist or [],
        "reminder_at": body.reminder_at,
        "notes": body.notes,
        "responsible_id": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    return clean(doc)


@org_router.get("/tasks/{tid}")
async def get_task(tid: str, user: dict = Depends(get_current_user)):
    t = await db.tasks.find_one({"id": tid, "owner_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return t


@org_router.put("/tasks/{tid}")
async def update_task(tid: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    updates["updated_at"] = now_iso()
    res = await db.tasks.update_one(
        {"id": tid, "owner_id": user["id"]}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return await db.tasks.find_one({"id": tid}, {"_id": 0})


@org_router.delete("/tasks/{tid}")
async def delete_task(tid: str, user: dict = Depends(get_current_user)):
    res = await db.tasks.delete_one({"id": tid, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return {"ok": True}


# ------------------------------------------------------------------ dashboard
@org_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    oid = user["id"]
    today = date.today().isoformat()
    open_statuses = {"a_faire", "en_cours", "en_attente", "bloquee", "a_verifier"}
    tasks = await db.tasks.find({"owner_id": oid}, {"_id": 0}).to_list(2000)

    def due(t):
        return (t.get("due_date") or "")[:10]

    today_tasks = [t for t in tasks if due(t) == today and t["status"] in open_statuses]
    overdue = [t for t in tasks if due(t) and due(t) < today and t["status"] in open_statuses]
    urgent = [t for t in tasks if t.get("priority") == "urgente" and t["status"] in open_statuses]

    projects = await db.projects.find(
        {"owner_id": oid, "status": {"$nin": ["termine", "archive"]}}, {"_id": 0}
    ).to_list(500)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    stale = [p for p in projects if (p.get("updated_at") or "") < cutoff]

    docs = await db.documents.find({"owner_id": oid}, {"_id": 0}).to_list(3000)
    documents_a_verifier = len([d for d in docs if d.get("status") == "a_verifier"])
    cutoff3 = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    documents_a_preparer = len([
        d for d in docs
        if d.get("status") == "brouillon" and (d.get("created_at") or "") < cutoff3
    ])

    contacts = await db.contacts.find({"owner_id": oid}, {"_id": 0}).to_list(3000)
    clients_a_relancer = len([
        c for c in contacts
        if c.get("next_action_date") and c["next_action_date"][:10] <= today
        and c.get("status") != "archive"
    ])

    week_end = (date.today() + timedelta(days=7)).isoformat()
    meetings = await db.meetings.find({"owner_id": oid}, {"_id": 0}).to_list(3000)
    prochains_rendez_vous = len([
        m for m in meetings
        if m.get("date") and today <= m["date"][:10] <= week_end
    ])

    decisions_recentes = await db.decisions.count_documents({"owner_id": oid})
    notes_importantes = await db.notes.count_documents({"owner_id": oid, "pinned": True})

    return {
        "today_tasks": len(today_tasks),
        "overdue_tasks": len(overdue),
        "urgent_tasks": len(urgent),
        "active_projects": len(projects),
        "stale_projects": len(stale),
        "documents_a_verifier": documents_a_verifier,
        "documents_a_preparer": documents_a_preparer,
        "clients_a_relancer": clients_a_relancer,
        "prochains_rendez_vous": prochains_rendez_vous,
        "decisions_recentes": decisions_recentes,
        "notes_importantes": notes_importantes,
    }


# ==================================================================
# PHASE 2 — Contacts, Documents, Meetings, Decisions, Notes
# ==================================================================
def strip_none(model: BaseModel) -> dict:
    return {k: v for k, v in model.model_dump().items() if v is not None}


# ------------------------------------------------------------------ contacts
class ContactBody(BaseModel):
    name: str
    organization: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = "prospect"
    status: Optional[str] = "nouveau"
    source: Optional[str] = None
    project_ids: Optional[List[str]] = None
    last_contact_date: Optional[str] = None
    next_action_text: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(ContactBody):
    name: Optional[str] = None


@org_router.get("/contacts")
async def list_contacts(type: Optional[str] = None, status: Optional[str] = None,
                        user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if type:
        q["type"] = type
    if status:
        q["status"] = status
    return await db.contacts.find(q, {"_id": 0}).sort("updated_at", -1).to_list(2000)


@org_router.post("/contacts")
async def create_contact(body: ContactBody, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(), "owner_id": user["id"], **body.model_dump(),
        "project_ids": body.project_ids or [],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.contacts.insert_one(doc)
    return clean(doc)


@org_router.get("/contacts/{cid}")
async def get_contact(cid: str, user: dict = Depends(get_current_user)):
    c = await db.contacts.find_one({"id": cid, "owner_id": user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    pids = c.get("project_ids", [])
    projects = await db.projects.find({"id": {"$in": pids}, "owner_id": user["id"]}, {"_id": 0}).to_list(500)
    meetings = await db.meetings.find({"contact_id": cid, "owner_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(500)
    notes = await db.notes.find({"contact_id": cid, "owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    documents = await db.documents.find({"project_id": {"$in": pids}, "owner_id": user["id"]}, {"_id": 0}).to_list(500)
    return {"contact": c, "projects": projects, "meetings": meetings, "notes": notes, "documents": documents}


@org_router.put("/contacts/{cid}")
async def update_contact(cid: str, body: ContactUpdate, user: dict = Depends(get_current_user)):
    updates = strip_none(body)
    updates["updated_at"] = now_iso()
    res = await db.contacts.update_one({"id": cid, "owner_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    return await db.contacts.find_one({"id": cid}, {"_id": 0})


@org_router.delete("/contacts/{cid}")
async def delete_contact(cid: str, user: dict = Depends(get_current_user)):
    res = await db.contacts.delete_one({"id": cid, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    return {"ok": True}


# ------------------------------------------------------------------ documents
class DocumentBody(BaseModel):
    title: str
    project_id: Optional[str] = None
    step_id: Optional[str] = None
    category: Optional[str] = "plan"
    version: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = "brouillon"
    external_link: Optional[str] = None
    comment: Optional[str] = None
    notes: Optional[str] = None


class DocumentUpdate(DocumentBody):
    title: Optional[str] = None


@org_router.get("/documents")
async def list_documents(project_id: Optional[str] = None, category: Optional[str] = None,
                         status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if project_id:
        q["project_id"] = project_id
    if category:
        q["category"] = category
    if status:
        q["status"] = status
    return await db.documents.find(q, {"_id": 0}).sort("updated_at", -1).to_list(3000)


@org_router.post("/documents")
async def create_document(body: DocumentBody, user: dict = Depends(get_current_user)):
    # obsolescence rule: any existing doc with same title + project_id becomes obsolete
    if body.project_id:
        await db.documents.update_many(
            {"owner_id": user["id"], "title": body.title, "project_id": body.project_id},
            {"$set": {"status": "obsolete", "updated_at": now_iso()}},
        )
    doc = {
        "id": new_id(), "owner_id": user["id"], **body.model_dump(),
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.documents.insert_one(doc)
    return clean(doc)


@org_router.put("/documents/{did}")
async def update_document(did: str, body: DocumentUpdate, user: dict = Depends(get_current_user)):
    updates = strip_none(body)
    updates["updated_at"] = now_iso()
    res = await db.documents.update_one({"id": did, "owner_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document introuvable")
    return await db.documents.find_one({"id": did}, {"_id": 0})


@org_router.delete("/documents/{did}")
async def delete_document(did: str, user: dict = Depends(get_current_user)):
    res = await db.documents.delete_one({"id": did, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document introuvable")
    return {"ok": True}


# ------------------------------------------------------------------ meetings
class MeetingBody(BaseModel):
    title: str
    project_id: Optional[str] = None
    contact_id: Optional[str] = None
    type: Optional[str] = "reunion_client"
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    video_link: Optional[str] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    decisions_text: Optional[str] = None
    actions: Optional[List[dict]] = None
    document_ids: Optional[List[str]] = None
    next_step_text: Optional[str] = None


class MeetingUpdate(MeetingBody):
    title: Optional[str] = None


@org_router.get("/meetings")
async def list_meetings(project_id: Optional[str] = None, type: Optional[str] = None,
                        date_from: Optional[str] = None, date_to: Optional[str] = None,
                        user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if project_id:
        q["project_id"] = project_id
    if type:
        q["type"] = type
    if date_from or date_to:
        q["date"] = {}
        if date_from:
            q["date"]["$gte"] = date_from
        if date_to:
            q["date"]["$lte"] = date_to
    return await db.meetings.find(q, {"_id": 0}).sort("date", -1).to_list(2000)


@org_router.post("/meetings")
async def create_meeting(body: MeetingBody, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(), "owner_id": user["id"], **body.model_dump(),
        "actions": body.actions or [], "document_ids": body.document_ids or [],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.meetings.insert_one(doc)
    return clean(doc)


@org_router.get("/meetings/{mid}")
async def get_meeting(mid: str, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": mid, "owner_id": user["id"]}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    return m


@org_router.put("/meetings/{mid}")
async def update_meeting(mid: str, body: MeetingUpdate, user: dict = Depends(get_current_user)):
    updates = strip_none(body)
    updates["updated_at"] = now_iso()
    res = await db.meetings.update_one({"id": mid, "owner_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    return await db.meetings.find_one({"id": mid}, {"_id": 0})


@org_router.delete("/meetings/{mid}")
async def delete_meeting(mid: str, user: dict = Depends(get_current_user)):
    res = await db.meetings.delete_one({"id": mid, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    return {"ok": True}


@org_router.post("/meetings/{mid}/actions/{action_index}/convert-to-task")
async def meeting_action_to_task(mid: str, action_index: int, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": mid, "owner_id": user["id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    actions = m.get("actions", [])
    if action_index < 0 or action_index >= len(actions):
        raise HTTPException(status_code=404, detail="Action introuvable")
    action = actions[action_index]
    # idempotency: if already converted, return the existing task, do not create a duplicate
    existing_id = action.get("converted_to_task_id")
    if existing_id:
        existing = await db.tasks.find_one({"id": existing_id, "owner_id": user["id"]}, {"_id": 0})
        if existing:
            return {"ok": True, "task_id": existing_id, "already_converted": True,
                    "meeting": await db.meetings.find_one({"id": mid}, {"_id": 0})}
    tid = new_id()
    await db.tasks.insert_one({
        "id": tid, "owner_id": user["id"], "title": action.get("text", "Action"),
        "description": None, "project_id": m.get("project_id"), "step_id": None,
        "priority": "normale", "status": "a_faire", "start_date": None, "due_date": None,
        "estimated_duration_minutes": None, "subtasks": [], "checklist": [],
        "reminder_at": None, "notes": f"Issue de la réunion: {m.get('title')}",
        "responsible_id": user["id"], "created_at": now_iso(), "updated_at": now_iso(),
    })
    actions[action_index]["converted_to_task_id"] = tid
    await db.meetings.update_one({"id": mid}, {"$set": {"actions": actions, "updated_at": now_iso()}})
    return {"ok": True, "task_id": tid, "meeting": await db.meetings.find_one({"id": mid}, {"_id": 0})}


@org_router.post("/meetings/{mid}/convert-decision")
async def meeting_to_decision(mid: str, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": mid, "owner_id": user["id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Réunion introuvable")
    text = (m.get("decisions_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Aucune décision à enregistrer")
    doc = {
        "id": new_id(), "owner_id": user["id"], "title": text[:80],
        "description": text, "project_id": m.get("project_id"), "step_id": None,
        "date": m.get("date") or date.today().isoformat(),
        "origin": f"Réunion: {m.get('title')}", "meeting_id": mid,
        "justification": None, "impact": None, "document_id": None,
        "notes": None, "created_at": now_iso(),
    }
    await db.decisions.insert_one(doc)
    return clean(doc)


# ------------------------------------------------------------------ decisions
class DecisionBody(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    step_id: Optional[str] = None
    date: Optional[str] = None
    origin: Optional[str] = None
    meeting_id: Optional[str] = None
    justification: Optional[str] = None
    impact: Optional[str] = None
    document_id: Optional[str] = None
    notes: Optional[str] = None


class DecisionUpdate(DecisionBody):
    title: Optional[str] = None


@org_router.get("/decisions")
async def list_decisions(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if project_id:
        q["project_id"] = project_id
    return await db.decisions.find(q, {"_id": 0}).sort("date", -1).to_list(2000)


@org_router.post("/decisions")
async def create_decision(body: DecisionBody, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(), "owner_id": user["id"], **body.model_dump(),
        "date": body.date or date.today().isoformat(), "created_at": now_iso(),
    }
    await db.decisions.insert_one(doc)
    return clean(doc)


@org_router.put("/decisions/{did}")
async def update_decision(did: str, body: DecisionUpdate, user: dict = Depends(get_current_user)):
    updates = strip_none(body)
    res = await db.decisions.update_one({"id": did, "owner_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Décision introuvable")
    return await db.decisions.find_one({"id": did}, {"_id": 0})


@org_router.delete("/decisions/{did}")
async def delete_decision(did: str, user: dict = Depends(get_current_user)):
    res = await db.decisions.delete_one({"id": did, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Décision introuvable")
    return {"ok": True}


# ------------------------------------------------------------------ notes
class NoteBody(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = "idee"
    project_id: Optional[str] = None
    contact_id: Optional[str] = None
    tags: Optional[List[str]] = None
    pinned: Optional[bool] = False


@org_router.get("/notes")
async def list_notes(category: Optional[str] = None, project_id: Optional[str] = None,
                     pinned: Optional[bool] = None, user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if category:
        q["category"] = category
    if project_id:
        q["project_id"] = project_id
    if pinned is not None:
        q["pinned"] = pinned
    return await db.notes.find(q, {"_id": 0}).sort("updated_at", -1).to_list(2000)


@org_router.post("/notes")
async def create_note(body: NoteBody, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(), "owner_id": user["id"], **body.model_dump(),
        "tags": body.tags or [], "pinned": bool(body.pinned),
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.notes.insert_one(doc)
    return clean(doc)


@org_router.put("/notes/{nid}")
async def update_note(nid: str, body: NoteBody, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    res = await db.notes.update_one({"id": nid, "owner_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note introuvable")
    return await db.notes.find_one({"id": nid}, {"_id": 0})


@org_router.delete("/notes/{nid}")
async def delete_note(nid: str, user: dict = Depends(get_current_user)):
    res = await db.notes.delete_one({"id": nid, "owner_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note introuvable")
    return {"ok": True}


@org_router.post("/notes/{nid}/convert-to-task")
async def note_to_task(nid: str, user: dict = Depends(get_current_user)):
    n = await db.notes.find_one({"id": nid, "owner_id": user["id"]})
    if not n:
        raise HTTPException(status_code=404, detail="Note introuvable")
    title = (n.get("title") or n.get("content") or "Note")[:120]
    tid = new_id()
    await db.tasks.insert_one({
        "id": tid, "owner_id": user["id"], "title": title, "description": n.get("content"),
        "project_id": n.get("project_id"), "step_id": None, "priority": "normale",
        "status": "a_faire", "start_date": None, "due_date": None,
        "estimated_duration_minutes": None, "subtasks": [], "checklist": [],
        "reminder_at": None, "notes": None, "responsible_id": user["id"],
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    return {"ok": True, "task_id": tid}


@org_router.post("/notes/{nid}/convert-to-decision")
async def note_to_decision(nid: str, user: dict = Depends(get_current_user)):
    n = await db.notes.find_one({"id": nid, "owner_id": user["id"]})
    if not n:
        raise HTTPException(status_code=404, detail="Note introuvable")
    doc = {
        "id": new_id(), "owner_id": user["id"],
        "title": (n.get("title") or n.get("content") or "Décision")[:80],
        "description": n.get("content"), "project_id": n.get("project_id"), "step_id": None,
        "date": date.today().isoformat(), "origin": "Note", "meeting_id": None,
        "justification": None, "impact": None, "document_id": None, "notes": None,
        "created_at": now_iso(),
    }
    await db.decisions.insert_one(doc)
    return {"ok": True, "decision_id": doc["id"]}


# ------------------------------------------------------------------ seed
TEMPLATES = [
    {"name": "Villa", "type": "construction_neuve", "steps": [
        "Relevé & programme", "Esquisse (ESQ)", "Avant-projet (APS/APD)",
        "Permis de construire", "Dossier de consultation (DCE)", "Suivi de chantier", "Réception"]},
    {"name": "Appartement", "type": "architecture_interieure", "steps": [
        "Relevé existant", "Concept & moodboard", "Plans d'aménagement",
        "Choix matériaux", "Dossier technique", "Suivi travaux"]},
    {"name": "Commerce", "type": "amenagement", "steps": [
        "Analyse du local", "Concept commercial", "Plans & vitrine",
        "Dossier autorisations", "Chiffrage & DCE", "Chantier & livraison"]},
    {"name": "Restaurant", "type": "amenagement", "steps": [
        "Programme & flux", "Concept & ambiance", "Plans cuisine & salle",
        "Normes & sécurité", "Dossier technique", "Suivi de chantier", "Réception"]},
    {"name": "Bureau", "type": "amenagement", "steps": [
        "Analyse des besoins", "Space planning", "Aménagement & mobilier",
        "Dossier technique", "Chantier & installation"]},
    {"name": "Rénovation intérieure", "type": "renovation", "steps": [
        "Diagnostic existant", "Esquisse rénovation", "Plans détaillés",
        "Dossier travaux", "Suivi de chantier", "Réception"]},
    {"name": "Étude urbaine", "type": "urbanisme", "steps": [
        "Diagnostic territorial", "Enjeux & orientations", "Scénarios d'aménagement",
        "Plan directeur", "Restitution"]},
    {"name": "Concours", "type": "concours", "steps": [
        "Analyse du programme", "Parti architectural", "Développement projet",
        "Rendu & maquette", "Dépôt du concours"]},
    {"name": "Suivi de chantier", "type": "suivi_chantier", "steps": [
        "Préparation chantier", "Installation", "Gros œuvre",
        "Second œuvre", "Finitions", "Réception & levée réserves"]},
]

EXAMPLE_TASKS = {
    "Esquisse (ESQ)": ["Finaliser les plans d'esquisse", "Préparer le rendu client"],
    "Relevé & programme": ["Organiser la visite du terrain"],
}


async def seed():
    email = os.environ.get("FOUNDER_EMAIL", "admin@smk.ma").lower()
    password = os.environ.get("FOUNDER_PASSWORD", "SmkAdmin@2026")
    name = os.environ.get("FOUNDER_NAME", "Studio SMK")

    user = await db.users.find_one({"email": email})
    if not user:
        uid = new_id()
        await db.users.insert_one({
            "id": uid, "email": email, "name": name,
            "password_hash": hash_password(password), "created_at": now_iso(),
        })
        logger.info(f"Seeded founder user {email}")
    else:
        uid = user["id"]
        if not verify_password(password, user["password_hash"]):
            await db.users.update_one(
                {"id": uid}, {"$set": {"password_hash": hash_password(password)}}
            )
            logger.info("Updated founder password from env")

    # templates
    for tpl in TEMPLATES:
        existing = await db.project_templates.find_one({"name": tpl["name"]})
        steps = [{"name": s, "order": i} for i, s in enumerate(tpl["steps"])]
        tasks = []
        for s in tpl["steps"]:
            for tt in EXAMPLE_TASKS.get(s, []):
                tasks.append({"title": tt, "step_name": s})
        payload = {"name": tpl["name"], "type": tpl["type"], "steps": steps, "tasks": tasks}
        if existing:
            await db.project_templates.update_one({"id": existing["id"]}, {"$set": payload})
        else:
            payload["id"] = new_id()
            await db.project_templates.insert_one(payload)

    # example project
    if os.environ.get("SEED_EXAMPLE_PROJECT") == "true":
        existing = await db.projects.find_one({"owner_id": uid, "reference": "SMK-DEMO"})
        if not existing:
            pid = new_id()
            await db.projects.insert_one({
                "id": pid, "owner_id": uid, "name": "Villa Anfa",
                "reference": "SMK-DEMO", "type": "construction_neuve",
                "discipline": "Architecture", "client_name": "Famille Berrada",
                "address": "Boulevard de l'Océan", "city": "Casablanca",
                "description": "Villa contemporaine de 320 m² avec patio et piscine.",
                "program": "R+1, 4 chambres, patio, piscine", "surface": "320 m²",
                "status": "en_cours", "current_step_id": None, "priority": "importante",
                "start_date": date.today().isoformat(),
                "target_date": (date.today() + timedelta(days=180)).isoformat(),
                "progress": 0, "next_step_text": "Valider l'avant-projet avec le client",
                "notes": "Projet de démonstration.",
                "created_at": now_iso(), "updated_at": now_iso(),
            })
            steps_names = TEMPLATES[0]["steps"]
            step_ids = {}
            for i, sn in enumerate(steps_names):
                sid = new_id()
                step_ids[sn] = sid
                st = "terminee" if i == 0 else ("en_cours" if i == 1 else "non_commencee")
                pr = 100 if i == 0 else (40 if i == 1 else 0)
                await db.project_steps.insert_one({
                    "id": sid, "owner_id": uid, "project_id": pid, "name": sn,
                    "status": st, "order": i, "start_date": None, "target_date": None,
                    "progress": pr, "notes": None,
                    "created_at": now_iso(), "updated_at": now_iso(),
                })
            await recompute_progress(pid, uid)
            demo_tasks = [
                ("Finaliser les plans d'esquisse", "Esquisse (ESQ)", "en_cours", "importante",
                 date.today().isoformat()),
                ("Préparer le rendu client", "Esquisse (ESQ)", "a_faire", "urgente",
                 date.today().isoformat()),
                ("Relancer le bureau d'études structure", None, "a_faire", "normale",
                 (date.today() - timedelta(days=2)).isoformat()),
            ]
            for title, sn, stt, pri, dd in demo_tasks:
                await db.tasks.insert_one({
                    "id": new_id(), "owner_id": uid, "title": title, "description": None,
                    "project_id": pid, "step_id": step_ids.get(sn) if sn else None,
                    "priority": pri, "status": stt, "start_date": None, "due_date": dd,
                    "estimated_duration_minutes": None, "subtasks": [], "checklist": [],
                    "reminder_at": None, "notes": None, "responsible_id": uid,
                    "created_at": now_iso(), "updated_at": now_iso(),
                })
            logger.info("Seeded example project Villa Anfa")


async def init_org():
    await db.users.create_index("email", unique=True)
    await db.projects.create_index("owner_id")
    await db.tasks.create_index("owner_id")
    await db.project_steps.create_index([("project_id", 1), ("order", 1)])
    await seed()


@org_router.get("/")
async def org_root():
    return {"message": "SMK Organisation API"}
