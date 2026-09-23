# 🚨 CloudOps Sentinel — AI-Powered Incident Response & Self-RAG Copilot

**CloudOps Sentinel** is a production-style AI incident response platform that combines **Self-RAG, LangGraph, Pinecone, Jira, Slack, PostgreSQL, and persistent agent memory** into a unified CloudOps command center.

It helps engineers investigate production incidents, retrieve relevant internal runbooks, validate AI-generated troubleshooting guidance, create Jira tickets, notify Slack channels, track incident status, and maintain incident context across follow-up questions.

🔗 **Live Demo:** https://cloudops-sentinel-copilot.onrender.com

---

## ✨ Key Features

### 🤖 Self-RAG Incident Investigation

CloudOps Sentinel does not blindly generate answers.

It follows a verification-oriented retrieval workflow:

```text
User Question
     ↓
Persistent Memory
     ↓
Contextualize Question
     ↓
Decide if Retrieval is Required
     ↓
Private Knowledge Base
     ↓
Grade Retrieved Documents
     ↓
Relevant Evidence?
   ↙          ↘
 YES           NO
  ↓             ↓
Generate     Rewrite Query
  ↓             ↓
Check Support  Retry Retrieval
  ↓             ↓
IsSUP          Internet Search
  ↓             ↓
Revise Answer  Grade Web Evidence
  ↓             ↓
IsUSE ← Generate Answer
  ↓
Final Answer
  ↓
Persist Memory
```

The system can:

* Retrieve internal operational knowledge
* Grade document relevance
* Rewrite weak retrieval queries
* Fall back to internet search when internal evidence is insufficient
* Verify whether generated answers are supported by evidence
* Revise unsupported answers
* Evaluate answer usefulness
* Stop when reliable evidence cannot be found

---

## 🎫 Jira Integration

CloudOps Sentinel integrates with **Jira** to turn incidents into trackable engineering tickets.

When an incident is created from the UI:

```text
Create Incident
      ↓
CloudOps Sentinel
      ↓
Create Jira Ticket
      ↓
Store Jira Key + URL
      ↓
Store Incident in PostgreSQL
```

Each incident can contain:

* Incident title
* Description
* Jira ticket key
* Jira ticket URL
* Current status
* Self-RAG resolution suggestion
* RAG route
* Slack message reference
* Creation/update timestamps

### Jira Status Synchronization

The application supports the following internal incident states:

```text
open
   ↓
in_progress
   ↓
review
   ↓
resolved
```

Status changes are propagated to the configured Jira workflow when a matching transition is available.

The current mapping is:

| CloudOps Status | Jira Transition |
| --------------- | --------------- |
| `open`          | To Do           |
| `in_progress`   | In Progress     |
| `review`        | In Review       |
| `resolved`      | Done            |

> Jira transition names can be modified in `src/jira_client.py` to match your Jira project's workflow.

---

## 💬 Slack Integration

When a new incident is created, CloudOps Sentinel automatically sends a notification to the configured Slack channel.

Example flow:

```text
Incident Created
      ↓
Create Jira Ticket
      ↓
Post Slack Notification
      ↓
Store Incident
      ↓
Display in Dashboard
```

Slack notifications include:

* Incident title
* Incident description
* Jira ticket link

When the incident status changes, CloudOps Sentinel can also post a status update to the Slack conversation/thread.

The project supports:

* Slack Bot Token
* Slack Channel ID
* Slack Incoming Webhook

---

## 🧠 Persistent AI Memory

CloudOps Sentinel uses **LangGraph SQLite persistence** to maintain incident context across multiple questions.

Example:

### First question

> Our checkout API is returning 502 errors after deployment. What should I check first?

### Follow-up

> What should I check next if that doesn't work?

The second question can use the context from the previous interaction.

```text
Thread ID
    ↓
LangGraph Checkpointer
    ↓
SQLite
    ↓
Previous Incident Context
    ↓
Contextualize Follow-up
    ↓
Self-RAG
```

