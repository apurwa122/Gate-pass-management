# GatePass

A small, full-stack visitor gate-pass application. Requesters submit visits, approvers review them, and security staff validate a QR reference before recording entry and exit. It is designed as an interview-friendly example of a relational workflow and a REST API.

## Features

- Four roles: requester, approver, security, and administrator.
- Password hashing and signed, expiring login tokens.
- Visitor and pass records stored in SQLite with foreign keys.
- Approve/reject decisions saved as an audit history.
- Random QR references generated only after approval; QR images are generated on demand.
- Server-side QR validation, visit-date expiry checks, and duplicate-entry protection.
- Entry/exit records, role-aware dashboard totals, searchable visitor and pass lists.
- Responsive React screens with useful empty and error states.

## Architecture

```text
┌────────────────────┐    REST / JSON     ┌──────────────────────┐
│ React + Vite       │ ─────────────────> │ Express API          │
│ Browser UI         │ <───────────────── │ JWT + role checks    │
└────────────────────┘                    └──────────┬───────────┘
                                                     │ SQL queries
                                          ┌──────────▼───────────┐
                                          │ SQLite                │
                                          │ users, visitors,      │
                                          │ passes, approvals,    │
                                          │ entry/exit records    │
                                          └──────────────────────┘
```

## Technology

- Frontend: React, JavaScript, HTML, CSS, Vite
- Backend: Node.js, Express, REST/JSON
- Database: SQLite (SQL relational database), `better-sqlite3`
- Authentication: bcrypt password hashes and JWT bearer tokens
- QR: `qrcode` generation and `html5-qrcode` browser camera scanning

## Project structure

```text
backend/
  src/
    database/       schema.sql, db.js, seed.js
    middleware/     authentication and role checks
    routes/         REST endpoints and workflow operations
    server.js
frontend/
  src/
    components/     Shared form, status, modal, and feedback components
    context/        Login state and authentication actions
    hooks/          Shared data loading hook
    pages/          Login, dashboard, passes, security, and admin screens
    services/       REST client
    utils/          Role labels and date formatting
    App.jsx         Routes and workspace layout
    main.jsx        React application entry point
    styles.css
  index.html
```

Run `npm run format` to apply the project's Prettier style, or `npm run format:check` to check it.

## Database schema

`backend/src/database/schema.sql` creates these tables and indexes:

- `users`: identity, unique email, bcrypt password hash, and constrained role.
- `visitors`: visitor contact and organization details.
- `gate_passes`: visitor, requester, purpose, date, constrained status, and unique QR reference.
- `approvals`: one decision event per review, including approver, remarks, and time.
- `entry_exit_records`: each entry, its optional exit, and the security user who verified entry.

Foreign keys enforce the links between records. Schema creation runs automatically on API start. The database file defaults to `backend/data/gatepass.sqlite` and should not be committed.

## Requirements

- Node.js 20 or newer and npm.
- No separate database server is required; SQLite is a local SQL database file.

## Setup

From the project root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

Create `backend/.env` from `backend/.env.example`. Change `JWT_SECRET` to a long random value before exposing the app beyond a local demo. Optional: create `frontend/.env` from `frontend/.env.example` if the API is not at `http://localhost:5000/api`.

Start backend and frontend together:

```bash
npm run dev
```

Or run them in separate terminals:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

Open the Vite URL printed in the frontend terminal (normally `http://localhost:5173`). The API health check is `http://localhost:5000/api/health`. On first backend start, the schema and demo accounts/sample records are initialized automatically. To use a different database location, set `DATABASE_PATH` in `backend/.env`.

## Demo credentials

All demo users use password `GatePass123!`:

| Role          | Email                      |
| ------------- | -------------------------- |
| Requester     | `requester@gatepass.local` |
| Approver      | `approver@gatepass.local`  |
| Security      | `security@gatepass.local`  |
| Administrator | `admin@gatepass.local`     |

## API

All paths are prefixed with `/api`. Login is public; other routes require `Authorization: Bearer <token>`. Role access is checked by the API.

