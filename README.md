# Clinic Appointment Booking System

A full-stack clinic appointment management application where patients can book and manage doctor appointments, while reception staff can manage the clinic schedule, view doctor-specific weekly calendars, and review appointment reports.

Built as an engineering assignment using React, TypeScript, Node.js, Express, and PostgreSQL.

---

## Features

### Patient
- **Doctor Directory & Profiles:** View all active doctors with specialties, professional fictional portraits, and demonstration ratings.
- **Search & Specialty Navigation:** Filter doctors by specialty using horizontal navigation tabs (All Doctors, Cardiology, Dermatology, General Medicine, Pediatrics) and instant name search.
- **Appointment Booking:** Book consultation slots with active doctors across allowed durations of 15, 30, 45, or 60 minutes.
- **Dual View Formats:** View personal appointments in a chronological **List View** with pagination or an interactive **Week View** schedule grid.
- **Past Appointment Filtering:** The appointment list automatically filters past dates/times so only upcoming consultations are presented.
- **Cancellation:** Cancel personal bookings at any time with inline confirmation and instantaneous schedule release.
- **Timezone Uniformity:** View all appointment dates, clinic slots, and times in Indian Standard Time (IST).
- **AI Clinic Assistant:** Dedicated floating chatbot in the bottom-right corner answering patient questions regarding clinic hours, doctors, specialties, durations, and booking/cancellation procedures (available exclusively in the patient view).

### Reception Staff
- **Clinic-Wide Schedule:** View all clinic appointments across all patients, ordered chronologically.
- **Doctor-Specific Weekly Calendar:** View a Monday–Sunday visual calendar grid (9:00 AM – 9:00 PM IST) for any selected doctor, with visual duration blocks (15, 30, 45, 60 minutes) and appointment detail modals.
- **Doctor Management:** Deactivate active doctors to temporarily stop new bookings, or reactivate inactive doctors when they resume availability.
- **Appointment Cancellation:** Cancel any clinic appointment directly from the appointment list or weekly calendar modal with immediate UI feedback.
- **Historical Data Access:** Filter and inspect inactive doctors and their historical appointments without losing past records.
- **Date-Range Reports:** Generate aggregate appointment reports for any custom date range, showing booked and cancelled consultation counts per doctor (including doctors with zero appointments).

### Additional Capabilities
- **AI-Powered Clinic Assistant:** Floating chatbot powered by Google Gemini API answering clinic FAQs (hours, doctors, specialties, durations, booking rules) with safety guardrails against medical diagnosis or prescription queries.
- **Concurrency & Overlap Protection:** Strict server-side half-open time interval checks and PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) prevent double bookings.
- **Authorization & Validation:** Server-side role checks enforce that only patients can book and only reception can deactivate doctors or view clinic-wide reports.
- **Modern Responsive Design:** Dark theme with sage green accents (`#6e8c76`), Framer-style wave buttons, accessible typography (Inter), and clear loading, empty, and error states.

> *Note: Doctor portraits and ratings are demonstration content, not real patient reviews or verified ratings.*

---

## Tech Stack

| Layer | Technologies | Details |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | Single-Page Application with custom hooks and UserContext |
| **Backend** | Node.js (v22), Express 5, TypeScript | Layered REST API (routes, controllers, services, middleware) |
| **Database** | PostgreSQL, `pg` (node-postgres) | Relational schema, transactions, row-level locks, composite indexes |
| **AI Assistant** | Google Gemini API (`gemini-flash-lite-latest`) | Backend REST integration with safety guardrails & 503 fallback |
| **Testing** | Vitest, Supertest | 64 automated backend unit and integration test cases |
| **Styling** | Vanilla CSS | Global design system (`index.css`), dark theme (`#121316`, `#1a1c20`), sage green accents, responsive layout |
| **Date & Time** | UTC storage (`TIMESTAMPTZ`), IST display | Strict `Asia/Kolkata` (+05:30) clinic boundary calculations |

---

## Architecture

