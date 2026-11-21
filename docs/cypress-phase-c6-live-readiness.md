# PHASE C6 — LIVE E2E READINESS & DATABASE ISOLATION

Date: 2026-11-18. Repository: `cards-sql-app`.

## Decision and scope

**Preparation complete; live execution is not yet ready or authorized.** The guarded live entry points are present, but no disposable database, database owner, physical local server, credentials, or database contents have been verified. The existing development database is not an approved reset target. Localhost, a test-looking database name, `NODE_ENV=test`, or an allowlist entry alone cannot establish disposability.

This review used source/document reads, static searches, file hashes and Git whitespace checks only. No Cypress, isolated test harness, application service, database client, reset, migration, seeder, bootstrap or external API was executed. No environment file containing private configuration was inspected. The only C6 addition is this report; existing uncommitted C1–C5 work is preserved.

The accepted historical baseline is **31/31 stub browser tests and 134/134 isolated safety tests**, from [C5 final revalidation](cypress-phase-c5-final-revalidation.md). These are not new C6 results and do not validate live selectors, PostgreSQL permissions, seeding or cleanup. That report supersedes the earlier C5 run's blocked safety acceptance; it does not establish what database the earlier watcher incident affected. This review did not investigate that incident's database or effects.

References reviewed: [original audit](cypress-e2e-audit.md), [C1](cypress-phase-c1-execution-safety.md), [C2](cypress-phase-c2-reset-fixtures.md), [C3](cypress-phase-c3-stub-auth-contracts.md), [C4](cypress-phase-c4-assertion-integrity.md), [C5 runtime findings](cypress-phase-c5-stub-runtime-validation.md), and [C5 final revalidation](cypress-phase-c5-final-revalidation.md). Source references below describe the current files, rather than assuming the original audit's line numbers or unresolved status still apply.

## Exact live collection and scenarios

`cypress/safety/policy.mjs:4–10` approves exactly five live files. The two shared files use definition-time mode conditions. Static inspection gives **11 live scenarios**, consistent with the existing registration assertions at `cypress/safety/execution-safety.test.mjs:454–461`. No collection command was run.

| File | Exact live scenario | Declaration |
| --- | --- | --- |
| `cypress/e2e/sign-in.cy.ts` | `renders and keeps submit disabled until form is valid` | 41 |
| same | `401 → shows a unified invalid-credentials message (works in both modes)` | 85 |
| `cypress/e2e/roles.cy.ts` | `renders page and can open/close Create dialog` | 166 |
| same | `LIVE: checkRoleName returns true for existing name (Coordinator)` | 501 |
| same | `LIVE: create a unique role, dialog closes and appears in list` | 541 |
| `cypress/e2e/toponyms/regions.live.cy.ts` | `loads and shows seeded region by search` | 46 |
| same | `sort toggles` | 57 |
| `cypress/e2e/toponyms/permissions.live.cy.ts` | `Viewer: UI capability checks` | 50–51, generated role case |
| same | `Admin: UI capability checks` | 50–51, generated role case |
| `cypress/e2e/toponyms/details.live.cy.ts` | `justSave keeps dialog open and switches to view` | 101 |
| same | `saveAndExit closes dialog` | 114 |

The stub-only permission file and two `.stub.cy.ts` files are excluded from live mode. Conversely, `.live.cy.ts` files are excluded from stub mode. The live Sign In file does not register its four stub-only cases; Roles does not register its seven stub-only cases. No live download, country-switch, cookie-attribute, logout, expiry or server-denied-write scenario is currently registered.

## Current infrastructure and safety status

