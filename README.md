# SmartLaundry skeleton

This repository contains a minimal backend (Django REST + PostgreSQL + Redis + Celery) and frontend (React + TypeScript + Vite + Tailwind) for the SmartLaundry project.

## Prerequisites

- Windows 11
- Docker Desktop
- Python 3.11+
- Node.js 18+ and npm

## 1. Start infrastructure (PostgreSQL + Redis)

In VS Code terminal:

```bash
cd infra
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

To stop:

```bash
cd infra
docker compose down
```

## 2. Backend: Django REST API

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

Run migrations and create superuser:

```bash
cd ..\infra
docker compose up -d
cd ..\backend
python manage.py migrate
python manage.py createsuperuser
```

Run Django development server:

```bash
python manage.py runserver
```

Start Celery worker in a second terminal:

```bash
cd backend
.\.venv\Scripts\activate
celery -A sl_backend worker -l info
```

By default, emails with verification and reset codes are printed in the Django console using the console email backend. This makes development free and easy to configure. You can later change the email backend in `.env`.

## 3. Frontend: React + Vite

In another terminal:

```bash
cd frontend/smartlaundry-ui
npm install
npm run dev
```

Open http://localhost:5173 in the browser.

## 4. First login / registration flow

- On the landing page click the authentication button.
- Register with email and password.
- A verification code is printed in the Django console.
- Enter the code in the verification form.
- On success, JWT tokens are stored in localStorage.

## 5. Next runs

Each time you want to run the project again:

1. Start Docker services:

   ```bash
   cd infra
   docker compose up -d
   ```

2. Backend:

   ```bash
   cd backend
   .\.venv\Scripts\activate
   python manage.py runserver
   ```

3. Celery:

   ```bash
   cd backend
   .\.venv\Scripts\activate
   celery -A sl_backend worker -l info
   ```

4. Frontend:

   ```bash
   cd frontend/smartlaundry-ui
   npm run dev
   ```

To stop everything: stop `runserver`, Celery and `npm run dev` with `Ctrl + C`, then

```bash
cd infra
docker compose down
```
