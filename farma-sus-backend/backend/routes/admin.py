"""API da área administrativa (/api/admin/*), integrada ao Cloud Firestore.

Níveis de acesso, do menor para o maior privilégio:
    paciente   -> padrão; todo cadastro novo nasce assim
    farmacêutico  -> concedido SOMENTE por esta API, elevando um paciente existente
    admin      -> criado fora da tela (python create_user.py ... admin)

O papel (role) nunca vem do navegador: só este módulo o altera.

Coleções usadas (Coloque aqui as informações do BD do FarmaSUS):
"""

from datetime import datetime, timedelta, timezone
import re

from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from ..firebase import auth_client, db_client
from ..security import ROLE_ALIASES, current_identity, require_firebase_config, require_roles


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# Mesmo formato aceito pela tela: "CRF-PA 1234", "CRF/PA 1234", "CRFPA1234"
CRF_RE = re.compile(r"^CRF[-/\s]?[A-Za-z]{2}[\s-]?\d{2,8}$", re.IGNORECASE)

# Estado do laudo no banco -> o que a tela do admin mostra
EXAM_STATUS = {
    "pending": "under_review",
    "under_review": "under_review",
    "approved": "approved",
    "linked": "approved",
    "released": "approved",
    "rejected": "denied",
    "denied": "denied",
}


class DomainError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@admin_bp.errorhandler(DomainError)
def _handle_domain_error(error):
    return jsonify(error=error.message), error.status_code


@admin_bp.before_request
def _check_firebase_config():
    # Roda antes de qualquer rota do blueprint; devolve 503 se faltar configuração.
    return require_firebase_config()


def _role_of(data):
    raw = (data or {}).get("role")
    return ROLE_ALIASES.get(raw, raw)


def _text(value, label, max_length=120):
    text = str(value or "").strip()
    if not text:
        raise DomainError(f"Informe {label}.", 422)
    if len(text) > max_length:
        raise DomainError(f"{label.capitalize()} deve ter no máximo {max_length} caracteres.", 422)
    return text


def _crf(value):
    crf = _text(value, "o CRF", 30)
    if not CRF_RE.match(crf):
        raise DomainError('Informe o CRF no formato "CRF-PA 0000".', 422)
    return crf


def _unit(db, unit_id):
    unit_id = _text(unit_id, "a unidade", 80)
    snapshot = db.collection("units").document(unit_id).get()
    if not snapshot.exists:
        raise DomainError("Unidade não encontrada.", 422)
    return unit_id, (snapshot.to_dict() or {}).get("name") or unit_id


def _non_negative_int(value, label):
    # bool é subclasse de int em Python: True não pode passar como 1.
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise DomainError(f"{label} deve ser um número inteiro igual ou maior que zero.", 422)
    return value


def _pharmacist_payload(snapshot):
    data = snapshot.to_dict() or {}
    return {
        "id": snapshot.id,
        "name": data.get("name") or "",
        "cpf": data.get("cpf") or "",
        "email": data.get("email") or "",
        "crf": data.get("crf") or "",
        "unitId": data.get("unitId") or "",
        "unitName": data.get("unitName") or "",
        "active": data.get("active") is True,
    }