| Boundary | Current source evidence and status |
| --- | --- |
| Explicit mode and collection | `policy.mjs:12–22`; `node.mjs:68–97`: conflicting mode flags reject, exact file list replaces broad configuration, before-run/before-spec reject unapproved specs. |
| Required browser guard | `cypress.config.ts:9–22`; `node.mjs:71–73`: the safety support file and browser test isolation are required. `cypress/support/e2e.ts:22` imports execution safety before commands. |
| Dedicated frontend | `package.json:21`; `angular.json:53–58,72–74`; `cypress/frontend/main.ts:1–13`: the E2E build approves the actual compiled non-production environment and page origin before importing application startup. Ordinary `npm start` is not a substitute. |
| Fixed origins | `policy.mjs:1–2,25–49`: frontend `http://localhost:56379`, API `http://localhost:8080`; visits reject foreign origins/API paths and helpers reject other API targets. Do not substitute another browser origin, including `127.0.0.1`. |
| Stub containment preserved | `policy.mjs:44–56`; `node.mjs:100–105`; `cypress/support/execution-safety.ts:41–86`: stub direct API requests and resets reject; unmatched browser APIs fail closed; host blocking remains exact. No guard was relaxed for live preparation. |
| Live network boundary | `policy.mjs:53–56`; `execution-safety.ts:51–55,75–85`: browser allowlist admits only the frontend/API hosts; live API requests carry the run identity. Direct helper requests recheck backend identity and do not follow redirects. This is not a machine-wide firewall for unrelated processes. |
| Explicit environment | `node.mjs:7–38`: required real-path-selected `E2E_ENV_FILE`, protected-source conflict rejection, selected dotenv path installed before lazy application/database loading. No guessed root `.env` fallback in this guarded flow. |
| Database/reset policy | `policy.mjs:59–108`: canonical local tuple, explicit port/user/database, exact nonempty JSON allowlist, explicit reset authorization, test/live mode, run ID, loaded-client/password/dialect match and no replication. Remote, system/production-named targets and competing DB selectors reject. |
| Backend identity | `node.mjs:40–57,74–105`: fixed identity URL, no redirect, five-second timeout, exact response shape/version/mode/origins/database fingerprint; checks before live configuration, specs, test hooks, helper API requests and resets. Health alone is insufficient. |
| Guarded backend | `cypress/safety/backend.mjs:6–60`: live database authorization precedes application loading; client validation precedes initialization; the wrapper binds localhost before infrastructure initialization, requires run identity on application requests, and retains real JWT/permission checks. Health and approved CORS preflight do not grant application access. |
| C2 dependency and CLI fixes | `server/scripts/reset-test-db.mjs:6–43,46–63,270–274`; `cypress/safety/cli-entry.mjs:1–12`: guarded imports do not reset; current password utility and both hashes are resolved before DB use; direct entry uses canonical Windows/Unix comparison and calls the same guarded reset. |
| C3/C4 protections | Stub-only initial page-data responses remain mode-gated (`support/e2e.ts:55–66`); ordered initial-401/refresh-success handlers remain (`support/commands.ts:75–88`). Strengthened request/no-write/sort/save assertions remain in shared specs and `_assertions.ts`. Their presence was inspected; isolated tests were not rerun in C6. |

**Important boundary:** `api:e2e` is already a database operation. `backend.mjs:52–53` invokes `server/app.js:243–284`, which authenticates and calls model `sync({ force: false, alter: false })`; missing tables can be created. Permission synchronization can also write. Starting this backend is not a harmless way to discover the database target. It requires approval and independent target verification before the first launch, not merely before `db:reset`.

## Reset, seed and account review

The existing guarded sequence is:

1. Validate selected environment and destructive authorization; install it before lazy DB/password imports.
2. Require `PASSWORD_PEPPER`, resolve `server/security/passwords.mjs`, compute both existing seed password hashes, check DB/model APIs, and validate the actual Sequelize client.
3. Authenticate, **drop `public` with CASCADE, recreate it, and force-sync all models** (`reset-test-db.mjs:51–56`). This destroys shared schema data and may remove dependent objects; treat the entire database as disposable.
4. Seed roles/permissions, Admin, Viewer and Country (`:57–60`). Individual seed transactions do not make the whole reset atomic. A later failure can leave a partially initialized database; stop rather than switch to another target or bypass checks.

