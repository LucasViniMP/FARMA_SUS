from functools import wraps
import json
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, g, jsonify, request, send_file
from firebase_admin import firestore

from . import storage
from .firebase import auth_client, db_client
from .security import ROLE_ALIASES

files_bp = Blueprint("files", __name__, url_prefix="/files")


def _meta_path():
    return storage.BASE_DIR / "_meta" / "files_meta.json"


def _load_meta():
    path = _meta_path()
    if path.is_file():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_meta(data):
    try:
        path = _meta_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:].strip()
            if not token:
                return jsonify(error="não autenticado"), 401
            try:
                decoded = auth_client().verify_id_token(token)
            except Exception:
                return jsonify(error="token inválido"), 401
            g.uid = decoded["uid"]
            g.auth_mode = "firebase"
            return fn(*args, **kwargs)

        if current_app.config.get("TESTING"):
            return jsonify(error="não autenticado"), 401

        if current_app.config.get("APP_ENV") == "development":
            g.uid = "paciente-local"
            g.auth_mode = "local"
            return fn(*args, **kwargs)

        return jsonify(error="não autenticado"), 401

    return wrapper


def _owns(key):
    uid = getattr(g, "uid", "")
    return bool(uid and key.startswith(f"users/{uid}/"))


def _firebase_exam_context():
    if getattr(g, "auth_mode", "local") != "firebase":
        return None
    profile_snapshot = db_client().collection("users").document(g.uid).get()
    if not profile_snapshot.exists:
        raise ValueError("Perfil do paciente não encontrado.")
    profile = profile_snapshot.to_dict() or {}
    unit_id = profile.get("unitId") or profile.get("assignedUnitId") or current_app.config.get("DEFAULT_UNIT_ID")
    if not unit_id:
        raise ValueError("Selecione uma unidade de atendimento antes de enviar o laudo.")
    return profile, unit_id


def _pharmacist_can_read(key):
    if getattr(g, "auth_mode", "local") != "firebase":
        return False
    try:
        db = db_client()
        profile_snapshot = db.collection("users").document(g.uid).get()
        if not profile_snapshot.exists:
            return False
        profile = profile_snapshot.to_dict() or {}
        role = ROLE_ALIASES.get(profile.get("role"), profile.get("role"))
        unit_id = profile.get("unitId")
        if role != "pharmacist" or not unit_id:
            return False
        exams = db.collection("exams").where("fileKey", "==", key).limit(1).stream()
        return any((exam.to_dict() or {}).get("unitId") == unit_id for exam in exams)
    except Exception:
        return False


@files_bp.get("")
@login_required
def list_files():
    user_prefix = f"users/{g.uid}"
    meta = _load_meta()
    keys = storage.list_keys(user_prefix)
    records = []
    for key in sorted(keys, reverse=True):
        info = meta.get(key, {})
        file_path = storage.get_path(key)
        submitted = info.get("submittedAt") or datetime.fromtimestamp(file_path.stat().st_mtime).strftime("%d/%m/%Y")
        expires = info.get("expiresAt") or (datetime.fromtimestamp(file_path.stat().st_mtime) + timedelta(days=30)).strftime("%d/%m/%Y")
        records.append({
            "key": key,
            "fileName": info.get("fileName", file_path.name),
            "submittedAt": submitted,
            "expiresAt": expires,
            "status": info.get("status", "under_review"),
            "size": file_path.stat().st_size,
        })
    mode = getattr(g, "auth_mode", "local")
    return jsonify(files=records, mode=mode, uid=g.uid), 200


@files_bp.post("")
@login_required
def upload_file():
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify(error="envie o arquivo no campo 'file'"), 400
    exam_context = None
    try:
        exam_context = _firebase_exam_context()
    except ValueError as error:
        return jsonify(error=str(error)), 400

    key = None
    try:
        content = f.read()
        key = storage.make_key(f.filename, folder="users/" + g.uid)
        storage.upload(key, content)

        now = datetime.now()
        meta = _load_meta()
        meta[key] = {
            "key": key,
            "fileName": f.filename,
            "submittedAt": now.strftime("%d/%m/%Y"),
            "expiresAt": (now + timedelta(days=30)).strftime("%d/%m/%Y"),
            "status": "under_review",
            "uid": g.uid,
            "size": len(content),
        }
        _save_meta(meta)

        exam_id = None
        if exam_context:
            profile, unit_id = exam_context
            exam_ref = db_client().collection("exams").document()
            patient_name = profile.get("name") or profile.get("nome") or "Paciente"
            exam_ref.set({
                "patientId": g.uid,
                "patientName": patient_name,
                "patientCns": profile.get("cns", ""),
                "patientCpf": profile.get("cpf", ""),
                "unitId": unit_id,
                "fileKey": key,
                "fileName": f.filename,
                "medicineName": (request.form.get("medicineName") or "").strip(),
                "dose": (request.form.get("dose") or "").strip(),
                "prescriber": (request.form.get("prescriber") or "").strip(),
                "crm": (request.form.get("crm") or "").strip(),
                "priority": "Normal",
                "status": "pending",
                "submittedAt": firestore.SERVER_TIMESTAMP,
                "expiresAt": datetime.now(timezone.utc) + timedelta(days=30),
                "history": [{
                    "data": datetime.now(timezone.utc).isoformat(),
                    "acao": "Laudo recebido",
                    "responsavel": "Portal do paciente",
                    "detalhe": "Documento enviado para análise da unidade.",
                }],
            })
            exam_id = exam_ref.id
    except storage.StorageError as e:
        return jsonify(error=str(e)), 400
    except Exception:
        if key:
            storage.delete(key)
            meta = _load_meta()
            meta.pop(key, None)
            _save_meta(meta)
        return jsonify(error="Não foi possível registrar o laudo no banco de dados."), 503
    return jsonify(key=key, fileName=f.filename, examId=exam_id), 201


@files_bp.get("/<path:key>")
@login_required
def download_file(key):
    if not _owns(key) and not _pharmacist_can_read(key):
        return jsonify(error="acesso negado"), 403
    try:
        path = storage.get_path(key)
    except storage.StorageError:
        return jsonify(error="arquivo não encontrado"), 404
    meta = _load_meta()
    download_name = meta.get(key, {}).get("fileName")
    resp = send_file(path, mimetype=storage.content_type(key), as_attachment=False, download_name=download_name)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp


@files_bp.delete("/<path:key>")
@login_required
def delete_file(key):
    if not _owns(key):
        return jsonify(error="acesso negado"), 403
    try:
        storage.delete(key)
        meta = _load_meta()
        if key in meta:
            meta.pop(key, None)
            _save_meta(meta)
    except storage.StorageError:
        return jsonify(error="key inválida"), 400
    return "", 204