| Method    | Path                     | Roles                                               | Purpose                                                   |
| --------- | ------------------------ | --------------------------------------------------- | --------------------------------------------------------- |
| POST      | `/auth/login`            | Public                                              | Authenticate and return a token                           |
| GET       | `/dashboard/stats`       | Authenticated                                       | Counts for passes and gate activity                       |
| GET, POST | `/passes`                | Requester/Admin (list is role-filtered)             | List and create requests                                  |
| GET, PUT  | `/passes/:id`            | Authenticated (GET scoped); Requester/Admin (PUT)   | Read a pass; edit visitor and visit details while pending |
| GET       | `/approvals/pending`     | Approver/Admin                                      | Pending requests                                          |
| GET       | `/approvals`             | Approver/Admin                                      | Approval history                                          |
| POST      | `/approvals/:id/approve` | Approver/Admin                                      | Approve and issue QR reference                            |
| POST      | `/approvals/:id/reject`  | Approver/Admin                                      | Reject without issuing a QR reference                     |
| GET, POST | `/visitors`              | GET: Approver/Security/Admin; POST: Requester/Admin | Searchable directory data and add visitor                 |
| GET       | `/visitors/:id`          | Approver/Security/Admin                             | Visitor details and pass history                          |
| PUT       | `/visitors/:id`          | Admin                                               | Update visitor details                                    |
| POST      | `/qr/generate`           | Requester/Admin                                     | Create QR image for an owned approved pass                |
| POST      | `/qr/validate`           | Security/Admin                                      | Validate QR reference and visit date                      |
| POST      | `/entry`, `/exit`        | Security/Admin                                      | Record a verified entry or active visitor's exit          |
| GET       | `/entry-exit`            | Security/Admin                                      | Entry/exit history and active visitors                    |
| GET       | `/users`                 | Admin                                               | List users without password hashes                        |
| POST      | `/users`                 | Admin                                               | Create a user with a role and password                    |
| PUT       | `/users/:id`             | Admin                                               | Update a user's name, email, role, and optional password  |

Create request JSON: `{ "name", "phone", "email?", "organization?", "purpose", "visitDate": "YYYY-MM-DD" }`. QR validation, entry, and exit JSON: `{ "reference": "..." }`. Approval JSON: `{ "remarks": "..." }` (optional).

## Example workflow

1. Sign in as `requester@gatepass.local` and submit a visit request.
2. Sign out, then sign in as `approver@gatepass.local`; approve or reject it. Approval creates a random reference, while rejection creates no reference.
3. Sign back in as requester and open the QR pass for an approved visit.
4. Sign in as `security@gatepass.local`; scan the QR with a camera or paste its reference, verify, and record entry.
5. Switch to exit mode and enter the same reference to record departure. Entry/exit history shows both timestamps.
6. The admin dashboard summarizes workflow counts. Demo sample rows are also available on a new database.

## Manual test checklist

- Sign in with each role; a different role cannot access another role's screens, and API routes enforce the same checks.
- Submit a complete visit; omit required fields and confirm a clear validation error.
- Approve a pending request and verify it receives a QR; reject another and verify no QR is available.
- Validate an unknown reference; confirm it is rejected. Validate a prior-date approved reference and confirm it becomes expired.
- Record entry for a valid approved pass; try the same pass again and confirm it is blocked while inside/used.
- Record exit and confirm timestamps in entry/exit history.
- Compare dashboard counts with the current pass and entry/exit records.
- On a phone or camera-enabled browser, allow camera access and scan the displayed QR.

## Assumptions and limitations

- A pass is valid on its visit date, according to the server's local date. It does not have a time-of-day window.
- One pass represents one visitor and one entry. After exit it remains `Used`, so a second entry is not allowed.
- Login tokens are kept in browser local storage for this learning demo; there is no refresh-token flow or password-reset screen.
- The seed accounts are for local demonstration. Replace them and the secret before any public deployment.
- SQLite is appropriate for a single-instance portfolio app; a multi-instance deployment would need a hosted relational database and operational controls.
- Camera scanning requires a secure browser context (localhost or HTTPS) and camera permission. Reference entry is available as a fallback.

## Future improvements

- Add pass time windows, visitor email notifications, and QR revocation.
- Add user administration forms and pagination for larger directories.
- Add automated API tests and a deployment guide for a SQL server.