| Seed | Current behavior |
| --- | --- |
| Roles | `Admin`, `Coordinator`, `User`, `Viewer` (`:71–76`). The live duplicate-role scenario's `Coordinator` expectation matches the seed. |
| Permissions | A row for each configured `OPERATIONS` entry and role; access starts false, Admin access is enabled for all entries, Viewer is enabled for `VIEW_LIMITED_USERS_LIST`, `VIEW_LIMITED_TOPONYMS_LIST`, `VIEW_TOPONYM` (`:90–128`). Coordinator/User retain the reset's default access state. Do not silently change this matrix during fixture cleanup. |
| Admin account | `superAdmin`, role Admin, synthetic names, password hashed through the current utility (`:139–174`). |
| Viewer account | `viewerUser`, role Viewer, synthetic names, password hashed through the same utility (`:177–211`). |
| Country | Russia, ID **143**, unrestricted; its sequence is advanced after the explicit insert (`:234–261`). This is an intentional existing test dependency, not permission to hardcode unrelated IDs. |

The two fixed test passwords remain in the seed and matching test setup. They are deliberately not reproduced here. They must never be reused for development/production accounts. The permission spec can override Admin credentials using `U_Admin`/`P_Admin` (`permissions.live.cy.ts:15–16`); do not pass real accounts through those overrides. Reset does not create an arbitrary overridden account.

`server/database.js:1–58` selects `DB_LINK_TEST` only for `NODE_ENV=test`, combines it with `DB_USERNAME` and `DB_PASSWORD`, and disables Sequelize SQL logging. The guarded loader pins dotenv to the selected private file. JWT access/refresh secrets are additionally required by `server/controllers/token.js:36–45`; the password utility requires its pepper. Use fresh E2E-only values for all three, even though JWT keys are not included in C1's protected-key conflict list.

Retention startup/catch-up is disabled in test mode (`server/app.js:266–280`). Rate limiting uses memory, not Redis, in test mode (`server/security/rate-limit.js:7–12,52–64`). A PostgreSQL reset therefore does not reset every kind of server state.

## Independent execution, fixture identity and cleanup

**It is not currently possible to certify every live case as independently isolated with test-owned cleanup.** All five suites reset the same schema in `before`, not before each case. Browser isolation clears browser state, not PostgreSQL, module memory or every `Cypress.env` value. Single-case setup generally exists through suite hooks, but that is weaker than proving repeatable individual execution.

| Suite/cases | Setup, owned records and cleanup | Independence assessment |
| --- | --- | --- |
| Sign In, 2 cases | Suite reset (`sign-in.cy.ts:6–10`); invalid login uses a synthetic non-seed username. No explicit domain fixture creation. Real authentication/audit/rate-limit effects can still occur. | Neither case needs a preceding successful login. In-memory limiter history survives schema resets and reruns; live 401 status itself is not intercepted/asserted, only its resulting UI message/path. |
| Roles, open/cancel and duplicate cases | Suite reset (`roles.cy.ts:35–42,120–129`), fresh UI login per case. Duplicate case relies on seeded Coordinator and rejects unexpected POST/PATCH (`:512–521`). | No intended domain writes. Existing toast selector blocks reliable duplicate-case completion. Auth server memory is shared. |
| Roles, successful creation | Timestamp name; POST and reloaded list/value/positive ID asserted (`:540–600`). | **No cleanup hook.** The asserted ID is not retained for deletion. Final case/spec failure or run completion leaves the created role and related state until a later reset. A future cleanup must identify exactly this new role; never delete Coordinator/Admin by position/name prefix. |
| Regions list, 2 cases | Suite reset; creates two real regions, captures both IDs (`regions.live.cy.ts:12–23`), suite `after` deletes only captured IDs (`:26–29`). | Read-only cases share suite-owned rows. No preceding case is required, but fixtures are not per-test and concurrent schema resets invalidate them. The search case uses a prefix/first row; both seeded names share that prefix. |
| Region details, 2 cases | Suite reset, one captured region ID with country 143, bounded suite cleanup (`details.live.cy.ts:13–22`). Before each case fetches its current name by ID (`:24–38`); saves assert that ID and persisted values after reload. | The second case does not require the first's edited name because it rereads by ID. Nevertheless, both mutate the same row and inherit the prior case's persisted state. Not a deterministic per-case starting fixture or retry baseline. |
| Live permissions, Viewer/Admin | Suite reset and real API-created region (`permissions.live.cy.ts:39–48`). | **Created ID is discarded; no cleanup.** Both cases operate on the first displayed row (`:68–70`), not the captured fixture. Currently only one region is seeded here, but ownership is not asserted. UI visibility alone does not prove backend denial. |

