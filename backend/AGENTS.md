# Backend Instructions

## Tech Stack

* Node.js
* TypeScript
* Express 5
* PostgreSQL
* Prisma ORM
* `pg` PostgreSQL driver
* JWT authentication
* bcrypt password hashing
* Zod validation
* CORS
* Cookie Parser
* dotenv
* `tsx` and Nodemon for development
* Redis and BullMQ for background jobs
* Pino and pino-http for structured application and request logging

## Folder Structure

* `/config`

  * Application configuration.
  * Backend-wide constants.
  * Environment-related configuration.

* `/controller`

  * Handles HTTP-related concerns.
  * Receives validated request data.
  * Calls the appropriate service.
  * Returns the HTTP response.
  * Keep controllers small and focused.

* `/middleware`

  * Reusable backend middleware.
  * Keep middleware generic when possible.

* `/routes`

  * Defines API routes.
  * Applies the required middleware and validation schemas.

* `/services`

  * Holds business logic.
  * Services should coordinate application logic without directly handling HTTP concerns.

* `/repositories`

  * Holds database-related queries and operations.
  * Repository logic should interact with Prisma.

* `/queues`

  * Holds BullMQ queue definitions, job payloads, and producer functions.
  * Keep business logic in services and job processing in workers.

* `/workers`

  * Holds background BullMQ consumers that run separately from the API process.
  * Workers should call services or repositories instead of handling HTTP concerns.

* `/validations`

  * Holds reusable Zod schemas.
  * Use these schemas to validate request data before it reaches the controller.

* `/tests`

  * `/unit` mirrors backend layers such as validations and services.
  * `/integration/routes` holds API and database integration tests.
  * `/helpers` holds shared fixtures, environment safeguards, and database utilities.

## Architecture

```text
Routes
  ↓
Validation / Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma
  ↓
Database
```

* **Routes**

  * Define endpoints.
  * Apply validation and middleware.

* **Controller**

  * Handle HTTP requests and responses.
  * Pass work to the service layer.

* **Service**

  * Handle business logic.

* **Repository**

  * Handle database queries.

* **Prisma**

  * Communicate with PostgreSQL.

## Coding Guidelines

* Use TypeScript for all backend code.
* Avoid using `any`.
* Keep controllers small and focused.
* Keep HTTP-related logic inside controllers.
* Put business logic inside services.
* Put database queries inside repositories.
* Keep each layer focused on its responsibility.
* Prefer simple and readable implementations.
* Avoid unnecessary abstraction or over-engineering.
* Do not make unrelated code changes.
* Do not modify frontend code when working on backend-only tasks.

## Controllers

* Keep controllers as small as practical.
* Controllers should mainly:

  * Receive validated request data.
  * Read route params, query params, or request body.
  * Call the appropriate service.
  * Return the correct HTTP response.
  * Pass errors to the application's error handling flow.
* Avoid:

  * Business logic inside controllers.
  * Direct Prisma queries inside controllers.
  * Large validation logic inside controllers.

## Services

* Keep business logic inside the service layer.
* Keep service logic simple and easy to understand.
* Break large service logic into smaller functions when:

  * It handles multiple responsibilities.
  * It becomes difficult to understand.
  * Part of the logic can be reused.
* Avoid splitting logic unnecessarily when the existing implementation is already clear.
* Prefer readable code over unnecessary abstractions.

## Repositories

* Keep database operations inside repositories.
* Check existing repositories before creating new database queries.
* Reuse existing repository functions when practical.
* Keep repository functions focused on database operations.
* Avoid placing business rules inside repositories.
* Keep repositories limited to database operations, and handle business rules and application-level error translation in services.
* Use Prisma for database access unless the existing project has a clear reason to use another approach.

## Validation

* Validate incoming request data using Zod.
* Validate untrusted boundary data, including requests, authentication payloads, and environment variables, with Zod instead of unsafe casts or repeated manual type checks.
* Create reusable Zod schemas under `/validations`.
* Apply validation through middleware before the request reaches the controller.
* Validate where appropriate:

  * Request body.
  * Route parameters.
  * Query parameters.
* Avoid repeating validation logic across controllers.
* Prefer typed middleware and request contracts, and avoid non-null assertions when middleware guarantees can be represented through TypeScript.

## Reusable Helpers

* Create reusable helpers when logic can be shared across services.
* Keep helpers generic when they are intended for reuse.
* Avoid creating helpers that are tightly coupled to only one use case unless doing so clearly improves readability.
* Do not move simple logic into a helper just to reduce the number of lines in a service.

## API Responses