Each browser session receives a persistent `thread_id`.

Memory is stored locally in:

```text
data/langgraph_memory.sqlite
```

---

# 📊 Incident Command Center

The application provides a web-based operations console for managing incidents.

The UI contains:

### AI Copilot

Ask production troubleshooting questions and receive:

* AI-generated response
* Retrieval route
* Internal sources
* Web sources
* IsSUP verification status
* IsUSE usefulness status
* Self-RAG workflow trace
* SQLite memory information

### Runbook Vault

Upload operational documents directly from the UI.

Supported formats:

* PDF
* TXT
* Markdown
* DOCX

Uploaded documents are processed using the same ingestion pipeline as the initial knowledge base.

```text
Upload Document
      ↓
Document Loader
      ↓
Chunking
      ↓
OpenAI Embeddings
      ↓
Pinecone
      ↓
Existing Namespace
```

### Incident Management

The incident interface allows engineers to:

* Create incidents
* Automatically create Jira tickets
* Notify Slack
* View existing incidents
* Change incident status
* Request a Self-RAG resolution suggestion
* View the generated resolution guidance
* Open the corresponding Jira ticket

### Incident Dashboard

The dashboard provides a high-level operational view:

```text
Total Incidents
Open
In Progress
Review
Resolved
```

It also displays:

* Incident title
* Current status
* Jira ticket
* Last updated time
* Status distribution

---

# 🏗️ System Architecture

![CloudOps Sentinel Incident Response Console](docs/screenshot.png)

![CloudOps Sentinel Architecture Diagram](docs/architecture_diagram.png)

```text
                           ┌──────────────────────┐
                           │       Engineer       │
                           └──────────┬───────────┘
                                      │
                                      ▼
                    ┌────────────────────────────────┐
                    │ CloudOps Sentinel Web Console   │
                    │                                │
                    │ AI Copilot                     │
                    │ Incident Management            │
                    │ Dashboard                      │
                    │ Runbook Vault                  │
                    └───────────────┬────────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │      FastAPI       │
                         └─────────┬──────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
      ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
      │  LangGraph   │     │   Incidents   │     │ Document     │
      │   Self-RAG   │     │   Management  │     │ Ingestion    │
      └──────┬───────┘     └───────┬───────┘     └──────┬───────┘
             │                     │                     │
             │                     │                     ▼
             │                     │              ┌─────────────┐
             │                     │              │  OpenAI     │
             │                     │              │ Embeddings  │
             │                     │              └──────┬──────┘
             │                     │                     │
             │                     │                     ▼
             │                     │              ┌─────────────┐
             │                     │              │  Pinecone   │
             │                     │              │ Vector DB   │
             │                     │              └─────────────┘
             │                     │
             │                     ├──────────────► Jira
             │                     │
             │                     └──────────────► Slack
             │
             ├──────────────► SQLite
             │                LangGraph Memory
             │
             ├──────────────► Pinecone
             │                Private Runbooks
             │
             └──────────────► Tavily
                              Internet Fallback
```

---

# 🔄 Self-RAG Workflow

The core AI workflow is implemented using **LangGraph**.

```text
START
  │
  ▼
Contextualize Question
  │
  ▼
Decide Retrieval
  │
  ├─────────────── General Question
  │                     │
  │                     ▼
  │               Direct Answer
  │
  ▼
Private Retrieval
  │
  ▼
Grade Documents
  │
  ├──────── Relevant ────────► Generate
  │                              │
  │                              ▼
  │                           IsSUP
  │                              │
  │                    ┌─────────┴─────────┐
  │                    │                   │
  │                 Supported          Unsupported
  │                    │                   │
  │                    │                   ▼
  │                    │                Revise
  │                    │                   │
  │                    └──────────┬────────┘
  │                               ▼
  │                             IsUSE
  │                               │
  │                               ▼
  │                          Final Answer
  │
  └──────── Not Relevant
               │
               ▼
        Rewrite Internal Query
               │
               ▼
        Retry Pinecone Retrieval
               │
               ▼
        Still Insufficient?
               │
               ▼
        Rewrite Web Query
               │
               ▼
          Tavily Search
               │
               ▼
        Grade Web Evidence
               │
               ▼
          Generate Answer
```