C2's region entity fix is intact: `_helpers.ts:51–77` yields `body.data` and rejects absent/non-positive/non-safe-integer IDs; `:80–91` deletes the supplied region ID and permits only 200/204/404 cleanup outcomes. Regions and Details retain captured-ID guards. Cleanup is not a whole-table purge. However, a hard abort can prevent any `after` hook, and a first cleanup failure can stop subsequent queued cleanup. Do not claim guaranteed cleanup from hook presence alone; recovery must remain restricted to a separately approved disposable target.

`resolveCountryId()` still chooses `list[0].id` when no ID is supplied (`_helpers.ts:33–48`); Regions and Permissions omit country ID. The current successful reset seeds exactly one country, so this is not a demonstrated wrong-country failure today. It is an implicit ordering/default dependency, particularly because the Regions UI/sort contract expects 143 (`_assertions.ts:24,31`). Prefer explicitly supplying the existing scenario's country 143 in a later approved test-only change.

API setup stores the live Admin bearer token in `Cypress.env('ACCESS_TOKEN')` (`_helpers.ts:17–29`). UI login does not replace that variable; Details rereads and region cleanup use the setup token. It is a separate, potentially expiring credential, not proof of the current browser user's identity. Do not reuse it to test Viewer denial. This is a lifetime/ownership risk, not evidence that a Viewer currently bypasses authorization.

## Prioritized findings and required fixes

Severity reflects current evidence and the proposed destructive live workflow. No new critical exploit or production write was demonstrated.

