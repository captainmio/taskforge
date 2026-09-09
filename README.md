# TaskForge

TaskForge is a full-stack workspace and project-management application. It has a React frontend and an Express API backed by PostgreSQL and Redis.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | TypeScript, React, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Socket.IO Client |
| Backend | TypeScript, Node.js, Express, PostgreSQL, Prisma ORM, Redis, BullMQ, Socket.IO, Pino, Zod, JWT, bcrypt |
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

2. Create `backend/.env` from [`backend/.env.example`](backend/.env.example). Replace every placeholder with a local or deployment value. Do not copy `.env.example` values directly: the template intentionally contains no usable credentials.

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

## Environment configuration

The example files document every supported variable. Keep local `.env` files out of version control and never reuse production credentials for tests.

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode. Use `development` locally and `production` when deployed. |
| `PORT` | HTTP port for the API server. |
| `FRONTEND_API` | Browser origin allowed by API CORS. |
| `BACKEND_PUBLIC_URL` | Public API base URL used to create clickable email-verification links. |
| `API_RESPONSE_DELAY_MS` | Optional artificial response delay in milliseconds; use `0` to disable it. |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma, the API, and workers. |
| `BCRYPT_SALT_ROUNDS` | bcrypt work factor for password hashing. |
| `JWT_SECRET` | Long, unique secret used to sign authentication tokens. |
| `JWT_EXPIRES_IN` | JWT and login-cookie lifetime in `s`, `m`, `h`, or `d` units, such as `1d`. |
| `REDIS_PORT` | Host port exposed by `backend/docker-compose.yml`; it does not configure the application connection. |
| `REDIS_URL` | Redis connection used by BullMQ queues and workers. |
| `CACHE_REDIS_URL` | Redis connection for cached application data; use a separate logical Redis database from `REDIS_URL`. |
| `REDIS_CACHE_TTL_SECONDS` | Lifetime of cached data, in seconds. |
| `LOG_LEVEL` | Minimum structured-log severity: `fatal`, `error`, `warn`, `info`, `debug`, or `trace`. |
| `LOG_FILE_ENABLED` | Enables or disables rotated JSON log files in addition to standard output. |
| `LOG_FILE_PATH`, `LOG_FILE_MAX_SIZE`, `LOG_FILE_RETENTION_COUNT` | Location, maximum size, and retained count for application log files. |
| `SMTP_HOST` | Mailtrap Demo Inbox SMTP hostname; use `sandbox.smtp.mailtrap.io`. |
| `SMTP_PORT` | Mailtrap Demo Inbox SMTP port; use `2525` unless your network requires another Mailtrap-supported port. |
| `SMTP_USERNAME` | Secret SMTP username from the Mailtrap Sandbox Integration tab. |
| `SMTP_PASSWORD` | Secret SMTP password from the Mailtrap Sandbox Integration tab. |
| `SMTP_TOKEN` | Optional API token reserved for future Mailtrap API-based features; SMTP delivery does not use it. |
| `EMAIL_FROM_ADDRESS` | Sender identity displayed in the Mailtrap-captured email. |
| `EMAIL_DELIVERY_LOG_PATH` | Private JSON-lines email log shared by registration and invitation workers; it contains usable links. |
| `ACCOUNT_VERIFICATION_TOKEN_TTL_HOURS` | Lifetime of a one-time account-verification link. |
| `ACCOUNT_VERIFICATION_RESEND_COOLDOWN_SECONDS` | Minimum delay before an unverified account can request another verification link. |

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_APP_URL` | Public URL of the frontend. |
| `VITE_API_URL` | Browser-accessible API base URL, including `/api`. Vite embeds this value during the build. |

### Test environment (`backend/.env.test`)

Copy [`backend/.env.test.example`](backend/.env.test.example) and configure an isolated database and Redis logical databases. `TEST_DATABASE_CONFIRM` must remain `taskforge-tests`; it is a safety check before database integration tests run.

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
| `npm run typecheck` | Type-checks the frontend without building it. |
| `npm run lint` | Runs ESLint checks. |
| `npm run format:check` | Checks Prettier formatting. |
| `npm run build` | Type-checks and creates a production build in `dist`. |
| `npm run preview` | Serves the production build locally for verification. |

### Backend

Run these commands from `backend`:

| Command | Purpose |
| --- | --- |
| `npm test` | Type-checks and runs fast validation, service, and API tests. |
| `npm run test:watch` | Re-runs the fast tests while files change. |
| `npm run test:integration` | Applies migrations to the test database and runs database integration tests. |
| `npm run test:all` | Runs both fast and database integration tests. |
| `npm run build` | Compiles the API and worker into `dist`. |
| `npm start` | Starts the compiled API. |
| `npm run worker:invitations` | Runs the invitation worker from TypeScript for a one-off local process. |
| `npm run worker:invitations:start` | Starts the compiled invitation worker. |
| `npm run worker:email` | Runs the transactional-email worker from TypeScript for a one-off local process. |
| `npm run worker:email:start` | Starts the compiled transactional-email worker. |

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

4. Run the backend API, invitation worker, and transactional-email worker as separate long-lived processes, such as separate terminals or process-manager services:

   ```bash
   cd backend
   npm start
   npm run worker:invitations:start
   npm run worker:email:start
   ```

5. Serve `frontend/dist` from a static hosting provider or web server. Build the frontend after setting `VITE_API_URL`, because Vite includes this value in the generated files.

Keep `.env` files out of version control. Use secure database and Redis connections when your hosting provider supports them.

## Backend logs

The backend writes structured JSON logs to standard output. File logging is also enabled by default and can be configured with:

- `LOG_FILE_ENABLED`
- `LOG_FILE_PATH`
- `LOG_FILE_MAX_SIZE`
- `LOG_FILE_RETENTION_COUNT`

Both email workers write complete delivery records to `EMAIL_DELIVERY_LOG_PATH`. This file includes verification and invitation links, so it must be private and persistent only when manual testing requires it.

For deployments without persistent local storage, set `LOG_FILE_ENABLED="false"` and use the hosting platform's log collection. If file logging is enabled, make sure the configured log directory is writable and persistent.
