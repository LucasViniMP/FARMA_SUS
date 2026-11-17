from unittest.mock import MagicMock, patch

import pytest

from farmasus import create_app

ADMIN = {"uid": "admin-1", "role": "admin", "unitId": None}
PHARMACIST = {"uid": "pharm-1", "role": "pharmacist", "unitId": "unit-1"}
PATIENT = {"uid": "pat-1", "role": "patient", "unitId": None}


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "FIREBASE_PROJECT_ID": "test-project"})
    return app.test_client()


def _snap(doc_id, data, exists=True):
    snap = MagicMock()
    snap.id = doc_id
    snap.exists = exists
    snap.to_dict.return_value = data
    return snap


def _login_as(identity):
    """Faz o require_roles enxergar `identity` sem passar pelo Firebase."""
    return patch("farmasus.security.current_identity", return_value=identity)


def _db(collections):
    """Firestore falso: collections = {"users": <MagicMock>, ...}."""
    db = MagicMock()
    db.collection.side_effect = collections.__getitem__
    return db


# ------------------------------------------------------------ autorização

@pytest.mark.parametrize("method,url", [
    ("get", "/api/admin/summary"),
    ("get", "/api/admin/units"),
    ("get", "/api/admin/pharmacists"),
    ("post", "/api/admin/pharmacists"),
    ("patch", "/api/admin/pharmacists/x"),
    ("get", "/api/admin/users"),
    ("get", "/api/admin/stock"),
    ("patch", "/api/admin/stock/x"),
])
def test_all_routes_require_login(client, method, url):
    assert getattr(client, method)(url).status_code == 401


@pytest.mark.parametrize("identity", [PATIENT, PHARMACIST])
@pytest.mark.parametrize("method,url", [
    ("get", "/api/admin/summary"),
    ("get", "/api/admin/pharmacists"),
    ("post", "/api/admin/pharmacists"),
    ("patch", "/api/admin/pharmacists/x"),
    ("get", "/api/admin/users"),
    ("patch", "/api/admin/stock/x"),
])
def test_only_admin_is_allowed(client, identity, method, url):
    with _login_as(identity):
        assert getattr(client, method)(url, json={}).status_code == 403


# ---------------------------------------------------- conceder (POST)

def _grant_setup(user_doc, unit_exists=True):
    users = MagicMock()
    users.document.return_value.get.return_value = user_doc
    units = MagicMock()
    units.document.return_value.get.return_value = _snap(
        "altamira-sul", {"name": "Altamira Sul"}, exists=unit_exists)
    return users, _db({"users": users, "units": units})


def test_grant_promotes_patient_to_pharmacist(client):
    updated = _snap("pat-9", {"name": "Ana", "role": "pharmacist", "crf": "CRF-PA 1234",
                            "unitId": "altamira-sul", "unitName": "Altamira Sul", "active": True})
    users, db = _grant_setup(_snap("pat-9", {"name": "Ana", "role": "patient"}))
    users.document.return_value.get.side_effect = [
        _snap("pat-9", {"name": "Ana", "role": "patient"}), updated]
    with _login_as(ADMIN), patch("farmasus.routes.admin.current_identity", return_value=ADMIN), \
            patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.post("/api/admin/pharmacists", json={
            "userId": "pat-9", "crf": "CRF-PA 1234", "unitId": "altamira-sul",
            "role": "admin",  # tentativa de escalar além do permitido: deve ser ignorada
        })
    assert response.status_code == 201
    written = users.document.return_value.update.call_args.args[0]
    assert written["role"] == "pharmacist" and written["active"] is True
    assert written["crf"] == "CRF-PA 1234" and written["unitId"] == "altamira-sul"
    assert written["unitName"] == "Altamira Sul" and written["grantedBy"] == "admin-1"
    assert set(written) == {"role", "active", "crf", "unitId", "unitName", "grantedBy", "grantedAt"}
    assert response.get_json()["pharmacist"]["crf"] == "CRF-PA 1234"


def test_grant_accepts_legacy_portuguese_role(client):
    users, db = _grant_setup(_snap("pat-9", {"role": "paciente"}))
    with _login_as(ADMIN), patch("farmasus.routes.admin.current_identity", return_value=ADMIN), \
            patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.post("/api/admin/pharmacists",
                            json={"userId": "pat-9", "crf": "CRF/PA 99", "unitId": "altamira-sul"})
    assert response.status_code == 201
    users.document.return_value.update.assert_called_once()


