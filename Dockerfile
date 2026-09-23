FROM python:3.12-slim

WORKDIR /app

# Diagnostic: confirms in the build log which Python version is actually
# running this build. If this still prints 3.11.x, Render is not using
# this Dockerfile (stale cache, wrong path, or a non-Docker runtime).
RUN python --version

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# Install OS packages needed to build/run Python deps (psycopg2, pypdf, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

# Runtime data dirs (SQLite audit db, LangGraph memory, uploaded runbooks).
# NOTE: on Render's default web service these are on an EPHEMERAL disk and
# reset on every deploy/restart. Attach a Render Disk mounted at /app/data
# (and /app/uploads if you need uploads to persist) if you need this data
# to survive restarts. Incident data lives in Postgres (DATABASE_URL) and
# is unaffected by this.
RUN mkdir -p /app/data /app/uploads \
    && useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f "http://localhost:${PORT:-8080}/api/health" || exit 1

# Render sets $PORT at runtime; uvicorn must bind 0.0.0.0 to that port.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]