The project maintains a decoupled frontend/backend structure with the Express API at the root and the React single-page application under `frontend/`.

```text
Ayrin_ClinicAppointmentBooking/
│
├── src/                          # Express Backend TypeScript Source
│   ├── config/                   # Chatbot knowledge base and system prompts
│   ├── controllers/              # HTTP request handlers (doctors, appointments, reports, chatbot)
│   ├── db/                       # PostgreSQL client pool, migrations, and seed scripts
│   │   ├── migrations/           # 001_initial_schema.sql (tables, constraints, indexes)
│   │   ├── migrate.ts            # Migration runner
│   │   ├── seed.ts               # Repeatable demo seed runner
│   │   └── index.ts              # pg Pool configuration
│   ├── middleware/               # Auth (X-User-Id), role enforcement, and central error handler
│   ├── routes/                   # Route definitions (health, doctors, appointments, reports, chatbot)
│   ├── services/                 # Business logic, concurrency locks, Gemini API client
│   ├── types/                    # Shared backend TypeScript interfaces and DTOs
│   ├── app.ts                    # Express application setup, CORS, and middleware pipeline
│   └── server.ts                 # Server entry point
│
├── tests/                        # Vitest automated test suite (64 test cases)
│   ├── appointments.test.ts      # Booking, pagination, ownership, cancellation tests
│   ├── auth.test.ts              # X-User-Id validation and role enforcement tests
│   ├── chatbot.test.ts           # FAQ answering, medical guardrails, missing key, 502/503 tests
│   ├── concurrency.test.ts       # Parallel booking requests & transaction locking tests
│   ├── doctors.test.ts           # Doctor listing, deactivation, and reactivation tests
│   ├── reports.test.ts           # Date-range aggregation report tests
│   └── helpers/                  # Test helpers (mock database pool client)
│       └── mock-db.ts
│
├── frontend/                     # React 19 + TypeScript + Vite Single-Page Application
│   ├── public/
│   │   └── images/doctors/       # Doctor profile portrait image assets
│   ├── src/
│   │   ├── components/           # UI components (Header, DoctorList, BookingForm,
│   │   │                         # AppointmentsList, WeeklyCalendarView, AppointmentDetailModal,
│   │   │                         # SpecialtyTabs, UserSelector, ClinicAssistant)
│   │   ├── context/              # UserContext (demo caller switcher)
│   │   ├── hooks/                # Custom React hooks (useHealthCheck)
│   │   ├── pages/                # HomePage layout
│   │   ├── services/             # Frontend API client modules (api, doctor, appointment, chatbot)
│   │   ├── types/                # Frontend TypeScript models
│   │   ├── utils/                # IST date formatting, calendar calculations, doctor demo metadata
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             # Dark theme styling, calendar grids, chat widget styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .env.example                  # Environment configuration template
├── package.json                  # Backend dependencies, scripts, and Vitest configuration
├── tsconfig.json                 # Backend TypeScript configuration
├── DECISIONS.md                  # Engineering and product decisions document
├── PREVIOUS_WORK.md              # Previous project and personal contribution document
├── AI_USAGE.md                   # AI tools and usage disclosure document
└── README.md
```

- **Backend:** Routes validate HTTP inputs, controllers invoke domain services, and services interact with PostgreSQL using transactions and locking.
- **Frontend:** Pure React components communicate with the backend exclusively via typed API service modules (`frontend/src/services/`).

---

## Project Documentation

The following project documents are maintained at the repository root:

- [DECISIONS.md](DECISIONS.md) — Engineering decisions.
- [PREVIOUS_WORK.md](PREVIOUS_WORK.md) — Previous project and personal contribution.
- [AI_USAGE.md](AI_USAGE.md) — AI tools and usage disclosure.

> *Note: DECISIONS.md, PREVIOUS_WORK.md, and AI_USAGE.md document technical trade-offs, prior project contributions, and AI tool usage.*

---

## Database Design

PostgreSQL enforces relational consistency, entity constraints, and temporal intervals.

