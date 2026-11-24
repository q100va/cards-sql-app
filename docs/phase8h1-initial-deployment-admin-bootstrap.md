# Phase 8H-1 — Initial deployment and administrator bootstrap

Candidate baseline `5c56b53`. This procedure is for the foundation's first deployment to an empty PostgreSQL database. Business data can be loaded afterward using the application's existing JSON import workflows.

## Bootstrap audit

| Area | Finding and correction |
| --- | --- |
| Configuration | Production Sequelize uses `DATABASE_URL`, with dotenv supplying unset variables. Static imports previously evaluated the database and password modules before the production gate and error handler. The CLI now checks mode, terminal, pepper and target URL first. It displays only the host, port and database resolved by Sequelize, including a host override in the URL query. |
| Identity | The CLI trims account names. Username and first/last name limits now match the regular account forms, at 5–20 characters for the username and 1–50 for each name. Control and format characters are rejected in those fields. The login API accepts this username range. |
| Password | Kept the bootstrap's 12–256 length policy and the existing peppered Argon2id hash. The application verifies it with the same pepper and password module. Hidden input now processes batches, split UTF-8, Enter and Backspace within one raw-mode session. It handles Ctrl+C, mismatch, EOF and input errors, removes its listeners and restores the prior raw mode. |
| Permissions | The existing administrator seed matches the catalog and synchronization rules. Each catalog operation receives `access: true`. LIMITED operations are marked `disabled: true` for the role editor while the corresponding FULL choices are enabled. Server authorization checks `access`. Boot synchronization normalizes the same dependencies. |
| Atomicity | The early refusal checks users, roles and grants before prompting. The transaction acquires advisory lock `42043`, rechecks all three tables, and commits the role, grants and unrestricted user together. The lock serializes cooperating bootstrap invocations. Other writers can bypass it, so stop all backend replicas, workers and imports during bootstrap. |
| Output | Expected refusals use fixed messages. Unexpected failures print a generic message without raw Sequelize errors, SQL, hashes, configuration secrets or credentials. The CLI closes Sequelize after each attempt. |

## First deployment

1. Build the candidate in its normal build environment and make the backend and compiled shared schemas available in the backend runtime.

   ```sh
   npm ci
   npm run build:shared:once
   ```

2. Provision a dedicated PostgreSQL database and an application database login with ownership or equivalent schema-creation and object privileges. From a PostgreSQL administrative session connected to an existing maintenance database, create the database. Here `cards_app` is an example database and an already provisioned application login.

   ```sql
   CREATE DATABASE cards_app OWNER cards_app;
   ```

   Connect to that database using the intended application identity. Verify the server host and port using the foundation's configuration and the PostgreSQL connection details. Compare the database name, connected user and PostgreSQL address against the provisioning record. For container deployments, the server-side address and port may differ from the client-facing address and port. Verify that the application's schema starts empty.

   ```sql
   SELECT current_database(), current_user, inet_server_addr(), inet_server_port(), current_schema();
   SELECT schemaname, tablename FROM pg_tables WHERE schemaname = current_schema();
   ```

3. Provide these variables to the backend runtime through its environment or an explicitly selected dotenv file. Keep its configuration and secret storage access controlled.

   | Variable | Purpose |
   | --- | --- |
   | `NODE_ENV` | Set to `production` for startup and bootstrap. |
   | `DATABASE_URL` | PostgreSQL connection URI for the verified application database, including the access and TLS configuration appropriate to the foundation's network. |
   | `PASSWORD_PEPPER` | Stable secret shared by bootstrap and every backend instance. Keep it available for restoration. |
   | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Independent secrets for issuing and verifying session tokens. |
   | `PERMS_SYNC_ON_BOOT` | Leave unset for default synchronization or explicitly enable it. The literal value `false` skips synchronization. |
   | `PORT`, `ALLOWED_ORIGINS` | Configure the backend listener and allowed browser origins as required by the deployment. The listener defaults to 8080. |
   | `REDIS_URL` | Optional production rate-limit store. When omitted, the backend uses an in-memory limiter. |
   | `DOTENV_CONFIG_PATH` | Optional path to the intended dotenv file if needed. Already injected environment variables take precedence. |

4. Start one backend instance with external access held back and use the normal entry point.

   ```sh
   node server/server.js
   ```

   Wait for `All models synced`, `[permissions] synchronized on boot` and `Application started`, then check that `GET /healthz` returns 200. Startup creates tables using Sequelize with `force: false` and `alter: false`, then synchronizes roles. In the initial database there are zero roles, so this synchronization creates zero grants and needs no special toggle. Verify zero rows in `users`, `roles` and `"role-permissions"`. Stop the backend instance before running bootstrap and keep other writers stopped.

5. From the application directory, open a real interactive terminal in the backend runtime, with the verified production environment and both input and output attached to the terminal. Use the same database URL and pepper as startup. Disable terminal recording and avoid passing passwords in shell arguments or through pipes.

   ```sh
   node server/scripts/bootstrap-admin.mjs
   ```

   Compare the CLI's `Target database` line with the verified host, port and database before confirming. Enter the administrator's username and names, type `CREATE ADMIN`, then enter and repeat the password at the hidden prompts. Expect `Administrator created.` and exit status 0. A repeat run should refuse before prompting, with exit status 1. Ctrl+C cancels interactive entry.

