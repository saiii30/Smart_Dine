# Smart Dine — Restaurant management (full stack)

Smart Dine replaces the legacy travel demo in this folder with a **restaurant POS / operations** stack:

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios, Recharts, `@dnd-kit` (table layout), `react-hot-toast`, QR display for tables.
- **Backend:** FastAPI, SQLAlchemy 2, Pydantic v2, JWT (python-jose + passlib), PostgreSQL (or SQLite for quick demos), WebSocket hub for live orders, ReportLab PDF invoices.

## Prerequisites

- Node.js 20+ and npm  
- Python 3.11+  
- **PostgreSQL** (recommended) — use a **new empty database** (do not reuse an old smart Dine database; table names like `users` will conflict).

## Backend setup

```bash
cd TMS/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set at least:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/smartdine` |
| `SECRET_KEY` | long random string |
| `CORS_ORIGINS` | `http://localhost:5173` |
| `FRONTEND_PUBLIC_URL` | `http://localhost:5173` (used in table QR links) |

Optional: omit `DATABASE_URL` to fall back to **SQLite** at `backend/smartdine.db` (see `app/database.py`).

Initialize tables (SQLAlchemy `create_all` runs on startup; you can also run):

```bash
python init_db.py
```

Seed demo data (admin user, branch, categories, menu, tables, inventory):

```bash
python scripts/seed_smart_dine.py
```

Default admin after seed: **`admin@smartdine.local`** / **`Admin@12345`**

Run API:

```bash
python run.py
# → http://127.0.0.1:8000  (docs at /docs)
```

Reference DDL for PostgreSQL: `backend/sql/schema.sql`.

## Frontend setup

```bash
cd TMS/frontend
npm install
```

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://127.0.0.1:8000
```

```bash
npm run dev
# → http://localhost:5173
```

## Roles

`ADMIN`, `MANAGER`, `WAITER`, `KITCHEN`, `CASHIER` — enforced on sensitive routes (kitchen, billing, team, etc.).

## Customer QR flow

Each floor table has a `qr_token`. Staff see a full guest URL on **Tables** (uses `FRONTEND_PUBLIC_URL`). Guests open:

`/customer/{qr_token}`

…to browse the public menu and place an order without staff login.

## WebSockets

Browser connects to `ws://<host>:8000/ws/orders` (swap `ws` / `wss` to match your API URL). Order create/update broadcasts JSON `{ "event": "...", "order_id": N }`.

## Extra / stub features

- **Insights:** `/api/insights/recommendations` and `/api/insights/sales-prediction` — lightweight heuristics (replace with real ML later).
- **PWA:** `public/manifest.webmanifest` — add a service worker when you need true offline capture.
- **Email/SMS:** not wired; add providers behind background tasks.

## Legacy TMS files removed

Travel-specific routers, trip/vehicle UI, GPS docs, and related assets were removed. If you still have an old PostgreSQL database, **create a new DB** for Smart Dine or drop conflicting tables before running the API.