---

# 🔍 Retrieval Strategy

CloudOps Sentinel follows a **private-first retrieval strategy**.

### Step 1 — Private Knowledge Base

The system searches the organization's internal operational knowledge stored in Pinecone.

Examples:

* Production runbooks
* SOPs
* Troubleshooting documents
* Deployment procedures
* Architecture notes
* Postmortems

### Step 2 — Relevance Grading

Retrieved documents are evaluated by an LLM-based relevance grader.

```text
Retrieved Documents
        ↓
Relevance Grader
        ↓
Relevant Documents
```

### Step 3 — Query Rewriting

If the retrieved evidence is insufficient, the system rewrites the retrieval query and retries.

### Step 4 — Internet Fallback

If private knowledge remains insufficient, the system uses Tavily to search the internet.

```text
Private KB
   ↓
Insufficient Evidence
   ↓
Query Rewrite
   ↓
Private KB Retry
   ↓
Insufficient Evidence
   ↓
Tavily Internet Search
```

This keeps internal operational knowledge as the primary source while still allowing external technical research when necessary.

---

# ✅ Answer Verification

CloudOps Sentinel uses two verification stages.

## IsSUP — Support Verification

The system checks whether the generated answer is actually supported by the retrieved evidence.

Possible states:

```text
fully_supported
partially_supported
no_support
```

If the answer contains unsupported claims, the system revises the answer using only the available evidence.

---

## IsUSE — Usefulness Verification

After grounding verification, another evaluation checks whether the response actually addresses the user's question.

Possible states:

```text
useful
not_useful
```

If the answer is not useful, the system can return to retrieval/query rewriting instead of immediately returning a poor answer.

---

# 🗄️ Data Storage

The project uses different persistence layers for different responsibilities.

| Storage             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| **Pinecone**        | Private operational knowledge and vector search |
| **PostgreSQL**      | Incident records and Jira/Slack metadata        |
| **SQLite**          | LangGraph conversational memory                 |
| **SQLite audit DB** | Application request/audit history               |

### PostgreSQL Incident Schema

The incident database stores:

```text
id
title
description
status
jira_key
jira_url
slack_ts
rag_answer
rag_route
created_at
updated_at
```

This allows the frontend, Jira integration, Slack integration, and AI resolution workflow to operate around the same incident record.

---

# 🧩 Tech Stack

## AI / GenAI

* Python
* OpenAI GPT-5-mini
* OpenAI `text-embedding-3-large`
* LangChain
* LangGraph
* Self-RAG
* Structured LLM outputs
* Query rewriting
* Retrieval grading
* Answer grounding
* Answer usefulness evaluation

## Retrieval

* Pinecone
* Vector Search
* Semantic Retrieval
* Document Chunking
* Tavily Internet Search

## Backend

* FastAPI
* Pydantic
* Python
* Uvicorn
* REST APIs

## Incident Management

* Jira REST API
* Slack API / Slack Webhooks
* PostgreSQL

## Memory & Persistence

* LangGraph SQLite Checkpointer
* SQLite
* PostgreSQL

## Frontend

* HTML
* CSS
* JavaScript
* Responsive operations dashboard
* Incident management console

## Deployment

* Docker
* Render
* PostgreSQL
* Environment-based configuration

---

# 📁 Project Structure

