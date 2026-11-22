# CardsSqlApp — Greeting Cards Management App

A full-stack web application developed for **Starost v radost**, a charitable foundation in Moscow, Russia. It supports the **Grandchildren by Correspondence: Send a Greeting Card** program, which connects volunteers with nursing-home residents through birthday and holiday greetings.

The application helps staff coordinate requests, manage resident and volunteer information, track confirmations, and identify residents who still need a greeting. Reporting tools provide visibility into participation and coverage.

> **Project status:** Actively maintained. The frontend Phase 7 audit, cleanup, and regression review was completed in November 2026.
>
> **Privacy:** This is an application that handles sensitive personal information. Public repositories, screenshots, test data, and demos must use synthetic or appropriately anonymized data only.

## Features

- **Resident and nursing-home management:** Maintain resident records, nursing homes, and associated contacts.
- **Volunteer and staff workflows:** Manage participants and coordinate greeting-card activities.
- **Request assignment and tracking:** Assign resident greeting requests to volunteers and track progress and confirmations.
- **Coverage monitoring:** Review lists and reports to help identify residents who have not yet been assigned or confirmed.
- **Reporting and exports:** Generate operational reports and export data for authorized workflows.
- **Search and data navigation:** Filter, sort, and paginate records to support larger datasets.
- **Authentication and authorization:** Session-based JWT authentication with server-enforced role and permission checks.
- **Multilingual interface:** Russian and English UI support.
- **Responsive interface:** Workflows designed for desktop and smaller screens.
- **Auditability and diagnostics:** Audit logging, structured application logs, and consistent API error handling.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Angular, TypeScript, RxJS, Angular Material, PrimeNG, HTML, CSS |
| Backend | Node.js, Express, REST APIs |
| Database | PostgreSQL, Sequelize ORM |
| Validation and security | Zod, JWT sessions, role-based access control (RBAC) |
| Logging | Pino, structured error handling, request correlation |
| Frontend testing | Jasmine, Karma, Cypress |
| Backend testing | Jest, Supertest |
| Collaboration and tooling | Git, GitHub |

The application was migrated from an earlier MongoDB-based data model to PostgreSQL, with relational schemas and API queries adapted to the application's workflows.

## Architecture

```text
Angular UI
    |
    | REST / JSON
    v
Express API
    |-- Authentication and permission checks
    |-- Request validation and error handling
    |-- Business workflows and reporting
    |-- Structured logging and audit data
    |
    v
Sequelize ORM
    |
    v
PostgreSQL
```

The frontend communicates with the Express API. The backend performs input validation, enforces authorization, and accesses PostgreSQL through Sequelize. Shared validation and types help keep client and server contracts aligned.

## Quality and Testing

The project includes unit, integration, API, and end-to-end tests covering business workflows, permissions, and navigation.

**Frontend Phase 7 closure snapshot (November 2026):**

| Check | Result |
| --- | --- |
| Full frontend suite | **722 / 722 passed** |
| Critical specifications | **86 / 86 passed** |
| Authentication checks | **29 / 29 passed** |
| Routing checks | **33 / 33 passed** |
| Cypress end-to-end checks | **8 / 8 passed** |
| TypeScript, production build, diff checks | **Passed** |

These are recorded results from the Phase 7 closure review, not live test results. Counts refer to their respective checks and should not be added together.

The production frontend build was under its **5 MB budget** at closure, with approximately **6.33 kB** of headroom. Existing build warnings were documented.

**Test commands**

```bash
npm run test:unit
npm run test:int
npm test
```

Backend integration tests load `server/.env.test` and truncate their dedicated test database between cases. Configure that target before running `npm run test:int`.

Phase 6 and Phase 7 audit, cleanup, and closure notes are maintained in the `docs/` directory.

## Security and Privacy

- Authentication uses JWT-based sessions and access controls.
- Backend middleware enforces authorization for protected operations.
- Sensitive fields are masked or excluded from application logs.
- Inputs are validated on the server; API errors use structured responses.
- Secrets and database credentials must be supplied through environment configuration, **never committed to Git**.
- Public documentation, screenshots, and demos must not expose real resident, volunteer, or staff information.

## Local Development

### Prerequisites

- A Node.js version compatible with the project's Angular and backend dependencies.
- npm.
- A PostgreSQL instance and access credentials.

### Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Configure the backend environment in a private local `.env` file. Use `NODE_ENV=development`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_LINK`. The value of `DB_LINK` is a host, port, and database path such as `localhost:5432/cards_dev`. The backend builds the connection string from those three variables. Supply local `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `PASSWORD_PEPPER` values as well. The default backend port is `8080`, which matches the Angular development API configuration.

3. Compile the shared schemas and start the backend. Start Angular in a separate terminal.

   ```bash
   npm run build:shared:once
   npm run server
   # In a separate terminal
   npm run start
   ```

### Backend integration tests

Set `NODE_ENV=test` through `npm run test:int`. The runner reads `server/.env.test` with file values taking precedence and uses `DB_LINK_TEST`, `DB_USERNAME`, and `DB_PASSWORD`. Use a dedicated local test database whose name starts with `test_` and supply synthetic test secrets for JWTs and password hashing. Keep the file private. Integration setup truncates tables, so use a database reserved for this suite. Guarded live Cypress has separate private configuration and approval requirements.

## Deployment

The project has used **Render** for the backend and **Neon PostgreSQL** for hosted data; the frontend also has **Vercel preview deployments**. Public access details are intentionally omitted here.

### Production environment

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Required | Set to `production` to select the production database, logging and cookie behavior. |
| `DATABASE_URL` | Required | Connection URI for the verified production PostgreSQL target. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_PEPPER` | Required | Supply through deployment secret configuration and retain continuity across releases. |
| `ALLOWED_ORIGINS` | Required for cross-origin topology | Comma-separated exact frontend origins for credentialed API access. |
| `PORT` | Required when the host assigns the port | HTTP listener port. The runtime defaults to `8080`. |
| `REDIS_URL` | Required when topology needs shared rate limits | The runtime otherwise uses process-local limits. |
| `LOG_LEVEL` | Optional | Production logging level. |
| `JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC` | Optional | Access and refresh token lifetimes in seconds. |
| `AUDIT_RETENTION_DAYS` | Optional | Review the effective policy before startup. The default is 180 days. |
| `PERMS_SYNC_ON_BOOT` | Optional | Defaults to enabled. Use the explicit value `false` when the release procedure manages synchronization separately. |

Keep deployment credentials and personal data in private systems. Configure the Angular build for the intended API origin and verify the frontend host serves the Angular shell for authenticated deep links. Production refresh cookies use HttpOnly, Secure, SameSite=None and the `/api/session` path.

### Startup and schema verification

The production entry point is `node server/server.js`. Before listening, it authenticates to PostgreSQL, synchronizes model schema with `force: false` and `alter: false`, runs audit retention catch-up, and synchronizes role permissions unless `PERMS_SYNC_ON_BOOT=false`. Schema synchronization can create missing schema objects and indexes. Existing-column conversions require a reviewed upgrade procedure. Audit retention can delete old audit rows and update maintenance state, and the scheduler can repeat that cleanup after startup.

Verify the database identity and exercise a backup restore on a disposable target before release. Compare the schema before and after candidate initialization. Review the permission sync and audit retention settings before starting production. After startup, check `/healthz`, sign in through the deployed frontend, and verify a representative read and write.

### Protected templates

Include every file below in the backend release under `server/protected-templates/`. The authenticated download route applies the filename's permission. The Angular browser build excludes spreadsheet assets.

- `template-countries.xlsx`
- `template-regions.xlsx`
- `template-districts.xlsx`
- `template-localities.xlsx`
- `template-seniors.xlsx`

## Roadmap

The following items are potential future improvements rather than promises of currently implemented functionality:

- [ ] Email notifications and reminders for volunteers.
- [ ] Publish or expand OpenAPI/Swagger API documentation.
- [ ] Improve automated deployment and development setup where needed.
- [ ] Continue accessibility and usability refinements based on user feedback.
- [ ] Track remaining technical-debt and domain-specific enhancements in repository issues or internal project documents.

Implemented functionality such as JWT authentication, authorization, exports, pagination, and Cypress testing is described above rather than listed as unfinished work.

## Acknowledgements

Thank you to the staff and volunteers of **Starost v radost**, whose work and feedback shaped the application's requirements and day-to-day workflows.

## License and Data Usage

A public software license has **not been specified in this README**. Verify the repository's `LICENSE` file and any permissions required by the foundation before adding a license declaration or inviting external reuse. The application is not a source of public personal data.
