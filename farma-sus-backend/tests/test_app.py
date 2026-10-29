from unittest.mock import patch

from farmasus import create_app


def app_client():
    app = create_app({"TESTING": True, "FIREBASE_PROJECT_ID": "test-project"})
    return app.test_client()


def test_home_and_security_headers():
    response = app_client().get("/")
    assert response.status_code == 200
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]


def test_api_requires_a_bearer_token():
    response = app_client().get("/api/exams")
    assert response.status_code == 401


@patch("farmasus.routes.exams.db_client")
@patch("farmasus.security.db_client")
@patch("farmasus.security.auth_client")
def test_patient_can_only_query_own_exams(mock_auth, mock_profile_db, mock_exams_db):
    mock_auth.return_value.verify_id_token.return_value = {"uid": "patient-1"}
    profile = mock_profile_db.return_value.collection.return_value.document.return_value.get.return_value
    profile.exists = True
    profile.to_dict.return_value = {"role": "patient", "active": True}
    query = mock_exams_db.return_value.collection.return_value.where.return_value
    query.stream.return_value = []

    response = app_client().get("/api/exams", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    mock_exams_db.return_value.collection.return_value.where.assert_called_once_with("patientId", "==", "patient-1")