@pytest.mark.parametrize("existing_role", ["pharmacist", "admin"])
def test_grant_rejects_already_elevated_user(client, existing_role):
    users, db = _grant_setup(_snap("x", {"role": existing_role}))
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.post("/api/admin/pharmacists",
                            json={"userId": "x", "crf": "CRF-PA 1234", "unitId": "altamira-sul"})
    assert response.status_code == 409
    users.document.return_value.update.assert_not_called()


def test_grant_user_not_found(client):
    users, db = _grant_setup(_snap("x", None, exists=False))
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.post("/api/admin/pharmacists",
                            json={"userId": "x", "crf": "CRF-PA 1234", "unitId": "altamira-sul"})
    assert response.status_code == 404


@pytest.mark.parametrize("body,fragment", [
    ({"crf": "CRF-PA 1234", "unitId": "altamira-sul"}, "usuário"),
    ({"userId": "x", "unitId": "altamira-sul"}, "CRF"),
    ({"userId": "x", "crf": "123", "unitId": "altamira-sul"}, "CRF"),
    ({"userId": "x", "crf": "CRF-PA 1234"}, "unidade"),
])
def test_grant_validates_input(client, body, fragment):
    users, db = _grant_setup(_snap("x", {"role": "patient"}))
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.post("/api/admin/pharmacists", json=body)
    assert response.status_code == 422
    assert fragment in response.get_json()["error"]
    users.document.return_value.update.assert_not_called()


def test_grant_rejects_unknown_unit(client):
    users, db = _grant_setup(_snap("x", {"role": "patient"}), unit_exists=False)
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.post("/api/admin/pharmacists",
                            json={"userId": "x", "crf": "CRF-PA 1234", "unitId": "nao-existe"})
    assert response.status_code == 422
    users.document.return_value.update.assert_not_called()


# ----------------------------------------------------- editar (PATCH)

def _patch_setup(role="pharmacist"):
    users = MagicMock()
    users.document.return_value.get.return_value = _snap(
        "ph-1", {"name": "Rafael", "role": role, "active": True})
    units = MagicMock()
    units.document.return_value.get.return_value = _snap("altamira-norte", {"name": "Altamira Norte"})
    return users, _db({"users": users, "units": units})


def test_patch_only_whitelisted_fields(client):
    users, db = _patch_setup()
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.patch("/api/admin/pharmacists/ph-1", json={
            "crf": "CRF-PA 5555", "unitId": "altamira-norte",
            "role": "admin", "name": "Hacker", "email": "x@x.com"})
    assert response.status_code == 200
    written = users.document.return_value.update.call_args.args[0]
    assert set(written) == {"crf", "unitId", "unitName"}


def test_patch_rejects_non_pharmacist_target(client):
    users, db = _patch_setup(role="patient")
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.patch("/api/admin/pharmacists/ph-1", json={"active": False})
    assert response.status_code == 409
    users.document.return_value.update.assert_not_called()


def test_patch_cannot_touch_another_admin(client):
    users, db = _patch_setup(role="admin")
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        response = client.patch("/api/admin/pharmacists/ph-1", json={"active": False})
    assert response.status_code == 409


def test_patch_empty_or_invalid_body(client):
    users, db = _patch_setup()
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        assert client.patch("/api/admin/pharmacists/ph-1", json={"role": "admin"}).status_code == 422
        assert client.patch("/api/admin/pharmacists/ph-1", json={"active": "nao"}).status_code == 422
    users.document.return_value.update.assert_not_called()


def test_deactivate_revokes_sessions(client):
    users, db = _patch_setup()
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db), \
            patch("farmasus.routes.admin.auth_client") as auth:
        response = client.patch("/api/admin/pharmacists/ph-1", json={"active": False})
    assert response.status_code == 200
    assert users.document.return_value.update.call_args.args[0] == {"active": False}
    auth.return_value.revoke_refresh_tokens.assert_called_once_with("ph-1")


# ----------------------------------------------------------- listagens

def test_list_pharmacists_queries_only_pharmacists(client):
    users = MagicMock()
    users.where.return_value.stream.return_value = [_snap("ph-1", {
        "name": "Rafael", "cpf": "111", "email": "r@x.com", "crf": "CRF-PA 1",
        "unitId": "u1", "unitName": "Centro", "active": True, "password": "nunca-vazar"})]
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=_db({"users": users})):
        response = client.get("/api/admin/pharmacists")
    users.where.assert_called_once_with("role", "==", "pharmacist")
    item = response.get_json()["pharmacists"][0]
    assert item["id"] == "ph-1" and item["active"] is True and "password" not in item


