# TaskForge

TaskForge is a full-stack workspace and project-management application. It has a React frontend and an Express API backed by PostgreSQL and Redis.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | TypeScript, React, Vite, Tailwind CSS, React Router, Axios, React Hook Form |
| Backend | TypeScript, Node.js, Express, PostgreSQL, Prisma ORM, Redis, BullMQ, Pino, Zod, JWT, bcrypt |
| Testing | Vitest, Testing Library, Supertest |

## Prerequisites

- Node.js 22.12 or newer
- npm
- PostgreSQL
- Redis
- Docker (recommended for running Redis locally)

## Setup

1. Install dependencies for both applications:

   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```

2. Create `backend/.env` from [`backend/.env.example`](backend/.env.example). At minimum, set:

   ```env
   NODE_ENV="development"
   DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=verify-full"
   JWT_SECRET="replace-with-a-long-random-secret"
   FRONTEND_API="http://localhost:5173"
   REDIS_URL="redis://127.0.0.1:6379"
   CACHE_REDIS_URL="redis://127.0.0.1:6379/1"
   ```

   `FRONTEND_API` is the frontend origin accepted by CORS and used in generated invitation links. `REDIS_URL` is used by invitation jobs; `CACHE_REDIS_URL` is used for cached workspace data. `REDIS_PORT` only controls the host port used by local Docker Compose.

3. Create `frontend/.env` from [`frontend/.env.example`](frontend/.env.example):

   ```env
   VITE_APP_URL="http://localhost:5173/"
   VITE_API_URL="http://localhost:3000/api"
   ```

   `VITE_API_URL` must be the browser-accessible API address and include `/api`.

4. Generate the Prisma client and apply database migrations:

   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   ```

## Local development

1. Start Redis from the `backend` directory:

   ```bash
   docker compose up -d redis
   ```

2. Start the API and invitation worker:

   ```bash
   cd backend
   npm run dev
   ```

   To run them separately, use `npm run dev:api` and `npm run dev:worker`.

3. Start the frontend in another terminal:

   ```bash
   cd frontend
   npm run dev
   ```

The frontend is available at `http://localhost:5173` and the API at `http://localhost:3000/api` by default.

## Tests

### Frontend

Run these commands from `frontend`:

| Command | Purpose |
| --- | --- |
| `npm test` | Runs the frontend test suite once. |
| `npm run test:watch` | Re-runs relevant tests while files change. |

### Backend

Run these commands from `backend`:

| Command | Purpose |
| --- | --- |
| `npm test` | Type-checks and runs fast validation, service, and API tests. |
| `npm run test:watch` | Re-runs the fast tests while files change. |
| `npm run test:integration` | Applies migrations to the test database and runs database integration tests. |
| `npm run test:all` | Runs both fast and database integration tests. |

Database integration tests need a separate test database. Copy [`backend/.env.test.example`](backend/.env.test.example) to `backend/.env.test`, set its database URL, and leave this value unchanged:

```env
TEST_DATABASE_CONFIRM="taskforge-tests"
```

Never point `backend/.env.test` at a development or production database.

## Production deployment

1. Provision PostgreSQL and Redis, then set production backend and frontend environment variables. Set `NODE_ENV="production"`, use a strong unique `JWT_SECRET`, and use the public frontend and API URLs for `FRONTEND_API` and `VITE_API_URL`.
2. Install dependencies, generate Prisma Client, and apply migrations:

   ```bash
   cd backend
   npm ci
   npx prisma generate
   npx prisma migrate deploy

   cd ../frontend
   npm ci
   ```

3. Build both applications:

   ```bash
   cd backend
   npm run build

   cd ../frontend
   npm run build
   ```

4. Run the backend API and invitation worker as separate long-lived processes, such as separate terminals or process-manager services:

   ```bash
   cd backend
   npm start
   npm run worker:invitations:start
   ```

5. Serve `frontend/dist` from a static hosting provider or web server. Build the frontend after setting `VITE_API_URL`, because Vite includes this value in the generated files.

Keep `.env` files out of version control. Use secure database and Redis connections when your hosting provider supports them.

## Backend logs

The backend writes structured JSON logs to standard output. File logging is also enabled by default and can be configured with:

- `LOG_FILE_ENABLED`
- `LOG_FILE_PATH`
- `LOG_FILE_MAX_SIZE`
- `LOG_FILE_RETENTION_COUNT`

The invitation worker writes its invitation-delivery records to `INVITATION_LOG_PATH`.

For deployments without persistent local storage, set `LOG_FILE_ENABLED="false"` and use the hosting platform's log collection. If file logging is enabled, make sure the configured log directory is writable and persistent.
