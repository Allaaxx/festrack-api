# Festrack API (Financial Tracking API)

Festrack API is a modern, high-performance back-end service for personal and event-related financial management (weddings, parties, trips, and projects). It allows users to track financial transactions, categorize earnings and expenses, manage budgets across events, and compute net balances.

Built with **Bun**, **Elysia**, **Drizzle ORM**, **Better Auth**, and **PostgreSQL**, the project strictly follows **Clean Architecture** (Ports & Adapters) principles.

---

## 🛠️ Technology Stack

- **Runtime**: [Bun](https://bun.sh/) (v1.1+)
- **HTTP Framework**: [Elysia](https://elysiajs.com/)
- **Database & ORM**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) and `postgres.js`
- **Authentication**: [Better Auth](https://www.better-auth.com/) (Session cookies & Bearer tokens)
- **Object Storage**: S3-compatible storage ([MinIO](https://min.io/) for local development, AWS S3/Cloudflare R2 in production)
- **Validation**: [Zod](https://zod.dev/) & Elysia TypeBox schemas
- **Testing**: Bun Test (`bun:test`)
- **Documentation**: Swagger UI via `@elysiajs/swagger`

---

## 🏛️ Architecture & Project Structure

The project is structured according to Clean Architecture layers:

```
festrack-api/
├── .agents/                 # Application-specific agent rules & skills
│   ├── AGENT_RULES.md       # Architecture guidelines, conventions, and rules
│   └── skills/              # Application layer skills (routes, use-cases, repositories)
├── docs/                    # Workflow specs and architectural records
│   ├── adr/                 # Architecture Decision Records (ADRs)
│   └── agents/              # AI Hero agent tooling (issue tracker, triage, domain)
├── src/
│   ├── domain/              # Entities, repository interfaces, and adapter contracts
│   ├── use-cases/           # Application business rules and orchestration
│   ├── repositories/        # Database repository implementations (PostgreSQL / Drizzle)
│   ├── adapters/            # External adapters (S3 storage, password verifiers)
│   ├── routes/              # Elysia route handlers and schema definitions
│   ├── plugins/             # Elysia plugins (e.g. Better Auth context plugin)
│   ├── db/postgres/         # Drizzle schemas, migrations, and database client
│   ├── config/              # Centralized environment variable validation (env.ts)
│   ├── app.ts               # Elysia application configuration & middlewares
│   └── auth.ts              # Better Auth server instance
├── index.ts                 # Server entry point
├── docker-compose.yml       # Local PostgreSQL and MinIO infrastructure
└── GLOSSARY.md              # Ubiquitous domain language definition
```

### Separation of Concerns: `.agents/` vs. `docs/`

- **`.agents/`**: Houses all **Application-Specific** guidelines, layer conventions, and skills (`routes`, `use-cases`, `repositories`).
- **`docs/`**: Houses **AI Hero Agent Workflow** specifications (`docs/agents/`) and system-wide **Architecture Decision Records** (`docs/adr/`).
- **`AGENTS.md`**: Top-level directory router for AI assistants.

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

1. [Bun](https://bun.sh/) (v1.1 or higher)
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```
2. [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Installation & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Allaaxx/festrack-api.git
cd festrack-api
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

The default values in `.env.example` are pre-configured to work out-of-the-box with the local Docker Compose infrastructure:

| Variable               | Description                                            | Local Default                                               |
| :--------------------- | :----------------------------------------------------- | :---------------------------------------------------------- |
| `PORT`                 | API server listening port                              | `3000`                                                      |
| `NODE_ENV`             | Environment mode (`development`, `test`, `production`) | `development`                                               |
| `DATABASE_URL`         | PostgreSQL connection string                           | `postgresql://postgres:password@localhost:5432/finance-app` |
| `BETTER_AUTH_URL`      | Base URL for Better Auth authentication                | `http://localhost:3000`                                     |
| `BETTER_AUTH_SECRET`   | Secret key used for signing session tokens             | _(Set a random string)_                                     |
| `FRONTEND_URL`         | Allowed client URL for CORS                            | `http://localhost:5173`                                     |
| `S3_BUCKET`            | Object storage bucket name                             | `festrack`                                                  |
| `S3_ENDPOINT`          | Object storage API endpoint (MinIO)                    | `http://localhost:9000`                                     |
| `S3_ACCESS_KEY_ID`     | Storage access key                                     | `minioadmin`                                                |
| `S3_SECRET_ACCESS_KEY` | Storage secret key                                     | `minioadmin`                                                |
| `S3_PUBLIC_URL`        | Public asset access URL                                | `http://localhost:9000/festrack`                            |
| `GOOGLE_CLIENT_ID`     | Google OAuth Client ID _(optional)_                    | `""`                                                        |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret _(optional)_                | `""`                                                        |

All variables are strictly validated at boot time via `src/config/env.ts`.

### 4. Start Infrastructure Services

Spin up local PostgreSQL and MinIO using Docker Compose:

```bash
docker compose up -d
```

This starts:

- **PostgreSQL (`finance-app-postgres`)** on port `5432`
- **PostgreSQL Test DB (`finance-app-postgres-test`)** on port `5433`
- **MinIO S3 Storage (`finance-app-minio`)** on port `9000` (API) & `9001` (Web Console)
- **MinIO Setup (`finance-app-minio-setup`)**: Automatically creates and permissions the `festrack` bucket.

### 5. Run Database Migrations

Apply the Drizzle database schema to your local database:

```bash
bun run db:push
```

_(Alternatively, to run formal migration scripts: `bun run migrations`)_

### 6. Start the API

Start the development server with live reload:

```bash
bun run start:dev
```

The API will be accessible at `http://localhost:3000`.

---

## 📖 Endpoints & Service Interfaces

- **API Base URL**: `http://localhost:3000`
- **Interactive Swagger Documentation**: `http://localhost:3000/docs`
- **MinIO Console**: `http://localhost:9001` (Credentials: `minioadmin` / `minioadmin`)

---

## 🧪 Testing & Code Quality

### Running Tests

The test suite runs against the dedicated, isolated test database instance (port `5433`):

1. **Configure test environment variables**:

    ```bash
    cp .env.test.example .env.test
    ```

2. **Push database schema to test database**:

    ```bash
    DATABASE_URL=postgresql://postgres:password@localhost:5433/finance-app bun run db:push
    ```

3. **Execute tests**:
    ```bash
    # Run all tests
    bun test

    # Run tests with coverage
    bun run test:coverage

    # Run tests in watch mode
    bun test --watch
    ```

### Code Formatting & Type Checking

```bash
# Type check TypeScript without emitting files
bun run typecheck

# Check ESLint rules
bun run eslint:check

# Check Prettier formatting
bun run prettier:check

# Format files with Prettier
bunx prettier --write src/
```

---

## 📚 Domain Glossary & Decision Records

- **Ubiquitous Language**: See [`GLOSSARY.md`](./GLOSSARY.md) for canonical domain terms (`User`, `Event`, `Transaction`, `Balance`).
- **Architectural Decision Records**: See [`docs/adr/`](./docs/adr/) for documented decisions:
    - `0001`: Controller Use Case DIP and HTTP Boundary
    - `0002`: Migrate ORM from Prisma to Drizzle
    - `0003`: Migrate Runtime from Node.js to Bun
    - `0004`: Migrate Web Framework from Express to Elysia
    - `0005`: Migrate Authentication from Custom JWT to Better Auth
    - `0006`: Centralized Environment Validation and MinIO Storage

---

## 📄 License

This project is licensed under the [ISC License](./package.json).