def _load_pharmacist(db, pharmacist_id):
    ref = db.collection("users").document(pharmacist_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise DomainError("Farmacêutico não encontrado.", 404)
    if _role_of(snapshot.to_dict()) != "pharmacist":
        raise DomainError("Este usuário não é farmacêutico.", 409)
    return ref, snapshot


# ---------------------------------------------------------------- unidades

@admin_bp.get("/units")
@require_roles("admin")
def list_units():
    units = db_client().collection("units").stream()
    return jsonify(units=[
        {"id": unit.id, "name": (unit.to_dict() or {}).get("name") or unit.id}
        for unit in units
    ])


# ----------------------------------------------------------- farmacêuticos

@admin_bp.get("/pharmacists")
@require_roles("admin")
def list_pharmacists():
    snapshots = db_client().collection("users").where("role", "==", "pharmacist").stream()
    return jsonify(pharmacists=[_pharmacist_payload(snapshot) for snapshot in snapshots])


@admin_bp.post("/pharmacists")
@require_roles("admin")
def grant_pharmacist():
    """Eleva um paciente já cadastrado para farmacêutico. Não cria conta nem senha."""
    body = request.get_json(silent=True) or {}
    user_id = _text(body.get("userId"), "o usuário", 128)
    crf = _crf(body.get("crf"))
    db = db_client()
    unit_id, unit_name = _unit(db, body.get("unitId"))

    ref = db.collection("users").document(user_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise DomainError("Usuário não encontrado.", 404)
    if _role_of(snapshot.to_dict()) != "patient":
        raise DomainError("Este usuário já possui acesso elevado.", 409)

    # Só estes campos são gravados; qualquer "role" enviado no corpo é ignorado.
    ref.update({
        "role": "pharmacist",
        "active": True,
        "crf": crf,
        "unitId": unit_id,
        "unitName": unit_name,
        "grantedBy": current_identity()["uid"],
        "grantedAt": firestore.SERVER_TIMESTAMP,
    })
    return jsonify(pharmacist=_pharmacist_payload(ref.get())), 201


@admin_bp.patch("/pharmacists/<pharmacist_id>")
@require_roles("admin")
def update_pharmacist(pharmacist_id):
    """Aceita somente crf, unitId e active. Nome, CPF e e-mail são do perfil da pessoa."""
    body = request.get_json(silent=True) or {}
    db = db_client()
    ref, _snapshot = _load_pharmacist(db, pharmacist_id)

    changes = {}
    if "crf" in body:
        changes["crf"] = _crf(body["crf"])
    if "unitId" in body:
        changes["unitId"], changes["unitName"] = _unit(db, body["unitId"])
    if "active" in body:
        if not isinstance(body["active"], bool):
            raise DomainError("O campo active deve ser verdadeiro ou falso.", 422)
        changes["active"] = body["active"]
    if not changes:
        raise DomainError("Nenhuma alteração válida foi enviada.", 422)

    ref.update(changes)
    if changes.get("active") is False:
        try:
            # Derruba sessões já abertas; o bloqueio em si vem de active=False.
            auth_client().revoke_refresh_tokens(pharmacist_id)
        except Exception:
            pass
    return jsonify(pharmacist=_pharmacist_payload(ref.get()))


# ---------------------------------------------------------------- pacientes

def _med_status(exam_status, medicine_quantity):
    if exam_status == "released":
        return "withdrawn"
    if exam_status in ("approved", "linked"):
        return "available" if (medicine_quantity or 0) > 0 else "out"
    return None


def _patient_rows(db):
    """Um registro por paciente, com o laudo mais recente e a situação do medicamento."""
    stock = {}
    for medicine in db.collection("medicines").stream():
        data = medicine.to_dict() or {}
        stock[(data.get("name"), data.get("unitId"))] = int(data.get("quantity") or 0)

    latest = {}
    for exam in db.collection("exams").stream():
        data = exam.to_dict() or {}
        patient_id = data.get("patientId")
        sent = data.get("submittedAt")
        if patient_id and (patient_id not in latest or _newer(sent, latest[patient_id][0])):
            latest[patient_id] = (sent, data)

    rows = []
    for patient in db.collection("users").where("role", "==", "patient").stream():
        data = patient.to_dict() or {}
        _sent, exam = latest.get(patient.id, (None, {}))
        raw_status = exam.get("status")
        quantity = stock.get((exam.get("medicineName"), exam.get("unitId")))
        rows.append({
            "id": patient.id,
            "name": data.get("name") or "",
            "cpf": data.get("cpf") or "",
            "email": data.get("email") or "",
            "unitName": data.get("unitName") or "",
            "examStatus": EXAM_STATUS.get(raw_status),
            "medStatus": _med_status(raw_status, quantity),
            "medicine": exam.get("medicineName") or "",
        })
    return rows


@admin_bp.get("/users")
@require_roles("admin")
def list_patients():
    return jsonify(users=_patient_rows(db_client()))


def _newer(candidate, current):
    if candidate is None:
        return False
    if current is None:
        return True
    return candidate > current


# ------------------------------------------------------------------ estoque

@admin_bp.get("/stock")
@require_roles("admin")
def list_stock():
    db = db_client()
    unit_names = {
        unit.id: (unit.to_dict() or {}).get("name") or unit.id
        for unit in db.collection("units").stream()
    }
    items = []
    for medicine in db.collection("medicines").stream():
        data = medicine.to_dict() or {}
        items.append({
            "id": medicine.id,
            "medicine": data.get("name") or "Medicamento",
            "unitName": unit_names.get(data.get("unitId"), data.get("unitName") or ""),
            "quantity": int(data.get("quantity") or 0),
            "minimum": int(data.get("minimum") or 0),
        })
    return jsonify(stock=items)


@admin_bp.patch("/stock/<medicine_id>")
@require_roles("admin")
def update_stock(medicine_id):
    body = request.get_json(silent=True) or {}
    quantity = _non_negative_int(body.get("quantity"), "A quantidade")
    minimum = _non_negative_int(body.get("minimum"), "O estoque mínimo")

    ref = db_client().collection("medicines").document(medicine_id)
    if not ref.get().exists:
        raise DomainError("Medicamento não encontrado.", 404)
    ref.update({"quantity": quantity, "minimum": minimum})
    return jsonify(id=medicine_id, quantity=quantity, minimum=minimum)


# ------------------------------------------------------------------ resumo

def _week_buckets(now, weeks=7):
    start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return [start - timedelta(weeks=weeks - 1 - index) for index in range(weeks)]


@admin_bp.get("/summary")
@require_roles("admin")
def summary():
    db = db_client()
    rows = _patient_rows(db)
    pharmacists = db.collection("users").where("role", "==", "pharmacist").stream()
    active_pharmacists = sum(1 for p in pharmacists if (p.to_dict() or {}).get("active") is True)

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    buckets = _week_buckets(now)
    weeks = [0] * len(buckets)
    exams = {"approved": 0, "under_review": 0, "denied": 0}
    reports_month = 0

    for snapshot in db.collection("exams").stream():
        data = snapshot.to_dict() or {}
        mapped = EXAM_STATUS.get(data.get("status"))
        if mapped:
            exams[mapped] += 1
        sent = data.get("submittedAt")
        if isinstance(sent, datetime) and sent >= month_start:
            reports_month += 1
        # Campo assumido: reviewedAt = quando o farmacêutico analisou o laudo.
        reviewed = data.get("reviewedAt")
        if isinstance(reviewed, datetime):
            for index in range(len(buckets) - 1, -1, -1):
                if reviewed >= buckets[index]:
                    weeks[index] += 1
                    break

    def count(field, value):
        return sum(1 for row in rows if row[field] == value)

    return jsonify(
        patients=len(rows),
        reportsMonth=reports_month,
        notifications=0,  # ainda não existe coleção de notificações
        activePharmacists=active_pharmacists,
        awaitingMedicine=sum(
            1 for row in rows
            if row["examStatus"] == "approved" and row["medStatus"] != "withdrawn"
        ),
        exams=exams,
        medicines={
            "withdrawn": count("medStatus", "withdrawn"),
            "available": count("medStatus", "available"),
            "out": count("medStatus", "out"),
        },
        weeks=weeks,
    )