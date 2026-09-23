import requests
from src.config import get_settings


def _is_webhook(token: str) -> bool:
    return token.startswith("https://hooks.slack.com/")


def post_incident_message(title: str, description: str, jira_url: str = "") -> str:
    s = get_settings()
    text = f":rotating_light: *New incident:* {title}"
    if description:
        text += f"\n{description}"
    if jira_url:
        text += f"\n<{jira_url}|View Jira ticket>"

    token = s.slack_bot_token

    if _is_webhook(token):
        r = requests.post(token, json={"text": text}, timeout=15)
        if r.status_code != 200 or r.text != "ok":
            raise RuntimeError(f"Slack webhook error: {r.status_code} {r.text}")
        return ""  # webhooks don't return a message ts, so status updates can't thread

    r = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {token}"},
        json={"channel": s.slack_channel_id, "text": text},
        timeout=15,
    )
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack error: {data.get('error')}")
    return data["ts"]


def post_status_update(thread_ts: str, title: str, status: str) -> None:
    s = get_settings()
    text = f"Status of *{title}* updated to *{status.replace('_', ' ')}*"
    token = s.slack_bot_token

    if _is_webhook(token):
        requests.post(token, json={"text": text}, timeout=15)
        return

    if not thread_ts:
        return
    requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {token}"},
        json={"channel": s.slack_channel_id, "thread_ts": thread_ts, "text": text},
        timeout=15,
    )