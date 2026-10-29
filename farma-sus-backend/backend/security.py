"""Authentication and least-privilege helpers for API routes."""

from functools import wraps

from flask import current_app, g, jsonify, request
from firebase_admin import exceptions

from .firebase import auth_client, db_client

ROLE_ALIASES = {
    "paciente": "patient",
    "farmacista": "pharmacist",
    "farmaceutico": "pharmacist",
    "farmacêutico": "pharmacist",
    "administrador": "admin",
}
VALID_ROLES = frozenset({"patient", "pharmacist", "admin"})


def _bearer_token() -> str | None:
    value = request.headers.get("Authorization", "")
    scheme, _, token = value.partition(" ")
    return token if scheme.lower() == "bearer" and token else None


def current_identity():
    if hasattr(g, "identity"):
        return g.identity

    token = _bearer_token()
    if not token:
        return None
    try:
        decoded = auth_client().verify_id_token(token, check_revoked=True)
        profile = db_client().collection("users").document(decoded["uid"]).get()
    except (ValueError, exceptions.FirebaseError):
        return None

    if not profile.exists:
        return None
    data = profile.to_dict() or {}
    raw_role = data.get("role")
    role = ROLE_ALIASES.get(raw_role, raw_role)
    if role not in VALID_ROLES or data.get("active") is not True:
        return None
    g.identity = {"uid": decoded["uid"], "role": role, "unitId": data.get("unitId")}
    return g.identity


def require_roles(*allowed_roles: str):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            identity = current_identity()
            if not identity:
                return jsonify(error="Autenticação obrigatória."), 401
            if identity["role"] not in allowed_roles:
                return jsonify(error="Você não tem permissão para esta operação."), 403
            return view(*args, **kwargs)
        return wrapped
    return decorator


def require_firebase_config():
    project_id = current_app.config.get("FIREBASE_PROJECT_ID") or current_app.config.get("farma-sus")
    if not project_id:
        return jsonify(error="A integração Firebase ainda não foi configurada no servidor."), 503
    return None
