from pathlib import Path

from flask import Flask, jsonify

from .config import Config
from .routes.exams import exams_bp
from .files_routes import files_bp
from .auth_routes import auth_bp
from . import storage

def create_app(test_config: dict | None = None) -> Flask:
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    static_folder = str(frontend_dir if frontend_dir.is_dir() else (Path(__file__).parent / "static"))

    app = Flask(
        __name__,
        static_folder=static_folder,
        static_url_path="",
    )
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    app.config.setdefault("MAX_CONTENT_LENGTH", storage.MAX_SIZE_MB * 1024 * 1024)

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'" 
        )
        return response

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify(error="O arquivo excede o limite de 10 MB."), 413

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error="Recurso não encontrado."), 404

    app.register_blueprint(exams_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(auth_bp)
    return app