```
  ┌──────────────────┐               ┌──────────────────┐
  │      users       │               │     doctors      │
  ├──────────────────┤               ├──────────────────┤
  │ id (PK)          │               │ id (PK)          │
  │ name             │               │ name             │
  │ email (UNIQUE)   │               │ specialization   │
  │ role             │               │ is_active        │
  │ created_at       │               │ created_at       │
  └────────┬─────────┘               └────────┬─────────┘
           │ 1                                │ 1
           │                                  │
           │ N                                │ N
         ┌─┴──────────────────────────────────┴─┐
         │             appointments             │
         ├──────────────────────────────────────┤
         │ id (PK)                              │
         │ doctor_id (FK -> doctors.id)         │
         │ patient_id (FK -> users.id)          │
         │ start_time (TIMESTAMPTZ)             │
         │ duration_minutes (15, 30, 45, 60)    │
         │ status ('BOOKED', 'CANCELLED')       │
         │ created_at (TIMESTAMPTZ)             │
         │ updated_at (TIMESTAMPTZ)             │
         └──────────────────────────────────────┘
```

### Constraints & Indexes
- `duration_minutes` must be one of `15, 30, 45, 60`.
- `status` must be either `'BOOKED'` or `'CANCELLED'`.
- Foreign key constraints maintain referential integrity with `ON DELETE RESTRICT`.
- **Composite Index `idx_appointments_doctor_status_start`:** Optimizes doctor schedule range queries (`doctor_id, status, start_time`).
- **Composite Index `idx_appointments_patient_start`:** Optimizes patient appointment history ordering (`patient_id, start_time DESC, id DESC`).

---

## Appointment Business Rules

1. **Clinic Operating Hours:** All appointments must start at or after 9:00 AM IST and conclude at or before 9:00 PM IST on the same calendar day. Slots extending past 9:00 PM are rejected.
2. **Allowed Durations:** Strictly 15, 30, 45, or 60 minutes.
3. **Active Doctors Only:** Only doctors with `is_active = TRUE` can receive new bookings. Inactive doctors can be viewed for historical reference.
4. **No Past Bookings:** Appointments cannot be booked for past dates or times based on the database wall-clock (`clock_timestamp()`).
5. **No Overlapping Bookings:** Two active (`BOOKED`) appointments for the same doctor cannot overlap in time.
6. **Back-to-Back Allowed:** Half-open interval checking `[start, end)` allows a new appointment to start at the exact minute a prior appointment finishes.
7. **Cancelled Slots Released:** Cancelled appointments (`status = 'CANCELLED'`) do not block slots from being booked by others.
8. **Patient Ownership:** Patients can view and cancel only their own appointments.
9. **Reception Administration:** Reception staff can view appointments clinic-wide, cancel any appointment, activate/deactivate doctors, and generate reports.

### Concurrency Protection & Overlap Prevention

To prevent race conditions where two simultaneous requests attempt to book the same slot:
1. The backend begins an explicit database transaction (`BEGIN`).
2. It acquires a row-level lock on the target doctor using `SELECT ... WHERE id = $1 FOR UPDATE`.
3. Any concurrent request for the same doctor queues until the lock is released.
4. The service performs a half-open interval overlap check against existing `BOOKED` appointments:
   ```sql
   SELECT id FROM appointments
   WHERE doctor_id = $1
     AND status = 'BOOKED'
     AND start_time < ($2::timestamptz + ($3 * INTERVAL '1 minute'))
     AND (start_time + (duration_minutes * INTERVAL '1 minute')) > $2::timestamptz
   FOR UPDATE;
   ```
5. If an overlap is found, a `409 SLOT_CONFLICT` is returned.
6. Otherwise, the booking is inserted and committed (`COMMIT`).

---

## Timezone Handling

