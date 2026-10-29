import json
import time
from flask import Blueprint, current_app, jsonify, request
import jwt

from .firebase import auth_client, db_client

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or data.get("senha") or ""

    if not email:
        return jsonify(error="Informe o e-mail."), 400

    try:
        user = auth_client().get_user_by_email(email)

        profile_data = {}
        try:
            doc = db_client().collection("users").document(user.uid).get()
            if doc.exists:
                profile_data = doc.to_dict() or {}
        except Exception:
            pass

        token_raw = auth_client().create_custom_token(user.uid)
        token = token_raw.decode("utf-8") if isinstance(token_raw, bytes) else str(token_raw)

        name = profile_data.get("name") or user.display_name or email.split("@")[0].capitalize()
        role = profile_data.get("role", "patient")

        return jsonify({
            "success": True,
            "uid": user.uid,
            "email": user.email,
            "name": name,
            "role": role,
            "token": token,
            "mode": "firebase",
        }), 200

    except Exception as e:
        if current_app.config.get("APP_ENV") == "development":
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

        token_raw = auth_client().create_custom_token(user.uid)
        token = token_raw.decode("utf-8") if isinstance(token_raw, bytes) else str(token_raw)

        return jsonify({
            "success": True,
            "uid": user.uid,
            "email": user.email,
            "name": name,
            "token": token,
            "mode": "firebase",
        }), 201

    except Exception as e:
        err = str(e)
        if "EMAIL_EXISTS" in err or "already exists" in err:
            return jsonify(error="Este e-mail já está cadastrado."), 409
        return jsonify(error=f"Erro no cadastro: {err}"), 400
