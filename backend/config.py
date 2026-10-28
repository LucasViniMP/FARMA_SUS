import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    APP_ENV = os.getenv("APP_ENV", "development")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", os.getenv("farma-sus", ""))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    JSON_SORT_KEYS = False