| Priority / severity | Classification | Evidence, impact and smallest safe response |
| --- | --- | --- |
| P0 / HIGH — target and least privilege unverified | Execution blocker; environmental facts intentionally unknown | C1 validates a configured tuple (`policy.mjs:59–108`), not actual ownership, data contents, privileges or the physical server behind a local port. Do not set an allowlist/reset authorization for the development DB. Independently provision/verify a separate disposable local target after separate approval; record ownership and restricted credentials before starting any application. |
| P0 / HIGH — shared reset has no run-wide lock | Confirmed destructive design; concurrency risk (E12) | Each suite invokes schema reset; `node.mjs:100–105` and `reset-test-db.mjs:46–60` do not serialize independent runners. The same run ID/allowlist does not prevent another process resetting that DB. Require exclusive serial ownership of the target, no other suites/watchers, and no shared integration-test DB. Parallel execution needs separate DB targets and separately compatible origins/ports; it is not supported by this plan. |
| P1 / HIGH — reset does not clear login limiter memory | Source-confirmed state boundary; likely full-run/retry failure, not browser-reproduced | IP limiter allows 8 attempts per 15 minutes; UA allows 10 (`rate-limit.js:118–147`). `/sign-in` consumes both (`session-api.js:124–127,157–160`) and successful login resets only the user limiter (`:384–390`). Current live hooks make 9 UI logins plus 3 setup API logins and the invalid-login attempt across the five files. Normal shared local IP/UA can exceed limits despite per-spec DB resets. `e2e:live:run` keeps one API process. Plan fresh guarded backend/Cypress runs per selected spec, serially, with a fresh common identity for each pair; verify this with isolated orchestration checks first. Do not disable production limits, spoof IPs, add sleeps or suppress 429 failures. Rerunning within the same backend is not automatically clean. |
| P1 / MEDIUM — missing owned cleanup/shared mutable fixtures | Confirmed infrastructure defects (E12) | Roles successful creation and live Permissions have no cleanup; Details shares one edited row. Capture/validate fixture IDs, use per-case setup for mutating cases, and perform bounded real-API cleanup with the right Admin identity. Keep assertions and real route operations. Never substitute a global data purge for record cleanup. |
| P1 / MEDIUM — live duplicate toast selector is stale | Confirmed selector mismatch; browser failure not rerun (E15) | `roles.cy.ts:534` expects `.p-toast-detail`; `src/app/shared/base-layout/base-layout.component.html:2–10` supplies a custom message template with `.ui-toast-warn`. C5 corrected only the stub cases. Update only this live assertion to the actual warning boundary, preserving its message/visibility expectation, and protect it with an isolated selector-contract regression. |
| P1 / MEDIUM — credential/token-bearing diagnostics | Confirmed password/response logging; artifact exposure risk (E17) | Reset logs both plaintext seeded passwords (`reset-test-db.mjs:168,206`). Password `.type()` calls and live `cy.request` calls lack explicit log suppression (`commands.ts:43–52,198–203,211–214`; `_helpers.ts:17–29,37–42,58–68,82–88`; `details.live.cy.ts:28–32`). Permissions dumps the entire response (`permissions.live.cy.ts:25–27`). Remove password/full-response logging and suppress sensitive typing/request detail while retaining nonsecret status diagnostics in a separately approved phase. Restrict artifacts; `video: false` and the current `.gitignore` are not a retention policy. Existing production logger redaction does not redact these Cypress commands or raw `console.log` strings. |
| P2 / MEDIUM — live readiness/actionability and focus | Confirmed helper/document defects; flake and false-positive risks (E13–E15) | Live login immediately fills inputs after visit (`commands.ts:210–218`), unlike C5's rendered-page wait in the stub branch (`:137–145`). `fillMatInput` compares against the runner's `document.activeElement` and forces interactions (`:43–52`). Root animation styles are injected before visits and discarded with that document (`support/e2e.ts:68–78`); moving the existing overlay/hit-testing overrides wholesale would mask defects. Add observable live page/authorization readiness, use AUT focus, scoped selectors and ordinary actions incrementally. Do not compensate with sleeps or forced clicks. |
| P2 / MEDIUM — live permission and session coverage is incomplete | Coverage risk, not a proven application authorization defect (E20) | Permission cases assert Add/Delete UI presence, use global icon/text checks, do not assert an Edit workflow or server-denied write (`permissions.live.cy.ts:54–98`). The permission response wait lacks status/body readiness assertions (`:22–27`). Add a separately scoped real Viewer-denied representative write with unchanged data and an allowed Admin comparison; add real logout/reload/rejected-refresh boundaries later. Stub 401/403 recovery assertions do not prove these live contracts. |
| P3 / LOW — implicit country/token/navigation contracts | Maintainability and future ordering risks (E12/E15) | First-country choice and separate setup token described above; `noVisit` does not suppress live visits (`commands.ts:195–218`), and callers revisit/register permission observers afterward. Clarify any helper contract before changing it; retain visible role/session ownership and meaningful test data. No generic fixture framework or production refactor is needed. |

Original-audit reconciliation: **E16 is addressed by C1**; E03/E04/E18 by C2. **E12 remains partly unresolved**, despite corrected exact-ID region cleanup and C4's owned Details selection. **E13's old live `wait(150)` calls have been removed**, and sort checks now correlate parameters/direction/row order; remaining live readiness risks are listed above. **E14 remains**, **E15 is partly addressed**, **E17 remains**, and **E20's live gaps remain** despite stronger stub coverage. Do not reopen already fixed behavior or use obsolete audit snippets as current evidence.

## Required disposable LOCAL PostgreSQL configuration

No database or role was created, selected or approved here. The following are requirements for a future separately authorized provisioning/verification task:

- Use a dedicated local PostgreSQL database, preferably a separately managed disposable local cluster/container and storage volume. It must contain no development, integration-suite, production or copied personal data. Do not use `postgres`, templates, the current development database or a tunnel/forwarder to a remote service.
- Use a dedicated login role with **no superuser, CREATEDB, CREATEROLE, replication or bypass-RLS privilege**, no membership in privileged/development/production roles, and no access to unrelated application databases. Where cluster defaults grant PUBLIC access, explicitly review/restrict effective privileges rather than assuming a newly named role is isolated.
- The role needs ownership/permissions sufficient to drop/recreate **this database's `public` schema**, create model tables/sequences/constraints and perform seed/API operations. DML grants alone do not authorize `DROP SCHEMA`. Database/schema ownership on this disposable target can be appropriate; superuser credentials are not. Inspect actual PostgreSQL version/schema ownership and effective grants before choosing the minimum privileges.
- Bind PostgreSQL only to the verified local endpoint and restrict local authentication to the intended role/database. Inspect port/container/service ownership and absence of remote forwarding. A local URL alone does not attest the server behind it.
- Keep the private E2E environment file outside the checkout with restricted access. Do not reuse root `.env`, `server/.env.test`, development credentials, production secrets, copied production data, or integration-test database configuration. Do not put passwords in URLs, CLI arguments, reports or shell history.