def test_list_patients_combines_exam_and_stock(client):
    users, exams, medicines = MagicMock(), MagicMock(), MagicMock()
    users.where.return_value.stream.return_value = [
        _snap("p1", {"name": "Maria", "cpf": "1", "email": "m@x.com", "unitName": "Centro"}),
        _snap("p2", {"name": "João", "cpf": "2", "email": "j@x.com", "unitName": "Sul"}),
        _snap("p3", {"name": "Sem laudo", "cpf": "3", "email": "s@x.com"}),
    ]
    exams.stream.return_value = [
        _snap("e1", {"patientId": "p1", "status": "approved", "medicineName": "Insulina", "unitId": "u1"}),
        _snap("e2", {"patientId": "p2", "status": "released", "medicineName": "Losartana", "unitId": "u1"}),
    ]
    medicines.stream.return_value = [_snap("m1", {"name": "Insulina", "unitId": "u1", "quantity": 0})]
    db = _db({"users": users, "exams": exams, "medicines": medicines})
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        rows = {r["id"]: r for r in client.get("/api/admin/users").get_json()["users"]}
    users.where.assert_called_once_with("role", "==", "patient")
    assert (rows["p1"]["examStatus"], rows["p1"]["medStatus"]) == ("approved", "out")
    assert (rows["p2"]["examStatus"], rows["p2"]["medStatus"]) == ("approved", "withdrawn")
    assert (rows["p3"]["examStatus"], rows["p3"]["medStatus"]) == (None, None)
    assert rows["p1"]["email"] == "m@x.com"


def test_units_and_stock(client):
    units, medicines = MagicMock(), MagicMock()
    units.stream.return_value = [_snap("u1", {"name": "Centro"})]
    medicines.stream.return_value = [_snap("m1", {"name": "Insulina", "unitId": "u1", "quantity": 5})]
    db = _db({"units": units, "medicines": medicines})
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        assert client.get("/api/admin/units").get_json() == {"units": [{"id": "u1", "name": "Centro"}]}
        stock = client.get("/api/admin/stock").get_json()["stock"][0]
    assert stock == {"id": "m1", "medicine": "Insulina", "unitName": "Centro", "quantity": 5, "minimum": 0}


def test_summary_shape(client):
    users, exams, medicines = MagicMock(), MagicMock(), MagicMock()
    users.where.return_value.stream.side_effect = [
        [_snap("p1", {"name": "Maria"})],                       # pacientes (dentro de _patient_rows)
        [_snap("ph", {"active": True}), _snap("ph2", {"active": False})],  # farmacêuticos
    ]
    exams.stream.return_value = [_snap("e1", {"patientId": "p1", "status": "approved", "medicineName": "X"})]
    medicines.stream.return_value = []
    db = _db({"users": users, "exams": exams, "medicines": medicines})
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=db):
        data = client.get("/api/admin/summary").get_json()
    assert data["patients"] == 1 and data["activePharmacists"] == 1
    assert data["exams"] == {"approved": 1, "under_review": 0, "denied": 0}
    assert len(data["weeks"]) == 7 and data["awaitingMedicine"] == 1


# -------------------------------------------------------------- estoque

@pytest.mark.parametrize("body", [
    {"quantity": -1, "minimum": 5}, {"quantity": 5, "minimum": -2},
    {"quantity": "10", "minimum": 5}, {"quantity": 1.5, "minimum": 5},
    {"quantity": True, "minimum": 5}, {"quantity": 5},
])
def test_stock_rejects_invalid_numbers(client, body):
    medicines = MagicMock()
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=_db({"medicines": medicines})):
        assert client.patch("/api/admin/stock/m1", json=body).status_code == 422
    medicines.document.return_value.update.assert_not_called()


def test_stock_update_and_not_found(client):
    medicines = MagicMock()
    medicines.document.return_value.get.return_value = _snap("m1", {})
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=_db({"medicines": medicines})):
        response = client.patch("/api/admin/stock/m1", json={"quantity": 40, "minimum": 10})
    assert response.status_code == 200
    medicines.document.return_value.update.assert_called_once_with({"quantity": 40, "minimum": 10})

    medicines.document.return_value.get.return_value = _snap("zz", None, exists=False)
    with _login_as(ADMIN), patch("farmasus.routes.admin.db_client", return_value=_db({"medicines": medicines})):
        assert client.patch("/api/admin/stock/zz", json={"quantity": 1, "minimum": 1}).status_code == 404
