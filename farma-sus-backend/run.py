import sys
from pathlib import Path

venv_python = Path(__file__).resolve().parent / ".venv" / "Scripts" / "python.exe"
if venv_python.is_file() and Path(sys.executable).resolve() != venv_python.resolve():
    import subprocess
    sys.exit(subprocess.call([str(venv_python)] + sys.argv))

try:
    from backend import create_app
except ModuleNotFoundError:
    from farmasus import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