### Existing C1 configuration format

**Illustration only — not an approved target, not a usable credential file, and not an instruction to provision/reset anything in C6.** Replace every placeholder privately after independently verifying the target. The sample database/port/user are invented and have not been checked on this machine.

```dotenv
E2E_MODE=live
NODE_ENV=test
PORT=8080
DB_USERNAME=cards_e2e
DB_PASSWORD=<fresh-private-E2E-database-password>
DB_LINK_TEST=127.0.0.1:5433/cards_e2e_disposable
E2E_DB_ALLOWLIST='["postgresql://cards_e2e@127.0.0.1:5433/cards_e2e_disposable"]'
E2E_RESET_AUTHORIZATION='RESET postgresql://cards_e2e@127.0.0.1:5433/cards_e2e_disposable'
E2E_RUN_ID=<fresh-random-32-to-64-lowercase-hex-characters>
PASSWORD_PEPPER=<fresh-private-E2E-only-pepper>
JWT_ACCESS_SECRET=<fresh-private-E2E-only-access-secret>
JWT_REFRESH_SECRET=<different-fresh-private-E2E-only-refresh-secret>
```

Set **`E2E_ENV_FILE` in the backend and Cypress launching environments** to the absolute path of that private file. `loadEnvironment()` requires ambient `E2E_MODE=live` before reading it; the approved `api:e2e` and Cypress live scripts supply that flag. Merely writing it inside a file is insufficient for a direct caller. `DOTENV_CONFIG_PATH` must be absent or resolve to that same file; the loader installs the resolved path before DB modules can invoke dotenv. Keep the same file contents/run ID throughout a backend/Cypress pair; a new pair should use a new random run ID.

`DB_LINK_TEST` is **host:explicit-port/database**, without protocol, username, password or options. The canonical allowlist is **`postgresql://username@host:port/database`**, not the production DB module's `postgres://` connection string. The policy binds exact username, literal host spelling, port and database, so `localhost` and `127.0.0.1` entries are not interchangeable. Names must match the policy's letters/digits/underscore restrictions. No embedded password, wildcard, duplicate, alternate URL spelling, query, fragment, production-name substring or system database is accepted. Use one approved entry for this serial plan.

Keep `DATABASE_URL`, `DB_LINK`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` and `PGSERVICE` absent (prefer absence over empty variables). If `CYPRESS_USE_STUBS` is supplied it must be `0`. The scripts already supply `USE_STUBS=0` and `API_URL=http://localhost:8080`; no arbitrary Cypress URL overrides are necessary. Preserve the exact frontend/API origins. Do not alter `PERMS_SYNC_ON_BOOT`, JWT lifetimes or permission semantics to make tests pass.

### Environment isolation and backend checks

The C1 loader merges the selected file with ambient variables and rejects a protected subset of conflicts; it does **not** scrub the whole parent environment. JWT keys and unrelated runtime settings can otherwise be inherited. A future controlled launcher must clear inherited environment values and rebuild an explicit minimal trusted OS/tool-path environment, with private npm config/profile locations as in C5. Exclude production/development DB selectors, arbitrary `CYPRESS_*` overrides/record keys, preload variables (`NODE_OPTIONS`, `NODE_PATH`), other dotenv selectors/override settings, proxies, remote-service credentials and unrelated watchers. Supply backend/Cypress E2E settings intentionally; the frontend does not need database credentials or the private E2E file.

Do not spread the selected DB environment into Cypress browser `config.env`. The existing guarded code exposes the run identity there, not DB credentials. The run ID is an access capability for the wrapper, not a replacement for JWTs or database permissions; keep it out of published logs.

