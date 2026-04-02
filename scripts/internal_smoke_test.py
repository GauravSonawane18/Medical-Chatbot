import json
import sys
import time
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


def main() -> None:
    suffix = str(int(time.time()))
    patient_email = f"patient_full_{suffix}@example.com"
    doctor_email = f"doctor_full_{suffix}@example.com"

    results: dict[str, object] = {}

    with TestClient(app) as client:
        response = client.get("/health")
        results["health"] = {"status_code": response.status_code, "body": response.json()}

        patient_register = client.post(
            "/register",
            json={
                "name": "Full Test Patient",
                "email": patient_email,
                "password": "StrongPass123",
                "role": "patient",
                "age": 41,
                "gender": "female",
                "allergies": "penicillin",
            },
        )
        patient_json = patient_register.json()
        patient_token = patient_json["access_token"]
        results["patient_register"] = {
            "status_code": patient_register.status_code,
            "user_id": patient_json["user"]["id"],
        }

        doctor_register = client.post(
            "/register",
            json={
                "name": "Full Test Doctor",
                "email": doctor_email,
                "password": "StrongPass123",
                "role": "doctor",
            },
        )
        doctor_json = doctor_register.json()
        doctor_token = doctor_json["access_token"]
        results["doctor_register"] = {
            "status_code": doctor_register.status_code,
            "user_id": doctor_json["user"]["id"],
        }

        patients = client.get("/patients", headers={"Authorization": f"Bearer {doctor_token}"})
        patients_json = patients.json()
        target_patient = next(item for item in patients_json if item["user"]["email"] == patient_email)
        patient_id = target_patient["id"]
        results["patients"] = {
            "status_code": patients.status_code,
            "count": len(patients_json),
            "target_patient_id": patient_id,
        }

        medical_history = client.post(
            "/doctor/medical-history",
            json={
                "patient_id": patient_id,
                "condition": "Hypertension",
                "notes": "On regular medication",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        results["medical_history_create"] = {
            "status_code": medical_history.status_code,
            "condition": medical_history.json().get("condition"),
        }

        doctor_note = client.post(
            "/doctor/notes",
            json={
                "patient_id": patient_id,
                "notes": "Monitor blood pressure daily",
                "diagnosis": "Stage 1 hypertension",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        results["doctor_note_create"] = {
            "status_code": doctor_note.status_code,
            "diagnosis": doctor_note.json().get("diagnosis"),
        }

        patient_details = client.get(
            f"/patients/{patient_id}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        patient_details_json = patient_details.json()
        results["patient_details"] = {
            "status_code": patient_details.status_code,
            "medical_history_count": len(patient_details_json.get("medical_history", [])),
            "doctor_notes_count": len(patient_details_json.get("doctor_notes", [])),
        }

        with patch(
            "app.services.chat_service.generate_with_ollama",
            return_value="Please rest, hydrate, and monitor symptoms carefully.",
        ):
            chat = client.post(
                "/chat",
                json={
                    "message": "I have chest pain and shortness of breath",
                    "symptoms": "chest pain, shortness of breath",
                },
                headers={"Authorization": f"Bearer {patient_token}"},
            )
        chat_json = chat.json()
        results["chat"] = {
            "status_code": chat.status_code,
            "is_flagged": chat_json.get("is_flagged"),
            "severity_level": chat_json.get("severity_level"),
        }

        chat_history = client.get("/chat/history", headers={"Authorization": f"Bearer {patient_token}"})
        results["chat_history"] = {
            "status_code": chat_history.status_code,
            "count": len(chat_history.json()),
        }

        flagged = client.get(
            "/doctor/flagged-chats",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        results["flagged_chats"] = {
            "status_code": flagged.status_code,
            "count": len(flagged.json()),
        }

        patient_medical_history = client.get(
            "/medical-history",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        results["patient_medical_history"] = {
            "status_code": patient_medical_history.status_code,
            "count": len(patient_medical_history.json()),
        }

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
