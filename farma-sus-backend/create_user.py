import os
import sys
from pathlib import Path

venv_python = Path(__file__).resolve().parent / ".venv" / "Scripts" / "python.exe"
if venv_python.is_file() and Path(sys.executable).resolve() != venv_python.resolve():
    import subprocess
    sys.exit(subprocess.call([str(venv_python)] + sys.argv))

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials, firestore

load_dotenv()

ROLE_MAP = {
    "paciente": "patient",
    "patient": "patient",
    "farmaceutico": "pharmacist",
    "farmacêutico": "pharmacist",
    "pharmacist": "pharmacist",
    "admin": "admin",
    "administrador": "admin",
}

def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
    p = Path(cred_path)
    if not p.is_absolute():
        p = Path(__file__).resolve().parent / cred_path

    if not p.is_file():
        raise FileNotFoundError(f"Arquivo de credenciais não encontrado: {p}")

    cred = credentials.Certificate(str(p))
    project_id = os.getenv("FIREBASE_PROJECT_ID", "farma-sus")
    return firebase_admin.initialize_app(cred, {"projectId": project_id})

def main():
    if len(sys.argv) < 3:
        print("Uso: python create_user.py <email> <senha> [cargo: patient|pharmacist] [nome] [unitId]")
        print("Exemplo: python create_user.py paciente@teste.com 123456 patient \"Yasmin Rios\"")
        return

    email = sys.argv[1].strip()
    password = sys.argv[2].strip()
    role_arg = sys.argv[3].lower() if len(sys.argv) > 3 else "patient"
    role = ROLE_MAP.get(role_arg, "patient")
    name = sys.argv[4] if len(sys.argv) > 4 else "Usuário FarmaSUS"
    unit_id = sys.argv[5] if len(sys.argv) > 5 else None

    app = get_firebase_app()
    auth_cli = auth
    db_cli = firestore.client(app)

    print(f"-> Conectando ao Firebase do projeto: {app.project_id}")
    print(f"-> Criando usuario no Firebase Auth: {email}...")
    try:
        user = auth_cli.create_user(
            email=email,
            password=password,
            display_name=name,
        )
        print(f"✓ Usuário criado no Auth com UID: {user.uid}")
    except Exception as e:
        try:
            user = auth_cli.get_user_by_email(email)
            print(f"! Usuário já existe no Auth. UID: {user.uid}")
        except Exception:
            print(f"Erro ao criar no Auth: {e}")
            return

    print("-> Criando perfil de acesso no Cloud Firestore...")
    try:
        user_data = {
            "role": role,
            "active": True,
            "name": name,
            "email": email,
        }
        if unit_id:
            user_data["unitId"] = unit_id

        db_cli.collection("users").document(user.uid).set(user_data, merge=True)
        print(f"✓ Perfil configurado no Firestore em users/{user.uid} com sucesso!")
        print("\n===============================")
        print("USUÁRIO PRONTO PARA USO:")
        print(f"  UID:     {user.uid}")
        print(f"  Email:   {email}")
        print(f"  Papel:   {role}")
        print(f"  Nome:    {name}")
        print("===============================\n")
    except Exception as e:
        print(f"Erro ao salvar no Firestore: {e}")

if __name__ == "__main__":
    main()
