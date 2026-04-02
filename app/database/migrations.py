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
]


def run_migrations(db: Session) -> None:
    for stmt in _MIGRATIONS:
        db.execute(text(stmt))
    db.commit()
