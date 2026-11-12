import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    APP_ENV = os.getenv("APP_ENV", "development")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "")
    DEFAULT_UNIT_ID = os.getenv("DEFAULT_UNIT_ID", "")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    JSON_SORT_KEYS = False
