from functools import lru_cache
import os
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials, firestore


@lru_cache(maxsize=1)
def firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    options = {}
    project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("farma-sus")
    if project_id:
        options["projectId"] = project_id

    cred = None
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        p = Path(cred_path)
        if not p.is_absolute():
            p = (Path(__file__).parent.parent / cred_path).resolve()
        if p.is_file():
            cred = credentials.Certificate(str(p))

    return firebase_admin.initialize_app(cred, options=options or None)


def auth_client():
    firebase_app()
    return auth


def db_client():
    return firestore.client(firebase_app())