- **Database Storage:** Stored as UTC using PostgreSQL `TIMESTAMPTZ`.
- **User Interface:** All inputs and displays are converted to and presented in Indian Standard Time (`Asia/Kolkata`, UTC+05:30).
- **Calendar & Reports:** Date calculations, week boundaries (Monday 00:00:00 IST to Sunday 23:59:59 IST), and clinic operating hours are calculated in IST before querying UTC timestamps.

---

## Authentication & Authorization

Authentication uses a demonstration identity mechanism via the `X-User-Id` HTTP header:
- The header value maps directly to a seeded user in the `users` table.
- A frontend selector allows seamless switching between demo patients and reception staff.
- The backend authentication middleware (`src/middleware/auth.ts`) validates the user ID against the database, attaches `req.user`, and enforces role checks (`requireRole('RECEPTION')` or `requireRole('PATIENT')`).
- Unauthorized requests receive `401 UNAUTHORIZED` or `403 FORBIDDEN`.

---

## API Overview

All API endpoints are prefixed on the root domain (`http://localhost:3000`).

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Service health and timestamp check |
| `GET` | `/doctors` | Authenticated | List doctors (patients receive active; reception can pass `includeInactive=true`) |
| `PATCH` | `/doctors/:id/deactivate` | Reception only | Mark a doctor as inactive |
| `PATCH` | `/doctors/:id/activate` | Reception only | Reactivate an inactive doctor |
| `POST` | `/appointments` | Patient only | Book a consultation slot |
| `GET` | `/appointments` | Authenticated | List appointments (filtered by patient or clinic-wide, with pagination and `startDate`/`endDate`/`doctorId` filters) |
| `PATCH` | `/appointments/:id/cancel` | Authenticated | Cancel a booked appointment (patients own, reception clinic-wide) |
| `GET` | `/reports/appointments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Reception only | Appointment count report per doctor for a date range in `YYYY-MM-DD` format |
| `POST` | `/chatbot/message` | Public / All | Ask the AI Clinic Assistant a question (`{ "message": "string" }`) |

### Standard Request & Error Response Formats

#### Chatbot Message Request (`POST /chatbot/message`)
```json
{
  "message": "What are the clinic opening hours?"
}
```

#### Chatbot Success Response (`200 OK`)
```json
{
  "reply": "Ayrin Clinic is open daily from 9:00 AM to 9:00 PM IST (Indian Standard Time), Monday through Sunday.",
  "timestamp": "2026-11-15T02:25:00.000Z"
}
```

#### Standard Error Response Format
```json
{
  "error": {
    "code": "SLOT_CONFLICT",
    "message": "Doctor Dr. Rajesh Kothari already has a booked appointment during this time window."
  }
}
```

---

## AI Clinic Assistant

The application features a floating AI chatbot built with the Google Gemini API, available exclusively in the **Patient** view:
- **Patient-Only Access:** The floating chatbot button and dialog appear solely in the patient interface; the assistant is excluded from the reception view to keep administrative workflows clean and focused.
- **Scope:** Answers FAQs about Ayrin Clinic operating hours, medical specialties, doctor directory, appointment durations, booking policies, and cancellation policies.
- **Controlled Knowledge Base:** Grounded in a dedicated knowledge base (`src/config/chatbot-knowledge.ts`).
- **Safety Guardrails:** Medical advice, symptom assessments, diagnosis, or prescription queries are immediately intercepted and refused with advice to consult a qualified healthcare professional.
- **Model Configured in Source:** Uses Google Gemini API (`models/gemini-flash-lite-latest`) configured in `src/services/chatbot.service.ts` with system instructions, low temperature (0.2), and a 10-second timeout.
- **Live Integration Status:** Successfully verified live end-to-end against the Gemini API returning 200 OK responses when a valid `GEMINI_API_KEY` is present.
- **Privacy & Isolation:** The chatbot does not have access to patient records, database tables, or appointment history. Chat messages exist only in client session memory.
- **Graceful Degradation:** If `GEMINI_API_KEY` is not configured, the assistant returns a clear 503 response without impacting core appointment booking functionality.

---

## Getting Started

### Prerequisites
- **Node.js:** v18 or later (v22 recommended)
- **npm:** v9 or later
- **PostgreSQL:** Running instance on port 5432
- **Google Gemini API Key:** (Optional, required only for live AI assistant responses)

---

### Step 1: Clone the Repository & Configure Environment

```bash
git clone https://github.com/aleenafvg/Ayrin_ClinicAppointmentBooking.git
cd Ayrin_ClinicAppointmentBooking
```

Create `.env` from the provided template:

For macOS / Linux (bash/zsh):
```bash
cp .env.example .env
```

For Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

Edit `.env` with your PostgreSQL database credentials and optional Gemini API key:

```env
PORT=3000
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=clinic_appointments
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password