```text
CloudOps-Sentinel-Copilot/
│
├── app.py
├── data_ingestion.py
├── render.yaml
├── Dockerfile
├── requirements.txt
├── LICENSE
├── README.md
│
├── documents/
│   ├── checkout-api-runbook.md
│   ├── deployment-rollback-sop.md
│   └── payments-high-cpu-runbook.md
│
├── docs/
│   ├── architecture_diagram.png
│   ├── screenshot.png
│   └── CloudOps_Sentinel_Customer_Problem_Statement.pdf
│
├── src/
│   ├── __init__.py
│   ├── config.py
│   ├── db.py
│   ├── incidents_db.py
│   ├── ingestion.py
│   ├── jira_client.py
│   ├── models.py
│   ├── self_rag.py
│   ├── slack_client.py
│   └── vectorstore.py
│
├── static/
│   ├── app.js
│   ├── dashboard.js
│   ├── incidents.js
│   └── styles.css
│
├── templates/
│   └── index.html
│
├── uploads/
│
└── data/
    ├── audit.db
    └── langgraph_memory.sqlite
```

---

# 🚀 Local Setup

## 1. Clone the repository

```bash
git clone https://github.com/<your-username>/CloudOps-Sentinel-Copilot.git

cd CloudOps-Sentinel-Copilot
```

---

## 2. Create a virtual environment

Python **3.11 or 3.12** is recommended.

### Windows

```bash
py -3.12 -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3.12 -m venv venv
source venv/bin/activate
```

---

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

# 🔐 Environment Variables

Create a `.env` file in the project root.

```env
# =========================
# OpenAI
# =========================

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5-mini

EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSION=3072


# =========================
# Pinecone
# =========================

PINECONE_API_KEY=your_pinecone_api_key

PINECONE_INDEX_NAME=cloudops-sentinel-openai-self-rag
PINECONE_NAMESPACE=incident-runbooks

PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1


# =========================
# Tavily
# =========================

TAVILY_API_KEY=your_tavily_api_key


# =========================
# Self-RAG
# =========================

TOP_K=5
MAX_SUPPORT_RETRIES=2
MAX_RETRIEVAL_REWRITES=2
MAX_WEB_REWRITES=2

DATABASE_PATH=data/audit.db


# =========================
# PostgreSQL
# =========================

DATABASE_URL=postgresql://username:password@host:5432/database


# =========================
# Jira
# =========================

JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY


# =========================
# Slack
# =========================

SLACK_BOT_TOKEN=xoxb-your-slack-token
SLACK_CHANNEL_ID=your_channel_id
```

> Never commit `.env` or API credentials to GitHub.

---

# 📚 Build the Pinecone Knowledge Base

Place your initial operational documents inside:

```text
documents/
```

Supported document types include:

* PDF
* TXT
* Markdown
* DOCX

Then run:

```bash
python data_ingestion.py
```

The ingestion pipeline performs:

```text
Documents
   ↓
Load Documents
   ↓
Split Into Chunks
   ↓
Generate Embeddings
   ↓
OpenAI text-embedding-3-large
   ↓
Pinecone
   ↓
incident-runbooks namespace
```

The application and ingestion pipeline share the same configuration for:

* Embedding model
* Embedding dimension
* Pinecone index
* Pinecone namespace

This prevents ingestion/runtime embedding mismatches.

---

# ▶️ Run the Application

Start the application with:

```bash
python app.py
```

The application runs on:

```text
http://127.0.0.1:8080
```

Or run with Uvicorn:

```bash
uvicorn app:app --reload
```

The default Uvicorn port is:

```text
http://127.0.0.1:8000
```

---

# 🔌 API Endpoints

## Health Check

```http
GET /api/health
```

Example:

```json
{
  "status": "ok",
  "service": "cloudops-sentinel-self-rag"
}
```

---

## AI Chat

```http
POST /api/chat
```

Request:

```json
{
  "question": "Our checkout API is returning 502 errors. What should I check?",
  "thread_id": "incident-123"
}
```

Response contains:

