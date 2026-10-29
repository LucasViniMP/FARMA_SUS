from flask import Blueprint, current_app, jsonify, send_from_directory

from ..firebase import db_client
from ..security import current_identity, require_firebase_config, require_roles

exams_bp = Blueprint("exams", __name__)


@exams_bp.get("/")
@exams_bp.get("/exames")
@exams_bp.get("/index.html")
def home():
    return send_from_directory(current_app.static_folder, "exames.html")


@exams_bp.get("/api/me")
@require_roles("patient", "pharmacist", "admin")
def my_profile():
    identity = current_identity()
    return jsonify(uid=identity["uid"], role=identity["role"])


@exams_bp.get("/api/exams")
@require_roles("patient", "pharmacist")
def list_exams():
    unavailable = require_firebase_config()
    if unavailable:
        return unavailable

    identity = current_identity()
    if identity["role"] == "patient":
        query = db_client().collection("exams").where("patientId", "==", identity["uid"])
    else:
        if not identity.get("unitId"):
            return jsonify(error="Perfil farmacêutico sem unidade associada."), 403
        query = db_client().collection("exams").where("unitId", "==", identity["unitId"])

    records = []
    for document in query.stream():
        data = document.to_dict() or {}
        records.append({
            "id": document.id,
            "fileName": data.get("fileName", "Documento"),
            "submittedAt": data.get("submittedAt"),
            "expiresAt": data.get("expiresAt"),
            "status": data.get("status", "under_review"),
        })
    return jsonify(exams=records)
