# Architecture

This document defines the target architecture for the file-conversion backend described in `TASK.md`, built on top of the existing NestJS/Fastify boilerplate.

> **Scope note:** the functional specs live in private Notion pages I cannot open. Everything here follows from the parts of `TASK.md` I *can* read (stack table, non-functional requirements) plus the conventions already established in `src/`. Anywhere the exact business rule is spec-dependent (roles list, registration fields, supported formats, error payload shape) is marked **[confirm against spec]** — treat those as defaults to override once you paste in the relevant spec content.

## Guiding decisions

| Decision | Choice | Why |
|---|---|---|
| Validation | Joi schemas + a custom pipe, global `class-validator` `ValidationPipe` removed | Matches the corrected tech stack; avoids running two validation libraries side by side |
| Auth transport | JWT access + refresh tokens, both as httpOnly cookies | `@fastify/cookie` is already registered with a secret in `main.ts` — that's a deliberate signal, not incidental |
| Auth implementation | `@nestjs/jwt` + a hand-rolled guard, no Passport | Boilerplate has no Passport dependency; adding a whole strategy framework for "verify one JWT" is more machinery than the problem needs |
| RBAC model | `role` enum column on `User` (`user`, `admin`) | Simplest model that satisfies "role-based access control"; switch to a `Role`/`Permission` table only if the RBAC spec requires admin-managed, dynamic roles **[confirm against spec]** |
| Transformation execution | Synchronous, in-process (per-strategy) | No queue/broker in the declared stack (no Redis/Bull); job status field keeps the API shape forward-compatible with async processing later |
| File uploads | `@fastify/multipart` | Native Fastify plugin, consistent with the Fastify-first boilerplate (no `multer`/Express middleware) |
| Image conversion | `sharp` | Standard, fast, no native toolchain surprises on the target platforms |

## Module map

```
src/
├── core/                      # existing infra modules (unchanged)
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── health/                # extend: add DB ping indicator (see Health below)
│   └── throttler/
├── common/                     # NEW — cross-cutting building blocks, no business logic
│   ├── decorators/
│   │   ├── public.decorator.ts        # @Public() — bypass the global JwtAuthGuard
│   │   ├── roles.decorator.ts         # @Roles(Role.ADMIN, ...)
│   │   └── current-user.decorator.ts  # @CurrentUser() param decorator
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # global (APP_GUARD), reads access token cookie
│   │   └── roles.guard.ts              # global (APP_GUARD), checks @Roles metadata
│   ├── filters/
│   │   └── all-exceptions.filter.ts    # global (APP_FILTER), consistent error shape + logging
│   ├── interceptors/
│   │   └── logging.interceptor.ts      # global (APP_INTERCEPTOR), request/response + timing log
│   ├── pipes/
│   │   └── joi-validation.pipe.ts       # generic Joi-schema pipe
│   └── validation/
│       └── schemas/                     # shared fragments (pagination, uuid param, etc.)
├── database/
│   └── migrations/
├── modules/
│   ├── users/
│   │   ├── entities/user.entity.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── dto/ (+ .schema.ts Joi schemas)
│   ├── auth/
│   │   ├── entities/refresh-token.entity.ts
│   │   ├── entities/verification-token.entity.ts   # email verification + password reset
│   │   ├── auth.controller.ts    # register, login, refresh, logout, verify-email, password reset
│   │   ├── auth.service.ts
│   │   ├── token.service.ts       # access/refresh JWT issuing + rotation
│   │   ├── auth.module.ts
│   │   └── dto/
│   ├── mail/
│   │   ├── mail.service.ts        # turboSMTP client wrapper
│   │   ├── mail.module.ts
│   │   └── templates/
│   ├── storage/
│   │   ├── storage.service.ts     # local filesystem abstraction
│   │   └── storage.module.ts
│   └── transformations/
│       ├── entities/transformation-job.entity.ts
│       ├── strategies/
│       │   ├── transformation-strategy.interface.ts
│       │   ├── text-transformation.strategy.ts
│       │   └── image-transformation.strategy.ts
│       ├── transformation.factory.ts    # picks a strategy by (category, sourceFormat, targetFormat)
│       ├── transformations.controller.ts
│       ├── transformations.service.ts
│       ├── transformations.module.ts
│       └── dto/
└── main.ts                     # + multipart registration, + Swagger bootstrap, − global class-validator pipe
```

`AppModule` import order: core modules (unchanged) → `MailModule`, `StorageModule` → `UsersModule`, `AuthModule`, `TransformationsModule`.