* Use `createSuccessResponse` from `/src/utils/api-response.ts` for successful JSON API responses.
* Successful responses should consistently contain `success`, `message`, and `data`.
* Return collection records as an array in `data` and single-resource records as an object in `data`.
* Do not add feature-specific records as new top-level response properties.

## Packages

* Before creating custom functionality, check whether an existing installed package already provides a suitable solution.
* Prefer built-in Node.js or TypeScript functionality when it is simpler and clearer.
* Keep dependencies and custom implementations easy for other developers to understand.
* Do not install a new package without permission.

If a new package is needed:

* Explain which package is required.
* Explain what it will be used for.
* Explain why the existing dependencies are not sufficient.
* Ask for permission before installing it.

## Database and Migrations

* Do not modify existing migrations.
* Create a new migration when the database schema needs to change.
* Keep schema changes focused on the current task.
* Avoid unrelated database changes.
* Review existing Prisma models and relations before introducing new ones.
* Always ask permission if a migration needs to be run.

## Comments

* Add comments when they help explain:

  * Complex business logic.
  * Important implementation decisions.
  * Workarounds.
  * Non-obvious behavior.
  * Feature boundaries such as authorization order, cache fallbacks, and data-shape transformations.
* Keep explanatory comments close to the behavior they document so future changes update both together.
* Avoid comments that simply repeat what the code already says.

## Logging

* Use the shared Pino logger instead of adding new `console.log`, `console.warn`, or `console.error` calls.
* Use `req.log` inside request handlers so business events include the HTTP request ID. Use the shared logger from `/src/config/logger.ts` for code that does not have a request, such as workers and startup logic.
* Log structured fields with stable event names, database identifiers, and outcomes. Do not log passwords, cookies, authorization headers, invitation tokens, or unnecessary personal data.
* Set `logType` to `api` for automatic HTTP logs, `feature` for business events, or `system` for process lifecycle events. Prefix messages with `[API]`, `[FEATURE]`, or `[SYSTEM]` so terminal and file output is easy to scan.
* Pass unexpected errors through the `err` field so Pino records their message and stack trace.
* Application logs are written to stdout and, when enabled, rotated files under `backend/logs`. The invitation delivery file is a separate temporary substitute for email and must not be treated as an application log.

## Before Starting a Task

* When the user provides `BTASK`, first respond with a brief flow of the backend work you plan to perform.
* Do not create or modify files during this planning step, even when `BTASK` is already provided.
* Wait for the user to confirm the proposed flow before implementing the backend changes.

* Review and understand the requested change.
* Review the existing backend implementation related to the task.
* Check whether existing code can be reused, including:

  * Routes.
  * Controllers.
  * Services.
  * Repositories.
  * Middleware.
  * Validation schemas.
  * Helpers.
* Identify:

  * New files that may be needed.
  * Existing files that need changes.
  * Database or Prisma schema changes.
  * New validation schemas.
  * Any new package that may be required.
* Report the proposed approach before making changes.
* Explain what will be created or modified and why.
* Wait for approval before starting implementation.

## Implementation Principles

* Keep the new or updated code readable and easy to understand.
* Prefer simple solutions.
* Reuse existing implementations when practical.
* Avoid duplicate logic.
* Keep responsibilities separated between layers.
* Avoid unnecessary complexity.
* Only modify files related to the requested task.

## Pragmatic Coding Standards

* Apply common engineering standards in proportion to the size and needs of the application.
* Prefer the simplest design that keeps responsibilities clear and handles the required behavior safely.
* Add abstractions only when they remove meaningful duplication, support reuse, or clarify a real boundary.
* Do not create separate types, helpers, classes, or wrappers for every layer when they represent the same concept and provide no additional behavior.
* Use descriptive names and straightforward control flow so developers can understand the code without unnecessary indirection.
* Optimize for maintainability and consistency with the existing codebase rather than applying patterns mechanically.
* Keep simple, readable conditions inline and create reusable guards or helpers only when they improve clarity or are used in multiple places.

## Testing Standards

* Mirror the backend architecture under `tests/unit/{validations,services}` and `tests/integration/routes`, use `*.test.ts` naming, and place shared fixtures, factories, and database utilities under `tests/helpers`.
* Give each `it` or `test` case a clear behavior-based name that states the action or condition and the expected result (for example, `returns a conflict when the email already exists`); avoid vague names such as `works` or `handles errors` so developers can understand the test without reading its implementation.
* For each feature, cover its successful path, validation failures, important business rules, expected conflicts, and unexpected failures at the appropriate layer without duplicating Playwright user journeys.
* Keep tests independent and deterministic, provide simple npm scripts, use only a guarded isolated test database, apply migrations before integration runs, and clean test data between cases.
