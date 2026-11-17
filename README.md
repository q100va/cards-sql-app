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

**Test commands listed in the existing project documentation:**

```bash
npm run test:server
npm test
```

> Check the current `package.json` scripts and test runner configuration before running these commands; scripts can change as the project evolves.

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

2. Configure the backend environment using the actual environment-variable names supported by the project. For example:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/cards
   ```

   These values are examples, **not production credentials**. Keep all local `.env` files out of version control. Configure the frontend API endpoint through the Angular configuration used by this project; do not expose secrets in the frontend bundle.

3. Start the application using the scripts defined in `package.json`. The previous README listed:

   ```bash
   npm run build:shared
   npm run server
   npm run start
   ```

   Verify that these scripts and any required database migration commands match the current repository before using them.

## Deployment

The project has used **Render** for the backend and **Neon PostgreSQL** for hosted data; the frontend also has **Vercel preview deployments**. Public access details are intentionally omitted here.

Production deployments should use appropriate secrets management, restricted CORS configuration, database migrations, and monitoring. Do not publish credentials or personal data as part of deployment documentation.

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