```json
{
  "answer": "...",
  "route": "Private Runbooks",
  "used_web_search": false,
  "support_status": "fully_supported",
  "usefulness": "useful",
  "sources": [],
  "trace": [],
  "thread_id": "incident-123",
  "memory_turns": 2
}
```

---

## Upload Knowledge

```http
POST /api/upload
```

Supported:

```text
PDF
TXT
MD
DOCX
```

The uploaded document is immediately processed and indexed into the configured Pinecone namespace.

---

## Create Incident

```http
POST /api/incidents
```

Example:

```json
{
  "title": "Checkout API returning 502",
  "description": "Checkout requests are failing after the latest deployment."
}
```

This triggers:

```text
Create Incident
      ↓
Jira Ticket
      ↓
Slack Notification
      ↓
PostgreSQL
      ↓
Frontend
```

---

## List Incidents

```http
GET /api/incidents
```

---

## Update Incident Status

```http
PATCH /api/incidents/{incident_id}/status
```

Example:

```json
{
  "status": "in_progress"
}
```

The status is stored in PostgreSQL and the application attempts to synchronize it with Jira and Slack.

---

## Generate Self-RAG Incident Resolution

```http
POST /api/incidents/{incident_id}/resolve
```

The incident description is passed through the Self-RAG pipeline.

The resulting:

* AI resolution suggestion
* RAG route

are stored with the incident.

---

# 🧪 Example Incident Workflow

A typical CloudOps workflow looks like this:

```text
Production Alert
      ↓
Engineer Opens CloudOps Sentinel
      ↓
Create Incident
      ↓
Jira Ticket Created
      ↓
Slack Notification Sent
      ↓
Incident Stored in PostgreSQL
      ↓
Engineer Requests AI Assistance
      ↓
Self-RAG Searches Private Runbooks
      ↓
Evidence is Graded
      ↓
AI Generates Troubleshooting Steps
      ↓
Answer is Grounded
      ↓
Engineer Changes Status
      ↓
Jira + Slack Updated
      ↓
Incident Resolved
```

---

# 🎬 Recommended Demo

## Demo 1 — Private Runbook Retrieval

Ask:

> Our checkout API is returning 502 errors after deployment. What should the on-call engineer check first?

Expected:

```text
Route: Private Runbooks
```

The response should use the internal checkout runbook.

---

## Demo 2 — Persistent Memory

Ask:

> Our checkout API is returning 502 errors after deployment. What should I check first?

Then ask:

> What should I check next if that doesn't work?

The second question demonstrates persistent LangGraph memory.

---

## Demo 3 — Create Incident

From the Incident Management interface:

```text
Title:
Checkout API 502 after deployment

Description:
Production checkout requests are failing with HTTP 502 responses.
```

Click:

```text
Create Ticket + Notify Slack
```

Expected:

```text
CloudOps Sentinel
      ↓
Jira Ticket Created
      ↓
Slack Notification
      ↓
PostgreSQL Incident Record
```

---

## Demo 4 — Change Status

Change:

```text
Open
   ↓
In Progress
```

The application updates the database and attempts to synchronize the status with Jira and Slack.

---

## Demo 5 — AI Resolution

Click:

```text
Get Self-RAG Suggestion
```

The incident description is passed through the Self-RAG workflow and the generated troubleshooting guidance is stored with the incident.

---

## Demo 6 — Internet Fallback

Ask a technical question that is not covered by the private runbooks.

The system attempts:

```text
Pinecone
   ↓
Relevance Grading
   ↓
Query Rewrite
   ↓
Pinecone Retry
   ↓
Tavily Internet Search
```

The final response identifies external evidence when web search is used.

---

# ☁️ Render Deployment

The project includes:

```text
render.yaml
```

The deployment architecture uses:

```text
Render
 │
 ├── Web Service
 │      │
 │      └── Docker
 │
 └── PostgreSQL
```

The Render configuration automatically provisions the PostgreSQL database and connects its connection string through:

```env
DATABASE_URL
```

Set the remaining secrets in Render:

```text
OPENAI_API_KEY
PINECONE_API_KEY
TAVILY_API_KEY

JIRA_BASE_URL
JIRA_EMAIL
JIRA_API_TOKEN
JIRA_PROJECT_KEY

SLACK_BOT_TOKEN
SLACK_CHANNEL_ID
```

The application exposes:

```text
GET /api/health
```

for deployment health checks.

---

# 🔐 Security Considerations

This project is designed as a production-style demonstration and should be hardened before handling real production incidents.

Recommended improvements include:

* Authentication and authorization
* Role-based access control
* Secret management through a dedicated secrets manager
* Jira permission restrictions
* Slack channel permission restrictions
* Input validation and rate limiting
* Audit logging
* PII/secret redaction
* Encryption at rest
* HTTPS-only communication
* Production-grade LangGraph persistence
* PostgreSQL connection pooling
* Observability and alerting

Never commit:

```text
.env
API keys
Jira tokens
Slack tokens
OpenAI keys
Pinecone keys
database credentials
```

---

# 📈 Future Improvements

Potential extensions for CloudOps Sentinel include:

* GitHub/GitLab integration
* CI/CD deployment monitoring
* Kubernetes incident diagnostics
* AWS CloudWatch integration
* AWS ECS/EKS integration
* Automated incident classification
* Incident severity prediction
* PagerDuty integration
* Microsoft Teams integration
* Human approval gates before remediation
* Automated runbook execution
* Agentic remediation workflows
* Production-grade PostgreSQL LangGraph checkpointing
* Authentication with OAuth/JWT
* RBAC for SRE/Developer/Manager roles
* Advanced RAG evaluation
* LangSmith observability
* Incident analytics and MTTR dashboards

---

# 💡 Why This Project?

CloudOps Sentinel demonstrates how modern AI systems can be integrated into an actual engineering workflow rather than functioning only as a chatbot.

It combines:

```text
LLMs
 +
RAG
 +
Self-RAG
 +
LangGraph
 +
Persistent Memory
 +
Vector Search
 +
Incident Management
 +
Jira
 +
Slack
 +
PostgreSQL
 +
FastAPI
 +
Docker
 +
Cloud Deployment
```

The result is an **AI-assisted incident command center** that connects investigation, knowledge retrieval, ticketing, communication, and incident tracking in one workflow.

---

# 🧑‍💻 Skills Demonstrated

### AI / ML

* Generative AI
* LLM Applications
* RAG
* Self-RAG
* Retrieval Evaluation
* Query Rewriting
* Grounded Generation
* LLM-based Relevance Grading
* LLM-based Answer Verification
* Prompt Engineering

### Agentic AI

* LangGraph
* Conditional Agent Workflows
* Persistent Agent State
* Tool-Based Routing
* Human-in-the-Loop Architecture
* Multi-step Reasoning Workflows

### Backend

* Python
* FastAPI
* REST APIs
* Pydantic
* PostgreSQL
* SQLite

### Infrastructure / CloudOps

* Incident Management
* Runbooks
* Jira
* Slack
* Docker
* Render
* Cloud Operations
* Production Troubleshooting

### Data / Retrieval

* Pinecone
* Vector Search
* Embeddings
* Document Chunking
* Semantic Retrieval
* Tavily Search

---

# 📄 Project Documentation

Additional project documentation is available in:

```text
docs/
```

Including:

```text
architecture_diagram.png
screenshot.png
CloudOps_Sentinel_Customer_Problem_Statement.pdf
```

---

# 👨‍💻 Author

**Rakesh Kumar**

AI / ML Engineer | GenAI | Agentic AI | CloudOps

GitHub: [Add your GitHub profile]

LinkedIn: [Add your LinkedIn profile]

Portfolio: [Add your portfolio]

---

# ⭐ If You Find This Project Useful

If you find CloudOps Sentinel useful or interesting, consider giving the repository a ⭐ on GitHub.