For the future backend/Cypress pair, `/__e2e/identity` must match version 1, live mode, the exact fixed origins and SHA-256 of the approved credential-free DB tuple, using the same run header. Redirects, another backend, changed config or a stale run must fail. `/healthz` proves readiness only. The fingerprint describes the configured tuple; it does not prove actual database ownership, emptiness, physical cluster identity or that a local listener is not a tunnel. Establish those facts independently before backend initialization.

## Safe setup and execution plan — future approval required

None of the following runtime steps or commands was executed in C6. Implementation and provisioning approval are separate from permission to execute live tests.

### Gate A — before any application/database operation

1. Approve the narrow test-infrastructure changes listed below; validate them with static and fake-dependency tests, preserve the 31 stub scenarios and C1–C5 guards. Do not start services during that implementation phase.
2. Obtain explicit approval to provision/use a **new, named disposable local target**, its dedicated role, and destruction of all of that target's schema/data. Have an operator provision it separately; no inferred approval of existing development data.
3. Record a nonsecret target tuple, local PostgreSQL service/container/port identity, intended storage ownership/lifecycle and absence of remote forwarding. Confirm it is separate from development and `test:int`. Inspect effective login-role privileges/memberships, database/schema ownership and network restrictions. Do not grant superuser to solve setup errors.
4. Before any reset, a separately authorized operator must verify actual server/database/user identity, approved contents/disposability and absence of unrelated sessions/workloads using a controlled read-only administrative procedure. Compare actual facts with the approved tuple, not just the filename or fingerprint. C6 did not make those connections or supply a populated allowlist.
5. Check running Node/npm/nodemon/backend/build watchers, process parents, scheduled startup mechanisms and listeners. No unrelated backend may own 8080 or frontend own 56379; no watcher may restart `server/server.js` after file/build changes. Stop for unknown process identity; do not terminate unrelated processes automatically. C1 does not guard ordinary `npm run server`, `dev`, `api:test` or another test runner.
6. Establish exclusive serial ownership of the disposable target for the whole batch. No concurrent Cypress runner, `test:int`, migration, seed or background application. Verify the environment file, exact one-target allowlist, matching reset authorization and fresh common run ID without printing secret values. Freeze configuration during the run.
7. In the sanitized environment, rerun `npm run test:e2e:safety`, Cypress/frontend TypeScript and relevant syntax checks. Expected historical isolated baseline is 134; changes may add focused tests. Negative checks must continue to fail before loader/connection/SQL for stub mode, missing/conflicting config, wrong target, wrong backend/run, missing reset authorization and invalid fixture IDs. Static checks do not prove real database readiness.

### Gate B — first approved live slice

1. Start only the dedicated frontend through `npm run start:e2e`, with a nonsecret sanitized environment. It must retain the compiled-environment handshake.
2. **Only after Gate A has approved database initialization**, start `npm run api:e2e` using the private selected file. This can connect, create tables and sync permissions. Monitor the owned process/listener and its network targets; a wrong identity or unexpected external connection requires stopping the owned processes immediately, not bypassing a guard.
3. Once the guarded pair is ready, run the smallest selected file, for example `npm run cypress:run:live -- --spec cypress/e2e/toponyms/regions.live.cy.ts --record false`, after its fixture/readiness fixes are approved and checked. This is two existing real-API scenarios. Their suite hook **will reset the approved DB**; do not issue an extra manual reset. Verify actual collected file, statuses, exact fixture IDs, cleanup and API origin/header behavior. Keep screenshots/logs/downloads private and synthetic.
4. Record real browser results separately from isolated results. On failure, preserve a red result and identify selector/setup/contract/timing/application cause. Do not add retries, sleeps, forced actions, success stubs or production changes to obtain green output.
5. For subsequent selected files, use a fresh guarded backend/Cypress pair and run identity, serially, so in-memory login limits do not leak from the previous spec. Do not use the current all-in-one `e2e:live:run` until its shared-backend limiter/isolation strategy is explicitly resolved and validated. Each pair still requires the same database safety gates; restarting does not itself authorize writes.
6. Verify captured-ID cleanup through the approved API and record failures without broad deletion. Authentication/audit/seed rows are expected shared infrastructure effects in this disposable DB; do not claim test-record cleanup erases all traces. A crash may require a later explicitly approved reset/reprovision of this same target.
7. Stop only processes launched for the batch, verify their listeners closed and no backend watcher survived, and review network observations. Any disposal of the database/volume is a separate approved destructive action against the verified target. Never run cleanup against development.