## Domain model

All tables get `id` (uuid, PK), `createdAt`/`updatedAt`. Soft-delete (`@DeleteDateColumn`) is used where deletion must not break referential integrity (users have transformation history pointing at them).

**`User`**
- `email` — unique, indexed
- `passwordHash`
- `role` — enum `user` | `admin`, default `user` **[confirm against RBAC spec — may need more roles]**
- `isEmailVerified` — bool, default false
- `deletedAt` — soft delete, so historical `TransformationJob` rows keep a valid `userId`
- Indexes: unique on `email`

**`RefreshToken`**
- `userId` FK → `User`, indexed
- `tokenHash` — the raw token is never stored, only its hash (so a DB leak doesn't hand out valid sessions)
- `expiresAt`, `revokedAt`
- Rotated on every `/auth/refresh` call (old row revoked, new row issued) — detects token replay

**`VerificationToken`**
- `userId` FK, `tokenHash`, `type` (`email_verification` | `password_reset`), `expiresAt`, `usedAt`
- Used by the registration-confirmation and password-reset flows **[confirm exact flow against registration spec]**

**`TransformationJob`** (doubles as the transformation-history record)
- `userId` FK, indexed
- `category` (`text` | `image`), `sourceFormat`, `targetFormat`
- `status` (`pending` | `processing` | `completed` | `failed`)
- `sourceFileName`, `sourceSizeBytes`, `resultFilePath` (nullable until completed), `resultSizeBytes`
- `errorMessage` (nullable)
- Composite index on `(userId, createdAt)` — the history endpoint's primary access pattern
- Index on `status` — for any admin/monitoring queries over stuck jobs

## Validation (Joi)

- `common/pipes/joi-validation.pipe.ts`: a generic `PipeTransform` constructed with a `Joi.ObjectSchema`, thrown validation errors mapped to a `400` with a consistent field-level error shape.
- Each module's `dto/` folder holds a `*.schema.ts` (the Joi schema) next to a plain TS `type`/`interface` inferred from it for compile-time typing — no DTO classes, no `class-validator` decorators.
- Applied per-route: `@UsePipes(new JoiValidationPipe(createUserSchema))`, not global — different endpoints validate different shapes (body vs query vs params), and a single global pipe can't express that with Joi the way `class-validator`'s global pipe could with typed DTO classes.
- Remove the current `class-validator` `ValidationPipe` from `main.ts` once the first Joi schema lands, so there's exactly one validation mechanism active.
- Config validation (`core/config`) stays on Joi as-is — already consistent.

## Auth & sessions

- `POST /auth/register` → creates `User` (unverified), issues a `VerificationToken`, sends verification email via `MailModule`.
- `POST /auth/login` → verifies credentials, issues access + refresh JWT, sets both as httpOnly/secure/sameSite cookies.
- `POST /auth/refresh` → validates refresh cookie against `RefreshToken.tokenHash`, rotates it, reissues both cookies.
- `POST /auth/logout` → revokes the current `RefreshToken` row, clears cookies.
- Access token: short TTL (~15 min), carries `sub` (userId) + `role`. Refresh token: longer TTL (~7–30 days) **[confirm session-length expectations against auth spec]**.
- `JwtAuthGuard` is registered globally via `APP_GUARD`; routes opt out with `@Public()` (register, login, refresh, health, email verification link).
- `RolesGuard` (also global) reads `@Roles(...)` metadata off the route and compares against `request.user.role`; routes with no `@Roles` metadata are accessible to any authenticated user.
- **CORS/cookie note:** using cookie-based auth with `credentials: true` CORS (already set in `main.ts`) means CSRF needs an explicit mitigation for state-changing routes — e.g. `sameSite: 'strict'`/`'lax'` plus requiring a custom header on mutating requests. Flagging this as an open item to close before this goes to production, not yet solved by anything in the current boilerplate.
- Auth endpoints (`login`, `register`, `refresh`, password reset) get a stricter `@Throttle()` override than the global limiter, per the brute-force requirement.

## File transformation pipeline

1. `POST /transformations` — Fastify multipart upload + `targetFormat` field. Validate mime type / size before touching disk.
2. Create `TransformationJob` row (`status: processing`) inside a DB transaction (`@Transactional()`), persist the upload via `StorageService` under `storage/uploads/{userId}/{jobId}.{ext}`.
3. `TransformationFactory` resolves a `TransformationStrategy` from `(category, sourceFormat, targetFormat)`. Each strategy implements `transform(inputPath, outputPath): Promise<void>`; new format pairs are added by registering a new strategy, not by editing existing ones.
4. On success: write result to `storage/results/{userId}/{jobId}.{ext}`, update the job to `completed` with `resultFilePath`/`resultSizeBytes`. On failure: `failed` + `errorMessage`, original upload retained for diagnostics (or deleted — depends on retention rule **[confirm against spec]**).
5. `GET /transformations` — paginated history for the current user (or, for `admin`, optionally any user), backed by the `(userId, createdAt)` index.
6. `GET /transformations/:id/download` — streams `resultFilePath`; ownership check (`job.userId === currentUser.id`) unless caller is `admin`.

Exact supported format pairs and per-format validation rules are spec-driven **[confirm against text/image transformation specs]** — the strategy interface is deliberately format-agnostic so those slot in without touching the controller/service.

## Storage

- `StorageService` wraps a configurable root (`STORAGE_ROOT`, default `./storage`) with `uploads/` and `results/` subfolders, both per-`userId`.
- `storage/` is added to `.gitignore` — it's runtime data, not source.
- Kept behind an interface (`save`, `resolve`, `delete`) so swapping local disk for something else later doesn't touch calling code.

## Mail (turboSMTP)

- `MailService` wraps turboSMTP's HTTP API directly (native `fetch`, no extra HTTP client dependency needed on the target Node version) — turboSMTP isn't a standard SMTP-transport-compatible provider in the way `nodemailer` expects, so this is a thin bespoke client rather than a nodemailer transport **[confirm turboSMTP's actual API shape/credentials — flagged since I don't have the account details or spec]**.
- Two call sites for now: verification email, password-reset email.

## Logging & error handling

- `LoggingInterceptor` (global): logs method, route, `userId` (once authenticated), status code, duration. Request bodies are logged with `password`/token fields redacted.
- `AllExceptionsFilter` (global): normalizes every thrown error into one response shape (`statusCode`, `message`, `error`, no stack trace outside dev), while logging the full error server-side.
- Security-relevant events (login success/failure, registration, role/user changes, deletion) are logged explicitly at the point they happen in `auth`/`users` services, not inferred from generic request logging — the interceptor alone can't tell "a login attempt failed" from "any 401".

## Health checks

Extend the existing `HealthModule` (`@nestjs/terminus` already present) with a `TypeOrmHealthIndicator` DB ping, so `/health` actually reflects whether Postgres is reachable — currently it only returns `{ status: 'ok', details: {} }` when disabled and an empty check list when enabled.

## Swagger

- Add `@nestjs/swagger`, `DocumentBuilder` config in `main.ts` (cookie-based auth scheme).
- Since request validation is Joi-based rather than decorated DTO classes, request/response shapes for Swagger need either lightweight `@ApiProperty`-annotated classes kept purely for documentation (duplicating the Joi schema's shape) or a Joi→OpenAPI schema conversion. Recommend the former for controllers with few fields, revisit if it gets repetitive.

## New dependencies

`@nestjs/jwt`, `bcrypt`, `@fastify/multipart`, `sharp`, `@nestjs/swagger`, `uuid` (if not relying on TypeORM's generated UUID columns already used elsewhere).

## Config additions

New env vars needed in `config.types.ts` / `config.validation.ts` / `.env.example`: `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL`, `STORAGE_ROOT`, `MAX_UPLOAD_SIZE_BYTES`, and turboSMTP credentials (exact names pending the mail spec/account details).

## Testing

- Unit tests colocated as `*.spec.ts` (existing convention) for services, guards, the Joi pipe, and each transformation strategy in isolation.
- Integration/e2e tests in `test/*.e2e-spec.ts` against a real Postgres (via `docker-compose`), migrations applied before the suite runs.
- `package.json`'s Jest config already does `collectCoverageFrom: **/*.(t|j)s` — add a `coverageThreshold` (global 80%) to make the requirement enforced rather than aspirational.

## Open items requiring the actual specs

- Exact RBAC role set and permission boundaries beyond `user`/`admin`.
- Registration required fields, uniqueness rules beyond email, email-verification requirement (mandatory before login?).
- Supported source/target format pairs for text and image transformation, and any size/rate limits per format.
- Delete-user semantics: soft delete (assumed above) vs hard delete, and what happens to that user's transformation history/files.
- turboSMTP account details and exact API contract.
