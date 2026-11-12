"""API da área do farmacêutico integrada ao Cloud Firestore."""

from datetime import datetime, timezone
import re
import unicodedata

from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from ..firebase import db_client
from ..security import current_identity, require_firebase_config, require_roles


pharmacist_bp = Blueprint("pharmacist", __name__, url_prefix="/api/pharmacist")

STATUS_TO_FRONTEND = {
    "pending": "Pendente",
    "under_review": "Em análise",
    "approved": "Aprovado",
    "linked": "Vinculado",
    "released": "Liberado",
    "rejected": "Reprovado",
    "denied": "Reprovado",
}

ACTION_TRANSITIONS = {
    "start_analysis": ({"pending"}, "under_review", "Análise iniciada"),
    "approve": ({"under_review"}, "approved", "Laudo aprovado"),
    "reject": ({"under_review"}, "rejected", "Laudo reprovado"),
}


class DomainError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _iso(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _normalized(value):
    text = unicodedata.normalize("NFD", str(value or ""))
    return "".join(char for char in text if unicodedata.category(char) != "Mn").lower().strip()


def _status_code(value):
    raw = _normalized(value).replace(" ", "_").replace("-", "_")
    aliases = {
        "pendente": "pending",
        "em_analise": "under_review",
        "aprovado": "approved",
        "vinculado": "linked",
        "liberado": "released",
        "reprovado": "rejected",
        "recusado": "rejected",
    }
    return aliases.get(raw, raw or "pending")


def _history_entry(action, detail, professional):
    return {
        "data": _now_iso(),
        "acao": action,
        "detalhe": detail,
        "responsavel": professional,
    }


def _professional_name(profile, identity):
    name = profile.get("name") or profile.get("nome") or "Farmacêutico"
    registration = profile.get("registration") or profile.get("crf") or ""
    return f"{name} · {registration}" if registration else name


def _exam_payload(snapshot):
    data = snapshot.to_dict() or {}
    patient = data.get("patient") or {}
    link = data.get("link") or data.get("vinculo")
    status = _status_code(data.get("status"))
    return {
        "id": snapshot.id,
        "paciente": {
            "id": patient.get("id") or data.get("patientId") or "",
            "nome": patient.get("nome") or patient.get("name") or data.get("patientName") or "Paciente",
            "cns": patient.get("cns") or data.get("patientCns") or "—",
            "cpf": patient.get("cpf") or data.get("patientCpf") or "—",
        },
        "medicamento": data.get("medicineName") or data.get("medicamento") or "Medicamento não informado",
        "dose": data.get("dose") or data.get("dosage") or "Não informada",
        "prescritor": data.get("prescriber") or data.get("prescritor") or "Não informado",
        "crm": data.get("crm") or data.get("prescriberRegistration") or "—",
        "envio": _iso(data.get("submittedAt") or data.get("envio")),
        "validade": _iso(data.get("expiresAt") or data.get("validade")),
        "prioridade": data.get("priority") or data.get("prioridade") or "Normal",
        "status": STATUS_TO_FRONTEND.get(status, data.get("status") or "Pendente"),
        "arquivo": data.get("fileName") or data.get("arquivo") or "Documento",
        "fileKey": data.get("fileKey") or data.get("storageKey") or "",
        "historico": data.get("history") or data.get("historico") or [],
        "reprovacaoMotivo": data.get("rejectionReason") or data.get("reprovacaoMotivo") or "",
        "vinculo": link,
    }


def _medicine_payload(snapshot):
    data = snapshot.to_dict() or {}
    return {
        "id": snapshot.id,
        "nome": data.get("name") or data.get("nome") or "Medicamento",
        "principioAtivo": data.get("activeIngredient") or data.get("principioAtivo") or "",
        "apresentacao": data.get("presentation") or data.get("apresentacao") or "",
        "lote": data.get("batch") or data.get("lote") or "",
        "quantidade": int(data.get("quantity", data.get("quantidade", 0)) or 0),
        "validade": _iso(data.get("expiresAt") or data.get("validade")),
        "localizacao": data.get("location") or data.get("localizacao") or "",
        "disponivel": bool(data.get("available", data.get("disponivel", False))),
    }


def _client_payload(snapshot):
    data = snapshot.to_dict() or {}
    return {
        "id": snapshot.id,
        "nome": data.get("name") or data.get("nome") or "Cliente",
        "cpf": data.get("cpf") or "",
        "cns": data.get("cns") or "",
        "nascimento": _iso(data.get("birthDate") or data.get("nascimento")),
        "telefone": data.get("phone") or data.get("telefone") or "",
        "email": data.get("email") or "",
        "endereco": data.get("address") or data.get("endereco") or "",
    }


def _required_text(payload, field, label, max_length=180):
    value = str(payload.get(field) or "").strip()
    if not value:
        raise DomainError(f"Informe {label}.")
    if len(value) > max_length:
        raise DomainError(f"{label.capitalize()} deve ter no máximo {max_length} caracteres.")
    return value


def _digits(value):
    return re.sub(r"\D", "", str(value or ""))


def _profile_and_identity(db):
    identity = current_identity()
    profile_snapshot = db.collection("users").document(identity["uid"]).get()
    profile = profile_snapshot.to_dict() if profile_snapshot.exists else {}
    return profile or {}, identity


def _unit_document(collection, document_id, unit_id):
    snapshot = db_client().collection(collection).document(document_id).get()
    if not snapshot.exists:
        raise DomainError("Registro não encontrado.", 404)
    data = snapshot.to_dict() or {}
    if data.get("unitId") != unit_id:
        raise DomainError("Você não tem acesso a este registro.", 403)
    return snapshot, data


def _medicine_matches(exam, medicine):
    requested = _normalized(exam.get("medicineName") or exam.get("medicamento"))
    name = _normalized(medicine.get("name") or medicine.get("nome"))
    ingredient = _normalized(medicine.get("activeIngredient") or medicine.get("principioAtivo"))
    return bool(requested and (requested in name or name in requested or (ingredient and ingredient in requested)))


@pharmacist_bp.errorhandler(DomainError)
def _handle_domain_error(error):
    return jsonify(error=error.message), error.status_code


@pharmacist_bp.get("/state")
@require_roles("pharmacist")
def pharmacist_state():
    unavailable = require_firebase_config()
    if unavailable:
        return unavailable

    db = db_client()
    profile, identity = _profile_and_identity(db)
    unit_id = identity.get("unitId")
    if not unit_id:
        raise DomainError("Perfil farmacêutico sem unidade associada.", 403)

    exams = db.collection("exams").where("unitId", "==", unit_id).stream()
    medicines = db.collection("medicines").where("unitId", "==", unit_id).stream()
    clients = db.collection("clients").where("unitId", "==", unit_id).stream()
    return jsonify({
        "professional": _professional_name(profile, identity),
        "unitId": unit_id,
        "unitName": profile.get("unitName") or "Unidade farmacêutica",
        "laudos": [_exam_payload(item) for item in exams],
        "medicamentos": [_medicine_payload(item) for item in medicines],
        "clientes": [_client_payload(item) for item in clients],
    })


@pharmacist_bp.post("/clients")
@require_roles("pharmacist")
def create_client():
    unavailable = require_firebase_config()
    if unavailable:
        return unavailable

    payload = request.get_json(silent=True) or {}
    identity = current_identity()
    unit_id = identity.get("unitId")
    if not unit_id:
        raise DomainError("Perfil farmacêutico sem unidade associada.", 403)

    name = _required_text(payload, "nome", "o nome completo", 120)
    cpf = str(payload.get("cpf") or "").strip()
    cns = str(payload.get("cns") or "").strip()
    birth_date = _required_text(payload, "nascimento", "a data de nascimento", 10)
    phone = str(payload.get("telefone") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    address = _required_text(payload, "endereco", "o endereço completo", 180)

    if len(_digits(cpf)) != 11:
        raise DomainError("Informe um CPF com 11 dígitos.")
    if len(_digits(cns)) != 15:
        raise DomainError("Informe um Cartão SUS (CNS) com 15 dígitos.")
    if len(_digits(phone)) not in (10, 11):
        raise DomainError("Informe um telefone com DDD.")
    try:
        parsed_birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
    except ValueError:
        raise DomainError("Informe uma data de nascimento válida.")
    if parsed_birth_date > datetime.now(timezone.utc).date():
        raise DomainError("A data de nascimento não pode estar no futuro.")
    if email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise DomainError("Informe um e-mail válido.")

    db = db_client()
    cpf_digits = _digits(cpf)
    for existing in db.collection("clients").where("unitId", "==", unit_id).stream():
        if _digits((existing.to_dict() or {}).get("cpf")) == cpf_digits:
            raise DomainError("Já existe um cliente cadastrado com este CPF.", 409)

    client_ref = db.collection("clients").document()
    client_ref.set({
        "unitId": unit_id,
        "name": name,
        "cpf": cpf,
        "cpfDigits": cpf_digits,
        "cns": cns,
        "birthDate": birth_date,
        "phone": phone,
        "email": email,
        "address": address,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdBy": identity["uid"],
        "source": "in_person",
    })
    created = client_ref.get()
    return jsonify(success=True, cliente=_client_payload(created)), 201


@pharmacist_bp.post("/manual-orders")
@require_roles("pharmacist")
def create_manual_order():
    unavailable = require_firebase_config()
    if unavailable:
        return unavailable

    payload = request.get_json(silent=True) or {}
    db = db_client()
    profile, identity = _profile_and_identity(db)
    unit_id = identity.get("unitId")
    if not unit_id:
        raise DomainError("Perfil farmacêutico sem unidade associada.", 403)

    client_id = _required_text(payload, "clienteId", "o cliente", 128)
    client_snapshot, client = _unit_document("clients", client_id, unit_id)
    medicine = _required_text(payload, "medicamento", "o medicamento solicitado", 140)
    dose = _required_text(payload, "dose", "a posologia", 180)
    prescriber = _required_text(payload, "prescritor", "o prescritor", 120)
    crm = _required_text(payload, "crm", "o CRM ou registro do prescritor", 30)
    expires_at = _required_text(payload, "validade", "a validade do laudo", 10)
    priority = str(payload.get("prioridade") or "Normal").strip().capitalize()
    notes = str(payload.get("observacoes") or "").strip()
    if priority not in {"Alta", "Normal", "Baixa"}:
        raise DomainError("Selecione uma prioridade válida.")
    if len(notes) > 500:
        raise DomainError("As observações devem ter no máximo 500 caracteres.")
    try:
        parsed_expiry = datetime.strptime(expires_at, "%Y-%m-%d").date()
    except ValueError:
        raise DomainError("Informe uma validade válida para o laudo.")
    if parsed_expiry < datetime.now(timezone.utc).date():
        raise DomainError("A validade do laudo não pode estar no passado.")

    professional = _professional_name(profile, identity)
    patient = {
        "id": client_snapshot.id,
        "name": client.get("name") or client.get("nome") or "Cliente",
        "nome": client.get("name") or client.get("nome") or "Cliente",
        "cpf": client.get("cpf") or "",
        "cns": client.get("cns") or "",
    }
    exam_ref = db.collection("exams").document()
    exam_ref.set({
        "unitId": unit_id,
        "patientId": client_snapshot.id,
        "patientName": patient["nome"],
        "patientCpf": patient["cpf"],
        "patientCns": patient["cns"],
        "patient": patient,
        "medicineName": medicine,
        "dose": dose,
        "prescriber": prescriber,
        "crm": crm,
        "expiresAt": expires_at,
        "priority": priority,
        "status": "pending",
        "source": "manual",
        "fileName": "Laudo físico entregue na unidade",
        "notes": notes,
        "submittedAt": firestore.SERVER_TIMESTAMP,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdBy": identity["uid"],
        "history": [_history_entry(
            "Pedido manual registrado",
            notes or "Laudo físico recebido presencialmente na unidade.",
            professional,
        )],
    })
    created = exam_ref.get()
    return jsonify(success=True, laudo=_exam_payload(created)), 201


@pharmacist_bp.post("/exams/<exam_id>/actions")
@require_roles("pharmacist")
def update_exam(exam_id):
    unavailable = require_firebase_config()
    if unavailable:
        return unavailable

    payload = request.get_json(silent=True) or {}
    action = payload.get("action")
    db = db_client()
    profile, identity = _profile_and_identity(db)
    unit_id = identity.get("unitId")
    professional = _professional_name(profile, identity)
    snapshot, exam = _unit_document("exams", exam_id, unit_id)
    current_status = _status_code(exam.get("status"))

    if action in ACTION_TRANSITIONS:
        accepted, new_status, label = ACTION_TRANSITIONS[action]
        if current_status not in accepted:
            raise DomainError("O laudo mudou de estado. Atualize a página e tente novamente.", 409)
        detail = "Conferência de prescrição e documentos iniciada."
        updates = {"status": new_status, "updatedAt": firestore.SERVER_TIMESTAMP}
        if action == "approve":
            detail = "Documentação e prescrição validadas."
            updates.update({"approvedAt": firestore.SERVER_TIMESTAMP, "approvedBy": identity["uid"]})
        elif action == "reject":
            reason = str(payload.get("reason") or "").strip()
            if not reason:
                raise DomainError("Informe o motivo da reprovação.")
            if len(reason) > 500:
                raise DomainError("O motivo da reprovação deve ter no máximo 500 caracteres.")
            detail = reason
            updates.update({
                "rejectionReason": reason,
                "rejectedAt": firestore.SERVER_TIMESTAMP,
                "rejectedBy": identity["uid"],
            })
        updates["history"] = firestore.ArrayUnion([_history_entry(label, detail, professional)])
        snapshot.reference.update(updates)
        return jsonify(success=True, status=STATUS_TO_FRONTEND[new_status])

    if action == "link_medicine":
        if current_status != "approved":
            raise DomainError("Apenas laudos aprovados podem receber um vínculo.", 409)
        medicine_id = str(payload.get("medicineId") or "").strip()
        if not medicine_id:
            raise DomainError("Selecione um medicamento para vincular.")
        medicine_snapshot, medicine = _unit_document("medicines", medicine_id, unit_id)
        quantity = int(medicine.get("quantity", medicine.get("quantidade", 0)) or 0)
        available = bool(medicine.get("available", medicine.get("disponivel", False)))
        if quantity <= 0 or not available:
            raise DomainError("O lote selecionado não está disponível.", 409)
        if not _medicine_matches(exam, medicine):
            raise DomainError("O medicamento selecionado não corresponde ao laudo.")
        patient = exam.get("patient") or {}
        link = {
            "medicamentoId": medicine_snapshot.id,
            "nome": medicine.get("name") or medicine.get("nome") or "Medicamento",
            "lote": medicine.get("batch") or medicine.get("lote") or "",
            "pacienteId": patient.get("id") or exam.get("patientId") or "",
            "pacienteNome": patient.get("nome") or patient.get("name") or exam.get("patientName") or "Paciente",
            "vinculadoEm": _now_iso(),
            "vinculadoPor": professional,
        }
        snapshot.reference.update({
            "status": "linked",
            "link": link,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "history": firestore.ArrayUnion([_history_entry(
                "Medicamento vinculado",
                f"Lote {link['lote']} reservado para {link['pacienteNome']}.",
                professional,
            )]),
        })
        return jsonify(success=True, status=STATUS_TO_FRONTEND["linked"], vinculo=link)

    if action == "release_medicine":
        if current_status != "linked":
            raise DomainError("O medicamento precisa estar vinculado antes da liberação.", 409)
        link = exam.get("link") or exam.get("vinculo") or {}
        medicine_id = link.get("medicamentoId")
        if not medicine_id:
            raise DomainError("O vínculo do medicamento está incompleto.", 409)
        medicine_snapshot, medicine = _unit_document("medicines", medicine_id, unit_id)
        dispensation_ref = db.collection("dispensations").document()

        @firestore.transactional
        def release_transaction(transaction):
            current_exam_snapshot = snapshot.reference.get(transaction=transaction)
            current_medicine_snapshot = medicine_snapshot.reference.get(transaction=transaction)
            current_exam = current_exam_snapshot.to_dict() or {}
            current_medicine = current_medicine_snapshot.to_dict() or {}
            current_link = current_exam.get("link") or current_exam.get("vinculo") or {}
            if current_exam.get("unitId") != unit_id or _status_code(current_exam.get("status")) != "linked":
                raise DomainError("O laudo mudou de estado. Atualize a página e tente novamente.", 409)
            if current_medicine.get("unitId") != unit_id or current_link.get("medicamentoId") != medicine_id:
                raise DomainError("O lote vinculado não está disponível para esta unidade.", 409)
            quantity = int(current_medicine.get("quantity", current_medicine.get("quantidade", 0)) or 0)
            if quantity <= 0:
                raise DomainError("O lote vinculado não possui estoque.", 409)
            new_quantity = quantity - 1
            transaction.update(snapshot.reference, {
                "status": "released",
                "releasedAt": firestore.SERVER_TIMESTAMP,
                "releasedBy": identity["uid"],
                "updatedAt": firestore.SERVER_TIMESTAMP,
                "history": firestore.ArrayUnion([_history_entry(
                    "Medicamento liberado",
                    "Dispensação registrada e estoque atualizado em uma unidade.",
                    professional,
                )]),
            })
            transaction.update(medicine_snapshot.reference, {
                "quantity": new_quantity,
                "available": new_quantity > 0 and bool(current_medicine.get("available", True)),
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
            transaction.set(dispensation_ref, {
                "examId": exam_id,
                "medicineId": medicine_id,
                "patientId": current_link.get("pacienteId") or current_exam.get("patientId") or "",
                "pharmacistId": identity["uid"],
                "unitId": unit_id,
                "batch": current_link.get("lote") or current_medicine.get("batch") or "",
                "quantity": 1,
                "dispensedAt": firestore.SERVER_TIMESTAMP,
            })
            return new_quantity

        new_quantity = release_transaction(db.transaction())
        return jsonify(success=True, status=STATUS_TO_FRONTEND["released"], quantity=new_quantity)

    raise DomainError("Ação de laudo inválida.")


@pharmacist_bp.patch("/medicines/<medicine_id>")
@require_roles("pharmacist")
def update_medicine(medicine_id):
    unavailable = require_firebase_config()
    if unavailable:
        return unavailable

    payload = request.get_json(silent=True) or {}
    identity = current_identity()
    snapshot, medicine = _unit_document("medicines", medicine_id, identity.get("unitId"))
    updates = {}

    field_map = {
        "lote": "batch",
        "validade": "expiresAt",
        "localizacao": "location",
        "disponivel": "available",
    }
    for source, target in field_map.items():
        if source in payload:
            updates[target] = payload[source]

    for field in ("batch", "expiresAt", "location"):
        if field in updates:
            updates[field] = str(updates[field] or "").strip()
            if not updates[field]:
                raise DomainError("Lote, validade e localização não podem ficar vazios.")
    if "available" in updates and not isinstance(updates["available"], bool):
        raise DomainError("A disponibilidade deve ser verdadeira ou falsa.")

    if "quantidade" in payload:
        if isinstance(payload["quantidade"], bool):
            raise DomainError("A quantidade deve ser um número inteiro.")
        try:
            quantity = int(payload["quantidade"])
        except (TypeError, ValueError):
            raise DomainError("A quantidade deve ser um número inteiro.")
        if quantity < 0:
            raise DomainError("A quantidade não pode ser negativa.")
        updates["quantity"] = quantity

    resulting_quantity = updates.get("quantity", int(medicine.get("quantity", medicine.get("quantidade", 0)) or 0))
    resulting_available = bool(updates.get("available", medicine.get("available", medicine.get("disponivel", False))))
    if resulting_available and resulting_quantity <= 0:
        raise DomainError("Um medicamento sem estoque não pode ficar disponível.")
    if resulting_quantity <= 0:
        updates["available"] = False

    if not updates:
        raise DomainError("Nenhuma alteração válida foi enviada.")
    updates["updatedAt"] = firestore.SERVER_TIMESTAMP
    updates["updatedBy"] = identity["uid"]
    snapshot.reference.update(updates)
    return jsonify(success=True)
