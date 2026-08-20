# TypeScript Full-Stack App

A full-stack web application with a React frontend and an Express API. The backend uses PostgreSQL for persistence and provides authentication with JWT cookies.

## Technology Stack

| Area | Main technologies |
| --- | --- |
| Frontend | TypeScript, React 19, Vite, Tailwind CSS, React Router, Axios, React Hook Form |
| Backend | TypeScript, Node.js, Express 5, PostgreSQL, Prisma ORM, Redis, BullMQ, Pino, Zod, JWT, bcrypt |
| Backend testing | Vitest and Supertest |

## Prerequisites

- Node.js 22.12 or newer
- npm
- A PostgreSQL database, such as Neon
- Docker for the local Redis service

## Setup

Install the dependencies for both applications:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create `backend/.env`:

```env
PORT=3000
FRONTEND_API="http://localhost:5173"
DATABASE_URL="YOUR_POSTGRESQL_CONNECTION_STRING"
BCRYPT_SALT_ROUNDS=12
JWT_SECRET="REPLACE_WITH_A_SECURE_SECRET"
REDIS_PORT=6379
REDIS_URL="redis://127.0.0.1:6379"
INVITATION_LOG_PATH="logs/invitations.log"
LOG_LEVEL="info"
LOG_FILE_ENABLED="true"
LOG_FILE_PATH="logs/application.log"
LOG_FILE_MAX_SIZE="10m"
LOG_FILE_RETENTION_COUNT="30"
```

Create `frontend/.env`:

```env
VITE_APP_URL="http://localhost:5173/"
VITE_API_URL="http://localhost:3000/api"
```

`VITE_APP_URL` sets the browser origin used by frontend tests. Update it to match the frontend URL when running on a different host or port.

Generate Prisma Client and apply the existing database migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## Running the Application

Start Redis:

```bash
cd backend
docker compose up -d redis
```

Start the backend API and invitation worker together from one terminal:

```bash
cd backend
npm run dev
```

For troubleshooting, run them separately with `npm run dev:api` and `npm run dev:worker`.

Start the frontend from another terminal:

```bash
cd frontend
npm run dev
```

The invitation worker processes BullMQ jobs and currently writes invitation emails to `backend/logs/invitations.log`. After running `npm run build`, production should run the API with `npm start` and the compiled worker as a separate process with `npm run worker:invitations:start`.

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:3000/api` by default.

## Backend Logs

Pino writes structured application and HTTP logs to the backend terminal and, by default, to rotated JSON files under `backend/logs`. Files rotate daily or at 10 MB, and the newest 30 rotated files are retained in addition to the active file. These settings can be changed through the `LOG_*` environment variables shown above.

`backend/logs/invitations.log` is separate: it temporarily represents invitation emails until a real email provider is connected.

## Frontend Tests

Frontend tests use Vitest and Testing Library with a simulated browser environment. They run independently from the backend and do not require a database.

Run these commands from the `frontend` directory:

| Command | Purpose |
| --- | --- |
| `npm test` | Runs the frontend test suite once. |
| `npm run test:watch` | Re-runs relevant frontend tests as files change. |

## Backend Tests

These tests apply only to the backend. They check that validation, business logic, API responses, and database operations continue working as features are added.

Run all commands in this section from the `backend` directory:

```bash
cd backend
```

### Test database setup

Database integration tests require a separate database containing no development or production data. Copy `.env.test.example` to `.env.test`, add the test database connection string, and keep this confirmation value unchanged:

```env
TEST_DATABASE_CONFIRM="taskforge-tests"
```

Safety checks prevent integration tests from running when the test configuration is missing or its database URL matches the development database. Each integration suite cleans up the data it uses between cases.

### Important test commands

| Command | Purpose |
| --- | --- |
| `npm test` | Type-checks and runs the fast validation, service, and API tests without using a real database. Run this before committing routine backend changes. |
| `npm run test:watch` | Re-runs the fast tests as files change. Use this while developing or fixing a feature. |
| `npm run test:integration` | Applies existing migrations to the isolated test database and verifies real API-to-PostgreSQL behavior. |
| `npm run test:all` | Runs both the fast suite and database integration suite. Use this for a complete backend verification before merging or releasing changes. |
