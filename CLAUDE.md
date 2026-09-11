# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NestJS backend template. HTTP kernel is **Fastify** (`@nestjs/platform-fastify`), not Express — use Fastify plugins and types (`NestFastifyApplication`, `app.register(...)`) in `src/main.ts`, not Express equivalents. `@nestjs/platform-express` is only present as a transitive/dev dependency; do not build against it.

## Commands

```bash
npm run start:dev    # Development with hot reload
npm run start:prod   # Production (runs dist/main after build)
npm run build        # Build (nest build)
npm run lint         # ESLint with --fix over src/apps/libs/test
npm run format       # Prettier --write src/** test/**
npm run test         # Unit tests (Jest, rootDir: src, matches *.spec.ts)
npm run test:watch
npm run test:cov
npm run test:e2e     # E2E tests (jest --config ./test/jest-e2e.json, matches *.e2e-spec.ts)
```

Run a single unit test file: `npm test -- health.controller.spec.ts` (or a path, e.g. `npm test -- src/core/config/config.service.spec.ts`). Jest's `rootDir` is `src`, so spec files live next to the code they test.

Database (requires local Postgres via `docker compose up -d`, config from `.env`):

```bash
npm run migration:generate   # Generate from entity changes (needs a full migration path arg, e.g. -- src/database/migrations/AddUsersTable)
npm run migration:run
npm run migration:revert
npm run migration:show
```

Migration CLI (`typeorm-ts-node-commonjs`) loads connection config from `src/database/data-source.ts`, which reads `process.env` directly via `dotenv/config` — it is a separate DataSource from the one Nest builds at runtime in `DatabaseModule`, kept in sync manually (same host/port/user/db settings).

## Architecture

```
src/
├── core/            # Infrastructure/cross-cutting modules, wired into AppModule
│   ├── app/          # Root AppModule — imports core modules, then feature modules
│   ├── config/       # ConfigService wrapping @nestjs/config, Joi-validated at startup
│   ├── database/     # DatabaseModule: TypeORM + PostgreSQL connection factory
│   ├── health/        # GET /health (Terminus), toggled by HEALTH_CHECK_ENABLED
│   └── throttler/     # Global rate limiting (@nestjs/throttler)
├── database/
│   ├── data-source.ts        # Standalone DataSource for the TypeORM CLI only
│   └── migrations/           # Migration files, matched by *.migration{.ts,.js}
├── modules/          # Feature modules: auth (register), users (repository); more to come
└── main.ts           # Bootstrap: Fastify adapter, compression, cookies, CORS
```

- **Config**: all env access goes through `ConfigService` (`src/core/config`), a typed wrapper over `@nestjs/config`. To add a new env var: add the key to the `Config` interface in `config.types.ts`, add Joi validation in `config.validation.ts`, then use `configService.get('KEY')` — never read `process.env` directly outside of `data-source.ts` (which intentionally bypasses Nest's DI to serve the CLI). `ConfigModule` is `@Global()`.
- **Database**: entities are any `*.entity.ts` file anywhere under `src/` (auto-loaded via glob + `autoLoadEntities: true`). Migrations must be named `*.migration.ts` to be picked up — the glob pattern in both `DatabaseModule` and `data-source.ts` is `*.migration{.ts,.js}`, not the TypeORM-CLI default. `POSTGRES_SYNCHRONIZE` is `false` by default; don't rely on auto-sync. Use `@Transactional()` from `typeorm-transactional` for transactions (its storage context is initialized once in `main.ts`).
- **Modules**: new feature modules go under `src/modules/`, each registered in `AppModule` (`src/core/app/app.module.ts`) under the `Application modules` comment block, after the core modules. Use `TypeOrmModule.forFeature([YourEntity])` + `@InjectRepository(YourEntity)` for a module's own repositories — wrapped in a dedicated `*Repository` class (e.g. `UsersRepository`), not injected raw into services/controllers.
- **Imports**: use the `@/*` path alias for absolute imports from `src/` (e.g. `import { ConfigService } from '@/core/config/config.service'`), configured in `tsconfig.json`.
- **Validation**: `Joi` schemas + `common/pipes/joi-validation.pipe.ts` (a generic `PipeTransform`), applied per-route via `@UsePipes(new JoiValidationPipe(someSchema))` — no global pipe, no `class-validator`/`class-transformer` DTOs. Each module's `dto/` folder holds a `*.schema.ts` next to a hand-written TS interface matching it.
- **Rate limiting**: `ThrottlerGuard` is registered globally via `APP_GUARD` in `ThrottlerModule` — routes needing a stricter limit than the global default override it with `@Throttle({ default: { limit, ttl } })`.
- **CORS**: allowed origins are currently hardcoded in `main.ts` (`localhost:5174`, `4200`, `8080`) rather than coming from config.