Existing scripts are described for planning, not endorsed as interchangeable: `api:e2e` is the guarded backend; `start:e2e` is the dedicated frontend; `cypress:run:live` selects the exact live allowlist and performs identity checks. `e2e:live:run` orchestrates all five files with one backend and currently has the limiter concern. `reset:test:db` is a destructive guarded CLI, not a readiness probe. `api:test`, `server`, `dev`, production commands and `bootstrap-admin.mjs` are outside this plan.

## Recommended smallest next implementation phase

**C7A — live fixture ownership and deferred selector/readiness corrections, test infrastructure only; no services or databases.**

Keep this a narrow, reviewable prerequisite batch:

- Capture and validate the permission suite's created region ID and scope its row checks to that entity; add bounded owned-ID cleanup.
- Retain the successful live role's ID and clean up that role through the existing HTTP delete contract; preserve duplicate checks and all save/list assertions.
- Give each mutating Details case its own explicit fixture/starting name and owned cleanup. Keep the existing ID, country, response and persisted reread assertions. Keep read-only Regions fixtures small and explicit about country 143.
- Correct the one deferred live Roles warning selector and add rendered-page/authorization readiness in the live path without changing login behavior or forcing interactions.
- Add isolated fake-HTTP/fixture/selector checks for ownership, failure cleanup and independent case setup; preserve C1–C5 regressions and all 11 live scenarios. No production model, route, schema, authentication or permission changes.

Before any later runtime approval, a separate small diagnostic-hygiene batch must remove the remaining seed password/full-response logging and suppress sensitive Cypress command detail. A separate launcher/environment batch should implement and isolate-test serial per-spec backend ownership (including fresh run identity), sanitized environment and exclusive-target policy; do not fold database provisioning or a live run into either batch. No new generic factory framework, session-cache redesign or permission-test expansion is required for C7A. Real server-denial and session coverage can follow after the execution harness is safe.

## Review inventory and C6 validation

Reviewed the five live/shared specs listed above, `toponyms/_helpers.ts` and `_assertions.ts`, support commands/root support/execution safety, Cypress config/tsconfig, `cypress/safety/{policy,node,backend,cli-entry}.mjs`, their four isolated test files and declarations, frontend entry/tsconfig, Angular E2E configuration, relevant package scripts and `.gitignore`. Read-only production references were limited to database/password/token/rate-limit configuration, initialization/permission synchronization, relevant session/role/toponym routes/models, request logging/CORS and the shared toast template. `bootstrap-admin.mjs` was not modified or executed. No private environment contents were read.

| Validation | C6 result |
| --- | --- |
| Live inventory/mode/source review | Five approved files / 11 static live scenarios. No new runtime pass claim. |
| C1–C5 guards | Required source boundaries remain present; no implementation edits. Prior C5 final: 31/31 stub browser and 134/134 isolated passes. |
| TypeScript, Node syntax, isolated tests | Not executed in this static-only phase; available future checks documented above. |
| Cypress/frontend/backend/API/PostgreSQL/reset/migration/seed/bootstrap | Not executed or contacted. No service processes started. |
| Starting-file SHA-256 comparison | All 669 starting tracked/unignored files unchanged; only this report added. Existing user changes retained. |
| `git diff --check` / report whitespace | Passed; new report also checked separately because it is untracked. |
| Commit/push | Neither performed. |

Remaining acceptance blockers are explicit disposable-target/least-privilege verification, exclusive process/database ownership, live fixture cleanup/independence, diagnostic secrecy, the known live toast/readiness issues, and a plan for limiter memory between specs. Browser selectors, native password hashing, actual seed/schema privileges, real cookies/auth hydration and persisted cleanup remain unverified until separately authorized live validation.

**PHASE C6 — LIVE E2E READINESS & DATABASE ISOLATION**

Production/source files changed: **0**. Database operations: **0**. Live execution: **not authorized or attempted**.