6. Restart the backend normally with permission synchronization enabled and verify health. Sign in through the application over its deployed HTTPS connection using the new administrator. For an API check through a trusted client, submit the credentials to `POST /api/session/sign-in` without printing the body or token, then use the returned bearer token to check `GET /api/auth/permissions`, `GET /api/roles/get-roles` and `GET /api/users/check-user-name?userName=<admin-username>`. Expect HTTP 200, the Administrator role, and access for all catalog operations. Compare LIMITED editor flags as described above.

7. Take a verified initial backup after bootstrap and before business data imports. Use `pg_dump` against the verified database with securely supplied connection settings.

   ```sh
   pg_dump --format=custom --file=cards-initial.dump
   pg_restore --list cards-initial.dump
   ```

   Store the dump securely and test restoration to a separate database. Keep the deployment secrets, especially the password pepper, in the foundation's secret store with its normal backup and restoration controls.

## Recovering from failure

Keep traffic and other writers stopped. Verify the target and inspect the backend startup result and the three bootstrap table counts. With a partial schema and all three tables empty, correct the startup issue and run the normal backend entry point again. After successful startup, stop it and retry bootstrap. A failed transaction during bootstrap rolls back the role, grants and user together. Cancellation and input validation occur before writes.

If any of the three tables contains rows, keep the bootstrap refusal in place. Verify whether the administrator already exists and can sign in. If the state is unexpected, inspect it before making changes. For a confirmed disposable, never-used deployment database, provision a new empty database and repeat the documented sequence. For a database containing data, use the foundation's approved backup and recovery process. If the client disconnects near commit, establish the actual database state before retrying.

## Verification commands

From the repository root on Windows, with Node and PostgreSQL 16 installed:

```powershell
node --test server/tests/bootstrap/password.test.mjs
node server/tests/bootstrap/deployment.mjs 'C:\Program Files\PostgreSQL\16\bin'
npm run test:unit
npm run test:int
git diff --check
```

The deployment test creates a private temporary cluster, binds it to loopback, and verifies the connected address, port, database name and exact owned data directory before application writes. It supplies only generated test secrets and uses a terminal-stream shim for deterministic CLI interaction. The test checks real child process exits, the real PostgreSQL transaction and the running HTTP backend. The raw-mode and pause checks exercise the Node stream contract through the shim.

## Verification results

| Check | Result |
| --- | --- |
| Disposable PostgreSQL identity | Verified PostgreSQL 16 on `127.0.0.1:55047/test_phase8h1_67b3c3432f`. The server-reported data directory resolved to the test's owned `cards-8h1-gbUqmq/data` directory. No application tables existed before startup. The cluster was stopped and removed after the run. |
| Schema and startup order | Actual backend startup created 41 public tables and returned HTTP 200 from `/healthz`. Boot synchronization ran with zero roles. Users, roles and grants remained empty until bootstrap. |
| Bootstrap and authentication | Exactly one unrestricted user and one Administrator role were created. The stored password passed the application's Argon2id verifier with the correct password and failed with a different one. The real sign-in endpoint returned HTTP 200 and the Administrator role. |
| Effective permissions | The permission endpoint returned all 95 catalog operations with access enabled. All 11 LIMITED rows carried the expected editor flag. The authenticated administrator received HTTP 200 on both protected verification routes, which returned HTTP 401 without authentication. Startup synchronization preserved the committed user, role and permission rows. |
| Negative and repeat cases | Nonproduction and redirected-input runs refused. Confirmation cancellation, Ctrl+C, invalid username and password mismatch created zero records. Existing user, role and grant cases each refused independently. Repeat bootstrap preserved the existing rows and displayed the actual loopback host from the URL query override. |
| Forced rollback and concurrency | An insert trigger forced account creation to fail after the role and grants were inserted inside the transaction. All three tables remained empty. Two independent CLI processes reached the advisory lock concurrently. One committed and the other refused at the locked emptiness check. |
| Terminal and secret handling | 11 focused checks passed. Native Windows terminal smoke checks confirmed pasted entry with Backspace, Ctrl+C and prior raw-mode restoration. Bootstrap output checks found no generated credentials, JWT secrets, pepper or Argon2id hash markers. The forced-error test used terse PostgreSQL logging without error statements. |
| Backend unit regression | 400/400 passed, including password, session, authorization and permission synchronization tests. |
| Backend integration regression | 217/217 passed in the dedicated loopback integration database, separate from the bootstrap database. |
| Whitespace | `git diff --check` passed. The untracked deliverables also passed individual whitespace checks. |

Frontend and shared application code were outside this change. Phase 8's frontend, TypeScript and production build baselines did not need reruns.

No remaining Phase 8H-1 blockers were found. Foundation deployment remains a separate operation.
