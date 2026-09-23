import re
import psycopg2
import psycopg2.extras
from src.config import get_settings


def _conn():
    # psycopg2 doesn't understand SQLAlchemy-style "postgresql+psycopg://" or
    # "postgresql+psycopg2://" driver suffixes — strip them down to plain postgresql://
    dsn = re.sub(r"^postgresql\+\w+://", "postgresql://", get_settings().database_url)
    return psycopg2.connect(dsn)


def init_incidents_db() -> None:
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS sentinel_incidents (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            jira_key TEXT,
            jira_url TEXT,
            slack_ts TEXT,
            rag_answer TEXT,
            rag_route TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """)
        conn.commit()


def create_incident(title: str, description: str, jira_key: str = None, jira_url: str = None, slack_ts: str = None) -> dict:
    with _conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO sentinel_incidents (title, description, jira_key, jira_url, slack_ts)
               VALUES (%s, %s, %s, %s, %s) RETURNING *""",
            (title, description, jira_key, jira_url, slack_ts),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row)


def list_incidents(limit: int = 50) -> list:
    with _conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM sentinel_incidents ORDER BY id DESC LIMIT %s", (limit,))
        return [dict(r) for r in cur.fetchall()]


def get_incident(incident_id: int) -> dict | None:
    with _conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM sentinel_incidents WHERE id = %s", (incident_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def update_status(incident_id: int, status: str) -> dict | None:
    with _conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "UPDATE sentinel_incidents SET status = %s, updated_at = now() WHERE id = %s RETURNING *",
            (status, incident_id),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None


def save_rag_answer(incident_id: int, answer: str, route: str) -> dict | None:
    with _conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "UPDATE sentinel_incidents SET rag_answer = %s, rag_route = %s, updated_at = now() WHERE id = %s RETURNING *",
            (answer, route, incident_id),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None