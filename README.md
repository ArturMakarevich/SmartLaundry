# SmartLaundry

Online reservation system for shared laundry rooms in dormitories and residential buildings.

**Stack:** Django REST Framework · React + TypeScript + Vite + Tailwind CSS · PostgreSQL · Redis · Celery

---

## Table of Contents

1. [Project structure](#1-project-structure)
2. [Quick start — macOS](#2-quick-start--macos)
3. [Quick start — Linux](#3-quick-start--linux)
4. [Quick start — Windows (Docker)](#4-quick-start--windows-docker)
5. [Environment variables](#5-environment-variables)
6. [Daily development workflow](#6-daily-development-workflow)
7. [Deploy to a server](#7-deploy-to-a-server)
8. [Console warnings explained](#8-console-warnings-explained)

---

## 1. Project structure

```
SmartLaundry/
├── backend/              Django REST API
│   ├── sl_accounts/      Auth, users, JWT
│   ├── sl_territories/   Territories, zones, machines, bookings
│   ├── sl_notifications/ Push/email notifications
│   ├── .env.example      Environment variable template
│   └── requirements.txt
├── frontend/
│   └── smartlaundry-ui/  React + Vite SPA
├── infra/
│   ├── docker-compose.yml        Dev infrastructure (Postgres + Redis)
│   ├── docker-compose.prod.yml   Full production stack
│   └── env/postgres.env
└── README.md
```

---

## 2. Quick start — macOS

### Prerequisites

- [Homebrew](https://brew.sh)
- Python 3.11+
- Node.js 20+
- Docker Desktop (for Postgres + Redis)

```bash
# Install Python and Node if needed
brew install python@3.11 node
```

### 2.1 Start Postgres + Redis

```bash
cd infra
docker compose up -d
```

### 2.2 Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser    # follow prompts
python manage.py runserver 0.0.0.0:8000
```

Open a second terminal for Celery:

```bash
cd backend
source .venv/bin/activate
celery -A sl_backend worker -l info
```

### 2.3 Frontend

```bash
cd frontend/smartlaundry-ui
npm install
npm run dev
```

Open **http://localhost:5173** in the browser.

> **Accessing from a phone on the same Wi-Fi:** open `http://<your-Mac-IP>:5173` on the phone. The backend is reachable because `runserver 0.0.0.0:8000` binds to all interfaces.

---

## 3. Quick start — Linux

Requirements: Python 3.11+, Node.js 20+, Docker + Docker Compose plugin.

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip nodejs npm
# Docker: https://docs.docker.com/engine/install/ubuntu/
```

The rest of the steps are **identical to macOS** — follow [section 2](#2-quick-start--macos) replacing `python3` with `python3.11` if needed.

---

## 4. Quick start — Windows (Docker)

On Windows the recommended approach is to run the **entire backend inside Docker** to avoid Python/venv path issues. Only the frontend runs natively.

### Prerequisites

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) — enable the WSL 2 backend during install
- [Node.js 20 LTS](https://nodejs.org/) — for the frontend only

### 4.1 Start infrastructure

Open PowerShell in the project root:

```powershell
cd infra
docker compose up -d
```

This starts Postgres (port 5432) and Redis (port 6379).

### 4.2 Configure environment

```powershell
copy backend\.env.example backend\.env
```

Open `backend\.env` and set:

```env
DATABASE_URL=postgres://smartlaundry_user:smartlaundry_secret@localhost:5432/smartlaundry_db
REDIS_URL=redis://localhost:6379/0
```

### 4.3 Run Django inside Docker (option A — recommended)

```powershell
# Migrations + dev server
docker run --rm -it --network host `
  -v "${PWD}/backend:/app" -w /app `
  --env-file backend/.env `
  python:3.11-slim `
  sh -c "pip install -r requirements.txt && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"
```

In a second PowerShell window — Celery:

```powershell
docker run --rm -it --network host `
  -v "${PWD}/backend:/app" -w /app `
  --env-file backend/.env `
  python:3.11-slim `
  sh -c "pip install -r requirements.txt && celery -A sl_backend worker -l info"
```

### 4.4 Run Django natively (option B)

If you prefer a local Python installation:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Celery in a second terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
celery -A sl_backend worker -l info
```

### 4.5 Frontend (native)

```powershell
cd frontend\smartlaundry-ui
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## 5. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in the values.

| Variable | Default (dev) | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | `dev-secret` | Long random string — **change in prod** |
| `DJANGO_DEBUG` | `True` | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | `*` (when DEBUG) | Comma-separated domains |
| `DATABASE_URL` | SQLite | `postgres://user:pass@host:port/db` |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `EMAIL_BACKEND` | console (prints to terminal) | SMTP class for production |
| `EMAIL_HOST` | — | e.g. `smtp.gmail.com` |
| `EMAIL_PORT` | `587` | |
| `EMAIL_HOST_USER` | — | Sender email address |
| `EMAIL_HOST_PASSWORD` | — | App password |

> **Dev note:** Without `DATABASE_URL` set, Django uses SQLite (`backend/db.sqlite3`). No Postgres needed for local development.

---

## 6. Daily development workflow

```bash
# 1. Start infrastructure
cd infra && docker compose up -d

# 2. Backend (new terminal)
cd backend
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
python manage.py runserver 0.0.0.0:8000

# 3. Celery (new terminal)
cd backend
source .venv/bin/activate
celery -A sl_backend worker -l info

# 4. Frontend (new terminal)
cd frontend/smartlaundry-ui
npm run dev

# Stop everything — Ctrl+C in each terminal, then:
cd infra && docker compose down
```

### Email codes in development

Verification and password-reset codes are **printed to the Django terminal** by default (console email backend). No SMTP server is needed for local development.

---

## 7. Deploy to a server

### Server requirements

- Ubuntu 22.04+ (or any Linux)
- Docker Engine + Docker Compose plugin
- Ports 80 and 443 open in the firewall

### 7.1 Clone and configure

```bash
git clone https://github.com/your-org/smartlaundry.git
cd smartlaundry

cp backend/.env.example backend/.env
nano backend/.env
```

Minimum required changes in `.env`:

```env
# Generate a key: python3 -c "import secrets; print(secrets.token_hex(50))"
DJANGO_SECRET_KEY=your-very-long-random-string

DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=postgres://smartlaundry_user:strongpassword@db:5432/smartlaundry_db
REDIS_URL=redis://redis:6379/0
FRONTEND_ORIGIN=https://yourdomain.com

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

Set the same DB password in `infra/env/postgres.env`:

```env
POSTGRES_PASSWORD=strongpassword
```

### 7.2 Build and start

```bash
cd infra
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations and `collectstatic` run automatically on first start.

### 7.3 Create superuser

```bash
docker exec -it sl_backend python manage.py createsuperuser
```

### 7.4 Verify

| URL | What you see |
|---|---|
| `http://yourdomain.com` | Frontend SPA |
| `http://yourdomain.com/api/` | Django REST API |
| `http://yourdomain.com/admin/` | Django admin |

### 7.5 Updates

```bash
git pull
cd infra
docker compose -f docker-compose.prod.yml up -d --build
```

### 7.6 HTTPS with Let's Encrypt (recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# In docker-compose.prod.yml change the frontend ports line to:
#   ports: ["127.0.0.1:8080:80"]
# so only the host Nginx forwards to it.
# Then point your host Nginx to localhost:8080 and run:

sudo certbot --nginx -d yourdomain.com
```

### 7.7 Useful production commands

```bash
# Follow logs
docker compose -f infra/docker-compose.prod.yml logs -f backend

# Django management shell
docker exec -it sl_backend python manage.py shell

# Database backup
docker exec sl_postgres pg_dump -U smartlaundry_user smartlaundry_db > backup_$(date +%F).sql

# Restore backup
cat backup_2025-01-01.sql | docker exec -i sl_postgres psql -U smartlaundry_user smartlaundry_db

# Stop everything
docker compose -f infra/docker-compose.prod.yml down
```

---

## 8. Console warnings explained

### `Unknown at rule @tailwind` — VS Code

This is a VS Code CSS linter warning — the editor does not natively understand Tailwind directives. It is **not an error** and does not affect the build. Already suppressed in `.vscode/settings.json` included in this repo. For full Tailwind autocomplete install the **Tailwind CSS IntelliSense** extension (`bradlc.vscode-tailwindcss`).

### `Unchecked runtime.lastError: Could not establish connection` — browser

These messages come from **browser extensions** (password managers, ad blockers, etc.) attempting to inject content scripts into the page. They are **not produced by SmartLaundry code** and do not affect functionality. To confirm, open the app in a clean browser profile with all extensions disabled.
