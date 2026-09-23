import requests
from requests.auth import HTTPBasicAuth
from src.config import get_settings

# Maps our internal status values to typical Jira workflow transition names.
# If your project's workflow uses different names, edit the values here.
STATUS_TO_TRANSITION_NAME = {
    "open": "To Do",
    "in_progress": "In Progress",
    "review": "In Review",
    "resolved": "Done",
}


def _auth():
    s = get_settings()
    return HTTPBasicAuth(s.jira_email, s.jira_api_token)


def create_ticket(title: str, description: str) -> dict:
    s = get_settings()
    url = f"{s.jira_base_url}/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {"key": s.jira_project_key},
            "summary": title,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": description or title}]}],
            },
            "issuetype": {"name": "Task"},
        }
    }
    r = requests.post(url, json=payload, auth=_auth(), headers={"Accept": "application/json"}, timeout=15)
    r.raise_for_status()
    key = r.json()["key"]
    return {"key": key, "url": f"{s.jira_base_url}/browse/{key}"}


def transition_status(jira_key: str, status: str) -> None:
    """Best-effort: looks up available transitions and moves to the matching one by name.
    Silently does nothing if there's no matching transition (e.g. different workflow)."""
    s = get_settings()
    target_name = STATUS_TO_TRANSITION_NAME.get(status)
    if not target_name:
        return
    url = f"{s.jira_base_url}/rest/api/3/issue/{jira_key}/transitions"
    r = requests.get(url, auth=_auth(), headers={"Accept": "application/json"}, timeout=15)
    r.raise_for_status()
    match = next(
        (t for t in r.json().get("transitions", []) if t["name"].lower() == target_name.lower()), None
    )
    if not match:
        return
    r2 = requests.post(
        url, json={"transition": {"id": match["id"]}}, auth=_auth(),
        headers={"Accept": "application/json"}, timeout=15,
    )
    r2.raise_for_status()
