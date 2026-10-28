import mimetypes
import os
import uuid
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass  

BASE_DIR = Path(os.environ.get("STORAGE_DIR", "uploads")).resolve()
MAX_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
MAX_SIZE_MB = MAX_BYTES // (1024 * 1024)

_ext_raw = os.environ.get("STORAGE_ALLOWED_EXT", "jpg,jpeg,png,gif,webp,pdf,txt")
ALLOWED_EXT = set()
for _e in _ext_raw.split(","):
    _e = _e.strip().lower().lstrip(".")
    if _e:
        ALLOWED_EXT.add(_e)

BASE_DIR.mkdir(parents=True, exist_ok=True)


class StorageError(Exception):
    pass


def _resolve(key):
    if not key or key.startswith("/") or key.startswith("\\"):
        raise StorageError("key inválida")
    path = (BASE_DIR / key).resolve()
    if BASE_DIR not in path.parents:
        raise StorageError("key inválida")
    return path


def make_key(filename, folder=""):
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in ALLOWED_EXT:
        raise StorageError("extensão não permitida: ." + ext)
    name = uuid.uuid4().hex + "." + ext
    folder = folder.strip("/\\")
    if folder:
        return folder + "/" + name
    return name


def upload(key, data):
    if len(data) > MAX_BYTES:
        raise StorageError("arquivo maior que " + str(MAX_SIZE_MB) + " MB")
    path = _resolve(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)
    return key


def exists(key):
    return _resolve(key).is_file()


def read(key):
    path = _resolve(key)
    if not path.is_file():
        raise StorageError("arquivo não encontrado")
    return path.read_bytes()


def get_path(key):
    path = _resolve(key)
    if not path.is_file():
        raise StorageError("arquivo não encontrado")
    return path


def content_type(key):
    return mimetypes.guess_type(key)[0] or "application/octet-stream"


def delete(key):
    _resolve(key).unlink(missing_ok=True)


def list_keys(prefix=""):
    keys = []
    for p in BASE_DIR.rglob("*"):
        if p.is_file() and not p.name.endswith(".tmp"):
            key = p.relative_to(BASE_DIR).as_posix()
            if key.startswith(prefix):
                keys.append(key)
    return sorted(keys)