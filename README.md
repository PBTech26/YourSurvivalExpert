# yoursurvivalexpert.ai MVP

Single-page React app with a lightweight FastAPI backend. The experience is content-first with an embedded AI survival expert that gathers context, captures email, and sends a personalized PDF guide.

## What is included

- React landing page with SEO-friendly copy and a chat-first flow
- FastAPI for chat, guide generation, PDF creation, and email delivery
- OpenAI and Resend integrations with safe fallbacks

## Local setup

1. Install frontend dependencies:

	npm --prefix frontend install

2. Install backend dependencies:

	.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

3. Copy backend environment file and fill keys:

	Copy backend/.env.example to backend/.env

4. Run the backend:

	npm --prefix frontend run dev:server

5. Run the frontend:

	npm --prefix frontend run dev

The frontend runs on the Vite dev server and proxies API requests to port 5050.

### Quick local run (Windows)

There is a helper script `run-dev.ps1` at the repository root that automates setup and starts both servers in separate PowerShell windows.

Usage:
```powershell
.\run-dev.ps1
```

## Deployment notes

- Run the backend with npm --prefix frontend run start:server
- Build the frontend with npm --prefix frontend run build and serve the frontend/dist folder with a static server or reverse proxy
- Set production environment variables for OpenAI and Resend
