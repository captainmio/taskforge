# TypeScript Full-Stack App

A full-stack web application with a React frontend and an Express API. The backend uses PostgreSQL for persistence and provides authentication with JWT cookies.

## Technology Stack

| Area | Main technologies |
| --- | --- |
| Frontend | TypeScript, React 19, Vite, Tailwind CSS, React Router, Axios, React Hook Form |
| Backend | TypeScript, Node.js, Express 5, PostgreSQL, Prisma ORM, Zod, JWT, bcrypt |
| Backend testing | Vitest and Supertest |

## Prerequisites

- Node.js 22.12 or newer
- npm
- A PostgreSQL database, such as Neon

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
```

Create `frontend/.env`:

```env
VITE_API_URL="http://localhost:3000/api"
```

Generate Prisma Client and apply the existing database migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## Running the Application

Start the backend from one terminal:

```bash
cd backend
npm run dev
```

Start the frontend from another terminal:

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:3000/api` by default.

## Backend Tests

These tests apply only to the backend. They check that validation, business logic, API responses, and database operations continue working as features are added. Frontend tests will use a separate setup and separate commands.

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
