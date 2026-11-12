import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Blueprint, current_app, jsonify, request

from .firebase import auth_client, db_client
from .security import ROLE_ALIASES, VALID_ROLES

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _sign_in_with_password(email, password):
    api_key = current_app.config.get("FIREBASE_WEB_API_KEY")
    if not api_key:
        raise RuntimeError("FIREBASE_WEB_API_KEY não configurada.")

    endpoint = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = json.dumps({
        "email": email,
        "password": password,
        "returnSecureToken": True,
    }).encode("utf-8")
    firebase_request = Request(endpoint, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(firebase_request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        try:
            firebase_error = json.loads(error.read().decode("utf-8"))
            code = firebase_error.get("error", {}).get("message", "")
        except (ValueError, AttributeError):
            code = ""
        if code in {"EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS", "USER_DISABLED"}:
            raise ValueError("Usuário ou senha inválidos.") from error
        raise RuntimeError("O Firebase recusou a autenticação.") from error
    except URLError as error:
        raise RuntimeError("Não foi possível conectar ao serviço de autenticação.") from error


def _refresh_id_token(refresh_token):
    api_key = current_app.config.get("FIREBASE_WEB_API_KEY")
    if not api_key:
        raise RuntimeError("FIREBASE_WEB_API_KEY não configurada.")
    endpoint = f"https://securetoken.googleapis.com/v1/token?key={api_key}"
    payload = urlencode({"grant_type": "refresh_token", "refresh_token": refresh_token}).encode("utf-8")
    firebase_request = Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(firebase_request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, ValueError) as error:
        raise ValueError("Sessão expirada. Entre novamente.") from error


@auth_bp.post("/refresh")
def refresh():
    data = request.get_json(silent=True) or {}
    refresh_token = str(data.get("refreshToken") or "").strip()
    if not refresh_token:
        return jsonify(error="Refresh token não informado."), 400
    try:
        authentication = _refresh_id_token(refresh_token)
        return jsonify({
            "token": authentication["id_token"],
            "refreshToken": authentication.get("refresh_token", refresh_token),
            "expiresIn": authentication.get("expires_in", "3600"),
        })
    except (ValueError, RuntimeError) as error:
        return jsonify(error=str(error)), 401


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or data.get("senha") or ""

    if not email or not password:
        return jsonify(error="Informe o e-mail e a senha."), 400

    try:
        authentication = _sign_in_with_password(email, password)
        user = auth_client().get_user(authentication["localId"])

        profile_data = {}
        try:
            doc = db_client().collection("users").document(user.uid).get()
            if doc.exists:
                profile_data = doc.to_dict() or {}
        except Exception:
            pass

        name = profile_data.get("name") or user.display_name or email.split("@")[0].capitalize()
        raw_role = profile_data.get("role", "patient")
        role = ROLE_ALIASES.get(raw_role, raw_role)
        if role not in VALID_ROLES or profile_data.get("active") is not True:
            return jsonify(error="Perfil sem acesso ativo ao FarmaSUS."), 403

        return jsonify({
            "success": True,
            "uid": user.uid,
            "email": user.email,
            "name": name,
            "role": role,
            "cpf": profile_data.get("cpf", ""),
            "telefone": profile_data.get("telefone", ""),
            "dataNascimento": profile_data.get("dataNascimento", ""),
            "token": authentication["idToken"],
            "refreshToken": authentication.get("refreshToken", ""),
            "expiresIn": authentication.get("expiresIn", "3600"),
            "mode": "firebase",
        }), 200

    except Exception as error:
        firebase_configured = bool(
            current_app.config.get("FIREBASE_PROJECT_ID")
            and current_app.config.get("FIREBASE_WEB_API_KEY")
        )
        if current_app.config.get("APP_ENV") == "development" and not firebase_configured:
            name = "Yasmin Rios" if "teste" in email or "yasmin" in email else email.split("@")[0].capitalize()
            return jsonify({
                "success": True,
                "uid": "paciente-local",
                "email": email,
                "name": name,
                "role": "patient",
                "token": "",
                "mode": "local",
            }), 200

        if isinstance(error, RuntimeError) and "FIREBASE_WEB_API_KEY" in str(error):
            return jsonify(error="A autenticação Firebase não foi configurada no servidor."), 503
        return jsonify(error="Usuário ou senha inválidos."), 401


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or data.get("senha") or ""
    name = data.get("nomeCompleto") or data.get("name") or "Usuário FarmaSUS"
    cpf = data.get("cpf") or ""
    data_nascimento = data.get("dataNascimento") or ""

    if not email or not password:
        return jsonify(error="E-mail e senha são obrigatórios."), 400

    try:
        user = auth_client().create_user(
            email=email,
            password=password,
            display_name=name,
        )

        try:
            db_client().collection("users").document(user.uid).set({
                "name": name,
                "email": email,
                "cpf": cpf,
                "dataNascimento": data_nascimento,
                "role": "patient",
                "active": True,
            }, merge=True)
        except Exception:
            pass

        authentication = _sign_in_with_password(email, password)

        return jsonify({
            "success": True,
            "uid": user.uid,
            "email": user.email,
            "name": name,
            "cpf": cpf,
            "dataNascimento": data_nascimento,
            "token": authentication["idToken"],
            "refreshToken": authentication.get("refreshToken", ""),
            "expiresIn": authentication.get("expiresIn", "3600"),
            "mode": "firebase",
        }), 201

    except Exception as e:
        err = str(e)
        if "EMAIL_EXISTS" in err or "already exists" in err:
            return jsonify(error="Este e-mail já está cadastrado."), 409
        return jsonify(error=f"Erro no cadastro: {err}"), 400
