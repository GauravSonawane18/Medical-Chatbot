"""
Lightweight startup migrations.
Adds columns that were introduced after initial table creation.
Each statement uses IF NOT EXISTS so it is safe to run on every startup.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


_MIGRATIONS = [
    # doctor_notes: patient reply fields
    "ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS patient_reply TEXT",
    "ALTER TABLE doctor_notes ADD COLUMN IF NOT EXISTS patient_reply_at TIMESTAMPTZ",
    # chats: image/file attachment
    "ALTER TABLE chats ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500)",
    # patients: unique patient code
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code VARCHAR(20) UNIQUE",
]


def _generate_code(name: str, existing_codes: set[str]) -> str:
    import random
    import re
    initials = re.sub(r"[^A-Z]", "", (name or "PT").upper())[:3] or "PT"
    for _ in range(100):
        code = f"MDB-{initials}{random.randint(1000, 9999)}"
        if code not in existing_codes:
            return code
    # Fallback: extend digits
    return f"MDB-{initials}{random.randint(10000, 99999)}"


def run_migrations(db: Session) -> None:
    for stmt in _MIGRATIONS:
        db.execute(text(stmt))
    db.commit()

    # Backfill patient_code for existing patients that have none
    rows = db.execute(text("SELECT id, patient_code FROM patients WHERE patient_code IS NULL")).fetchall()
    if rows:
        existing = {r[1] for r in db.execute(text("SELECT patient_code FROM patients WHERE patient_code IS NOT NULL")).fetchall()}
        for (pid,) in [(r[0],) for r in rows]:
            name_row = db.execute(
                text("SELECT u.name FROM patients p JOIN users u ON u.id = p.user_id WHERE p.id = :pid"),
                {"pid": pid},
            ).fetchone()
            name = name_row[0] if name_row else "Patient"
            code = _generate_code(name, existing)
            existing.add(code)
            db.execute(text("UPDATE patients SET patient_code = :code WHERE id = :pid"), {"code": code, "pid": pid})
        db.commit()
