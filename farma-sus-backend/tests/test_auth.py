from unittest.mock import MagicMock, patch

import pytest
from farmasus import create_app


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "FIREBASE_PROJECT_ID": "test-project"})
    return app.test_client()


def test_missing_auth_header_returns_401(client):
    res = client.get("/api/me")
    assert res.status_code == 401
    assert "Autenticação obrigatória" in res.get_json()["error"]


@patch("farmasus.security.auth_client")
def test_invalid_bearer_token_returns_401(mock_auth, client):
    mock_auth.return_value.verify_id_token.side_effect = ValueError("Invalid token")
    res = client.get("/api/me", headers={"Authorization": "Bearer bad-token"})
    assert res.status_code == 401


@patch("farmasus.security.db_client")
@patch("farmasus.security.auth_client")
def test_user_not_found_in_firestore_returns_401(mock_auth, mock_db, client):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "ghost"}
    profile = MagicMock()
    profile.exists = False
    mock_db.return_value.collection.return_value.document.return_value.get.return_value = profile

    res = client.get("/api/me", headers={"Authorization": "Bearer token"})
    assert res.status_code == 401


@patch("farmasus.security.db_client")
@patch("farmasus.security.auth_client")
def test_inactive_user_returns_401(mock_auth, mock_db, client):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "user-inactive"}
    profile = MagicMock()
    profile.exists = True
    profile.to_dict.return_value = {"role": "patient", "active": False}
    mock_db.return_value.collection.return_value.document.return_value.get.return_value = profile

    res = client.get("/api/me", headers={"Authorization": "Bearer token"})
    assert res.status_code == 401


@patch("farmasus.security.db_client")
@patch("farmasus.security.auth_client")
def test_portuguese_role_alias_accepted(mock_auth, mock_db, client):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "patient-pt"}
    profile = MagicMock()
    profile.exists = True
    profile.to_dict.return_value = {"role": "paciente", "active": True}
    mock_db.return_value.collection.return_value.document.return_value.get.return_value = profile

    res = client.get("/api/me", headers={"Authorization": "Bearer token"})
    assert res.status_code == 200
    assert res.get_json() == {"uid": "patient-pt", "role": "patient"}


@patch("farmasus.routes.exams.db_client")
@patch("farmasus.security.db_client")
@patch("farmasus.security.auth_client")
def test_pharmacist_with_unit_can_access_unit_exams(mock_auth, mock_profile_db, mock_exams_db, client):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "pharm-1"}
    profile = MagicMock()
    profile.exists = True
    profile.to_dict.return_value = {"role": "pharmacist", "active": True, "unitId": "posto-saude-10"}
    mock_profile_db.return_value.collection.return_value.document.return_value.get.return_value = profile

    mock_query = MagicMock()
    mock_query.stream.return_value = []
    mock_exams_db.return_value.collection.return_value.where.return_value = mock_query

    res = client.get("/api/exams", headers={"Authorization": "Bearer token"})
    assert res.status_code == 200
    mock_exams_db.return_value.collection.return_value.where.assert_called_once_with("unitId", "==", "posto-saude-10")


@patch("farmasus.security.db_client")
@patch("farmasus.security.auth_client")
def test_pharmacist_without_unit_forbidden(mock_auth, mock_profile_db, client):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "pharm-no-unit"}
    profile = MagicMock()
    profile.exists = True
    profile.to_dict.return_value = {"role": "pharmacist", "active": True, "unitId": None}
    mock_profile_db.return_value.collection.return_value.document.return_value.get.return_value = profile

    res = client.get("/api/exams", headers={"Authorization": "Bearer token"})
    assert res.status_code == 403


def test_missing_firebase_config_returns_503():
    app = create_app({"TESTING": True, "FIREBASE_PROJECT_ID": ""})
    client = app.test_client()
    with patch("farmasus.security.current_identity") as mock_identity:
        mock_identity.return_value = {"uid": "user-1", "role": "patient"}
        res = client.get("/api/exams")
        assert res.status_code == 503
