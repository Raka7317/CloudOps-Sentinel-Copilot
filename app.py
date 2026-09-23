from pathlib import Path
import shutil
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.concurrency import run_in_threadpool


from src.models import ChatRequest, ChatResponse, UploadResponse, IncidentCreate, IncidentStatusUpdate, IncidentOut
from src.self_rag import run_self_rag
from src.ingestion import ingest_file, namespace, SUPPORTED
from src.db import init_db, save_audit, latest_audits
from src.incidents_db import init_incidents_db, create_incident, list_incidents, get_incident, update_status, save_rag_answer
from src.jira_client import create_ticket, transition_status
from src.slack_client import post_incident_message, post_status_update
from dotenv import load_dotenv


load_dotenv()  # Load environment variables from .env file

ROOT = Path(__file__).resolve().parent
UPLOADS = ROOT / "uploads"
UPLOADS.mkdir(exist_ok=True)


app = FastAPI(
    title="CloudOps Sentinel — Enterprise Incident Response Self-RAG Copilot",
    version="2.0.0",
    description="Self-RAG copilot for cloud operations, production troubleshooting, and incident-response runbooks.",
)
app.mount("/static", StaticFiles(directory=str(ROOT / "static")), name="static")
templates = Jinja2Templates(directory=str(ROOT / "templates"))



@app.on_event("startup")
def startup():
    init_db()
    init_incidents_db()


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "cloudops-sentinel-self-rag"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    try:
        result = await run_in_threadpool(run_self_rag, payload.question.strip(), payload.thread_id.strip())
        await run_in_threadpool(save_audit, payload.question, result)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED:
        raise HTTPException(status_code=400, detail="Supported: PDF, TXT, MD, DOCX")
    safe_name = Path(file.filename).name
    target = UPLOADS / safe_name
    with target.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        count = await run_in_threadpool(ingest_file, target)
        return UploadResponse(filename=safe_name, chunks_indexed=count, namespace=namespace())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/audits")
def audits(limit: int = 20):
    return latest_audits(min(max(limit, 1), 100))


@app.post("/api/incidents", response_model=IncidentOut)
async def create_incident_endpoint(payload: IncidentCreate):
    try:
        ticket = await run_in_threadpool(create_ticket, payload.title, payload.description)
        slack_ts = await run_in_threadpool(post_incident_message, payload.title, payload.description, ticket["url"])
        row = await run_in_threadpool(
            create_incident, payload.title, payload.description, ticket["key"], ticket["url"], slack_ts
        )
        return IncidentOut(**row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/incidents", response_model=list[IncidentOut])
def list_incidents_endpoint(limit: int = 50):
    return [IncidentOut(**r) for r in list_incidents(min(max(limit, 1), 200))]


@app.patch("/api/incidents/{incident_id}/status", response_model=IncidentOut)
async def update_incident_status(incident_id: int, payload: IncidentStatusUpdate):
    inc = await run_in_threadpool(get_incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    row = await run_in_threadpool(update_status, incident_id, payload.status)
    if row.get("jira_key"):
        try:
            await run_in_threadpool(transition_status, row["jira_key"], payload.status)
        except Exception:
            pass  # don't fail the request just because Jira's workflow didn't match
    try:
        await run_in_threadpool(post_status_update, row.get("slack_ts"), row["title"], payload.status)
    except Exception:
        pass
    return IncidentOut(**row)


@app.post("/api/incidents/{incident_id}/resolve", response_model=IncidentOut)
async def resolve_incident_endpoint(incident_id: int):
    inc = await run_in_threadpool(get_incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    try:
        result = await run_in_threadpool(
            run_self_rag, inc["description"] or inc["title"], f"incident-{incident_id}"
        )
        row = await run_in_threadpool(save_rag_answer, incident_id, result.get("answer", ""), result.get("route", ""))
        return IncidentOut(**row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)