from unittest.mock import MagicMock, patch

import pytest

from farmasus import create_app


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "FIREBASE_PROJECT_ID": "test-project"})
    return app.test_client()


def _snapshot(document_id, data):
    snapshot = MagicMock()
    snapshot.id = document_id
    snapshot.exists = True
    snapshot.to_dict.return_value = data
    return snapshot


@patch("farmasus.routes.pharmacist.current_identity")
@patch("farmasus.security.current_identity")
@patch("farmasus.routes.pharmacist.db_client")
def test_pharmacist_state_is_scoped_to_unit(mock_db_client, mock_security_identity, mock_identity, client):
    identity = {"uid": "pharm-1", "role": "pharmacist", "unitId": "unit-1"}
    mock_security_identity.return_value = identity
    mock_identity.return_value = identity

    profile = _snapshot("pharm-1", {
        "name": "Marina Costa",
        "crf": "CRF-PA 7842",
        "unitName": "Farmácia Centro",
    })
    exam = _snapshot("exam-1", {
        "unitId": "unit-1",
        "patientId": "patient-1",
        "patientName": "Ana Ribeiro",
        "medicineName": "Losartana 50 mg",
        "status": "pending",
    })
    medicine = _snapshot("med-1", {
        "unitId": "unit-1",
        "name": "Losartana 50 mg",
        "quantity": 12,
        "available": True,
    })

    users = MagicMock()
    users.document.return_value.get.return_value = profile
    exams = MagicMock()
    exams.where.return_value.stream.return_value = [exam]
    medicines = MagicMock()
    medicines.where.return_value.stream.return_value = [medicine]
    clients = MagicMock()
    clients.where.return_value.stream.return_value = []
    collections = {"users": users, "exams": exams, "medicines": medicines, "clients": clients}
    mock_db_client.return_value.collection.side_effect = collections.__getitem__

    response = client.get("/api/pharmacist/state")

    assert response.status_code == 200
    data = response.get_json()
    assert data["professional"] == "Marina Costa · CRF-PA 7842"
    assert data["laudos"][0]["id"] == "exam-1"
    assert data["medicamentos"][0]["id"] == "med-1"
    exams.where.assert_called_once_with("unitId", "==", "unit-1")
    medicines.where.assert_called_once_with("unitId", "==", "unit-1")
    clients.where.assert_called_once_with("unitId", "==", "unit-1")