# Optional: AI Clinic Assistant
GEMINI_API_KEY=your_gemini_api_key_here
```

---

### Step 2: Install Dependencies

Install root backend dependencies:
```bash
npm install
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

---

### Step 3: Set Up Database, Migrations & Seed Data

In PostgreSQL, create the application database:
```sql
CREATE DATABASE clinic_appointments;
```

Run database migrations to create tables and indexes:
```bash
npm run db:migrate
```

Seed repeatable demonstration users, doctors, and sample appointments:
```bash
npm run db:seed
```

---

### Step 4: Start the Application Servers

Start both servers in separate terminal windows:

#### Terminal 1 — Backend API Server (Port 3000)
```bash
npm run dev
```
*Alternatively, build and run in production mode:*
```bash
npm run build
npm start
```
*The backend server will run at: `http://localhost:3000`*

#### Terminal 2 — Frontend Client (Port 5173)
```bash
cd frontend
npm run dev
```
*The React application will run at: `http://localhost:5173`*

Open **`http://localhost:5173`** in your browser.

---

## Testing

The project includes an automated Vitest test suite with 64 test cases covering backend controllers, services, database constraints, concurrency, and security.

### Run All Backend Tests
```bash
npm test
```

### Run TypeScript Typechecks
```bash
# Backend typecheck
npm run typecheck

# Frontend typecheck
cd frontend && npm run typecheck && cd ..
```

### Run Frontend Production Build
```bash
cd frontend
npm run build
```

---

## Demo Users

The seed script initializes the following demonstration users, selectable via the top-right header dropdown in the frontend:

| ID | Name | Role | Email | Use Case |
|---|---|---|---|---|
| `1` | Aarav Sharma | Patient | `aarav.sharma@clinic.test` | Primary demo patient |
| `2` | Priya Patel | Patient | `priya.patel@clinic.test` | Secondary demo patient |
| `3` | Rohan Gupta | Patient | `rohan.gupta@clinic.test` | Patient booking & viewing |
| `4` | Ananya Iyer | Patient | `ananya.iyer@clinic.test` | Patient booking & viewing |
| `5` | Deepak Verma | Reception | `deepak.verma@clinic.test` | Reception schedule & reports |
| `6` | Sunita Rao | Reception | `sunita.rao@clinic.test` | Reception schedule & reports |

### Seeded Doctors

| ID | Doctor | Specialty | Status |
|---|---|---|---|
| `1` | Dr. Rajesh Kothari | General Medicine | Active |
| `2` | Dr. Meera Nambiar | Pediatrics | Active |
| `3` | Dr. Vikram Sethi | Cardiology | Active |
| `4` | Dr. Sneha Desai | Dermatology | Inactive (demonstrates reactivation) |

---

## Limitations & Production Considerations

- **Identity Mechanism:** The `X-User-Id` header is a demonstration mechanism designed for take-home evaluation. Production deployment would implement secure JWT/session-based authentication, OAuth2, and password hashing.
- **Rate Limiting:** Production deployments should implement IP-based rate limiting on `/appointments` and `/chatbot/message`.
- **Demo Content:** Doctor profile portraits and numerical ratings are fictional demonstration content.

---

## Not Implemented

- **CI workflow:** Automated test execution through a CI pipeline was not added.
- **Docker Compose:** Database startup through Docker Compose was not included.


