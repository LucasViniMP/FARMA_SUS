import io
import pytest
from unittest.mock import patch

from farmasus import create_app, storage


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BASE_DIR", tmp_path)
    storage.BASE_DIR.mkdir(parents=True, exist_ok=True)
    app = create_app({"TESTING": True, "FIREBASE_PROJECT_ID": "test-project"})
    return app.test_client()


def test_storage_unit_operations(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BASE_DIR", tmp_path)
    storage.BASE_DIR.mkdir(parents=True, exist_ok=True)

    key = storage.make_key("exame.pdf", folder="users/user123")
    assert key.startswith("users/user123/")
    assert key.endswith(".pdf")

    storage.upload(key, b"conteudo de teste")
    assert storage.exists(key) is True
    assert storage.read(key) == b"conteudo de teste"
    assert "users/user123" in storage.list_keys("users/")[0]

    storage.delete(key)
    assert storage.exists(key) is False


def test_storage_disallowed_extension():
    with pytest.raises(storage.StorageError, match="extensão não permitida"):
        storage.make_key("script.exe")


def test_storage_path_traversal_protection(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BASE_DIR", tmp_path)
    with pytest.raises(storage.StorageError):
        storage.read("../outside.txt")
    with pytest.raises(storage.StorageError):
        storage.upload("/root/secret.txt", b"hack")


@patch("farmasus.files_routes.auth_client")
def test_files_route_upload_and_download_flow(mock_auth, client):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "user-42"}

    data = {"file": (io.BytesIO(b"%PDF-sample-content"), "laudo.pdf")}
    upload_res = client.post(
        "/files",
        data=data,
        content_type="multipart/form-data",
        headers={"Authorization": "Bearer valid-token"},
    )
    assert upload_res.status_code == 201
    key = upload_res.get_json()["key"]
    assert key.startswith("users/user-42/")

    dl_res = client.get(f"/files/{key}", headers={"Authorization": "Bearer valid-token"})
    assert dl_res.status_code == 200
    assert dl_res.data == b"%PDF-sample-content"
    dl_res.close()

    list_res = client.get("/files", headers={"Authorization": "Bearer valid-token"})
    assert list_res.status_code == 200
    files_list = list_res.get_json()["files"]
    assert len(files_list) == 1
    assert files_list[0]["fileName"] == "laudo.pdf"
    assert files_list[0]["key"] == key

    mock_auth.return_value.verify_id_token.return_value = {"uid": "user-other"}
    forbidden_res = client.get(f"/files/{key}", headers={"Authorization": "Bearer other-token"})
    assert forbidden_res.status_code == 403
    forbidden_res.close()

    mock_auth.return_value.verify_id_token.return_value = {"uid": "user-42"}
    del_res = client.delete(f"/files/{key}", headers={"Authorization": "Bearer valid-token"})
    assert del_res.status_code == 204
    del_res.close()

    not_found_res = client.get(f"/files/{key}", headers={"Authorization": "Bearer valid-token"})
    assert not_found_res.status_code == 404


def test_files_route_local_development_mode(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BASE_DIR", tmp_path)
    storage.BASE_DIR.mkdir(parents=True, exist_ok=True)

    app = create_app({"APP_ENV": "development", "TESTING": False})
    dev_client = app.test_client()

    data = {"file": (io.BytesIO(b"%PDF-local-content"), "exame_local.pdf")}
    upload_res = dev_client.post("/files", data=data, content_type="multipart/form-data")
    assert upload_res.status_code == 201
    key = upload_res.get_json()["key"]
    assert key.startswith("users/paciente-local/")

    list_res = dev_client.get("/files")
    assert list_res.status_code == 200
    res_data = list_res.get_json()
    assert res_data["mode"] == "local"
    assert len(res_data["files"]) == 1
    assert res_data["files"][0]["fileName"] == "exame_local.pdf"

    dl_res = dev_client.get(f"/files/{key}")
    assert dl_res.status_code == 200
    assert dl_res.data == b"%PDF-local-content"
    dl_res.close()

