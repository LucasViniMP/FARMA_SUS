import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import backend
import backend.config
import backend.firebase
import backend.security
import backend.storage
import backend.auth_routes
import backend.files_routes
import backend.routes
import backend.routes.exams

sys.modules["farmasus"] = backend
sys.modules["farmasus.config"] = backend.config
sys.modules["farmasus.firebase"] = backend.firebase
sys.modules["farmasus.security"] = backend.security
sys.modules["farmasus.storage"] = backend.storage
sys.modules["farmasus.auth_routes"] = backend.auth_routes
sys.modules["farmasus.files_routes"] = backend.files_routes
sys.modules["farmasus.routes"] = backend.routes
sys.modules["farmasus.routes.exams"] = backend.routes.exams