@patch("farmasus.routes.pharmacist.current_identity")
@patch("farmasus.security.current_identity")
@patch("farmasus.routes.pharmacist.db_client")
def test_pharmacist_can_start_analysis(mock_db_client, mock_security_identity, mock_identity, client):
    identity = {"uid": "pharm-1", "role": "pharmacist", "unitId": "unit-1"}
    mock_security_identity.return_value = identity
    mock_identity.return_value = identity

    profile = _snapshot("pharm-1", {"name": "Marina Costa"})
    exam = _snapshot("exam-1", {"unitId": "unit-1", "status": "pending"})
    users = MagicMock()
    users.document.return_value.get.return_value = profile
    exams = MagicMock()
    exams.document.return_value.get.return_value = exam
    collections = {"users": users, "exams": exams}
    mock_db_client.return_value.collection.side_effect = collections.__getitem__

    response = client.post(
        "/api/pharmacist/exams/exam-1/actions",
        json={"action": "start_analysis"},
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "Em análise"
    update = exam.reference.update.call_args.args[0]
    assert update["status"] == "under_review"


@patch("farmasus.routes.pharmacist.current_identity")
@patch("farmasus.security.current_identity")
@patch("farmasus.routes.pharmacist.db_client")
def test_pharmacist_cannot_change_another_unit(mock_db_client, mock_security_identity, mock_identity, client):
    identity = {"uid": "pharm-1", "role": "pharmacist", "unitId": "unit-1"}
    mock_security_identity.return_value = identity
    mock_identity.return_value = identity

    profile = _snapshot("pharm-1", {"name": "Marina Costa"})
    exam = _snapshot("exam-2", {"unitId": "unit-2", "status": "pending"})
    users = MagicMock()
    users.document.return_value.get.return_value = profile
    exams = MagicMock()
    exams.document.return_value.get.return_value = exam
    collections = {"users": users, "exams": exams}
    mock_db_client.return_value.collection.side_effect = collections.__getitem__

    response = client.post(
        "/api/pharmacist/exams/exam-2/actions",
        json={"action": "start_analysis"},
    )

    assert response.status_code == 403
    exam.reference.update.assert_not_called()


@patch("farmasus.routes.pharmacist.current_identity")
@patch("farmasus.security.current_identity")
@patch("farmasus.routes.pharmacist.db_client")
def test_pharmacist_can_create_in_person_client(mock_db_client, mock_security_identity, mock_identity, client):
    identity = {"uid": "pharm-1", "role": "pharmacist", "unitId": "unit-1"}
    mock_security_identity.return_value = identity
    mock_identity.return_value = identity

    created = _snapshot("client-1", {
        "unitId": "unit-1",
        "name": "Maria Silva",
        "cpf": "123.456.789-01",
        "cns": "123 4567 8901 2345",
        "birthDate": "1980-05-10",
        "phone": "(91) 99999-0000",
        "address": "Rua A, 10, Belém - PA",
    })
    client_ref = MagicMock()
    client_ref.get.return_value = created
    clients = MagicMock()
    clients.where.return_value.stream.return_value = []
    clients.document.return_value = client_ref
    mock_db_client.return_value.collection.return_value = clients

    response = client.post("/api/pharmacist/clients", json={
        "nome": "Maria Silva",
        "cpf": "123.456.789-01",
        "cns": "123 4567 8901 2345",
        "nascimento": "1980-05-10",
        "telefone": "(91) 99999-0000",
        "email": "maria@example.com",
        "endereco": "Rua A, 10, Belém - PA",
    })

    assert response.status_code == 201
    assert response.get_json()["cliente"]["id"] == "client-1"
    saved = client_ref.set.call_args.args[0]
    assert saved["unitId"] == "unit-1"
    assert saved["source"] == "in_person"


@patch("farmasus.routes.pharmacist.current_identity")
@patch("farmasus.security.current_identity")
@patch("farmasus.routes.pharmacist.db_client")
def test_pharmacist_can_create_manual_order(mock_db_client, mock_security_identity, mock_identity, client):
    identity = {"uid": "pharm-1", "role": "pharmacist", "unitId": "unit-1"}
    mock_security_identity.return_value = identity
    mock_identity.return_value = identity

    profile = _snapshot("pharm-1", {"name": "Marina Costa"})
    client_snapshot = _snapshot("client-1", {
        "unitId": "unit-1",
        "name": "Maria Silva",
        "cpf": "123.456.789-01",
        "cns": "123 4567 8901 2345",
    })
    created_exam = _snapshot("exam-manual-1", {
        "unitId": "unit-1",
        "patient": {"id": "client-1", "nome": "Maria Silva", "cpf": "123.456.789-01", "cns": "123 4567 8901 2345"},
        "medicineName": "Losartana 50 mg",
        "dose": "1 comprimido ao dia",
        "prescriber": "Dr. João",
        "crm": "CRM-PA 1000",
        "expiresAt": "2099-12-31",
        "priority": "Normal",
        "status": "pending",
        "fileName": "Laudo físico entregue na unidade",
    })
    exam_ref = MagicMock()
    exam_ref.get.return_value = created_exam

    users = MagicMock()
    users.document.return_value.get.return_value = profile
    clients = MagicMock()
    clients.document.return_value.get.return_value = client_snapshot
    exams = MagicMock()
    exams.document.return_value = exam_ref
    collections = {"users": users, "clients": clients, "exams": exams}
    mock_db_client.return_value.collection.side_effect = collections.__getitem__

    response = client.post("/api/pharmacist/manual-orders", json={
        "clienteId": "client-1",
        "medicamento": "Losartana 50 mg",
        "dose": "1 comprimido ao dia",
        "prescritor": "Dr. João",
        "crm": "CRM-PA 1000",
        "validade": "2099-12-31",
        "prioridade": "Normal",
    })

    assert response.status_code == 201
    assert response.get_json()["laudo"]["id"] == "exam-manual-1"
    saved = exam_ref.set.call_args.args[0]
    assert saved["source"] == "manual"
    assert saved["patientId"] == "client-1"
    assert saved["status"] == "pending"
