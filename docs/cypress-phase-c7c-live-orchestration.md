# PHASE C7C — SAFE LIVE E2E ORCHESTRATION

Date: 2026-11-18. References: [C6 readiness](cypress-phase-c6-live-readiness.md), [C7A fixtures](cypress-phase-c7a-live-fixtures.md), [C7B diagnostics](cypress-phase-c7b-diagnostic-security.md).

## Result and limits of this phase

Implemented a separately opted-in, serial live runner with exclusive locking, fresh guarded backends/run identities, private environments/artifacts, local PostgreSQL listener and read-only ownership checks, process-tree containment and fail-closed cleanup.

**188/188 isolated tests passed: 161 existing C1–C7B tests plus 27 C7C tests.** Cypress/config and dedicated frontend TypeScript checks passed. Four Node modules and the PowerShell helper passed syntax checks; the C# Job Object declarations compiled in memory without invoking their native lifecycle methods. All **39 original distinct E2E scenarios** remain represented, including **31 stub and 11 live registrations**. Existing E2E files/assertions were not edited.

**No real runner, Cypress E2E, frontend/backend service, PostgreSQL connection, reset, schema operation, seed, migration or bootstrap was executed.** Process/listener inventory during this task was read-only and did not investigate a database. Synthetic temporary environment files were used only by isolated tests. No real private environment/approval file was read or created. No database was provisioned or selected; no commit/push was performed.

This completes implementation and isolated validation, **not live readiness acceptance**. Native Job Object/process-adapter behavior, browser compatibility and real database prerequisites still require separate verification/approval. Compilation and fake lifecycle tests are not claims that an actual Windows process tree or live Cypress run was exercised.

## Exact implementation changes

Only `package.json` was modified among the **674 starting tracked/unignored files**. Six safety files and this report were added. Earlier uncommitted C1–C7B work remains untouched.

| File | Responsibility |
| --- | --- |
| `package.json` | Add `e2e:live:serial`: `node cypress/safety/live-runner.mjs`. Every existing script retains its starting value. |
| `cypress/safety/live-runner.mjs` — new | Inert-import CLI and dependency-injected serial workflow; explicit opt-in; fixed spec order; fresh identity/pair; failure/cancellation cleanup; no continuation after uncertain owned exit. |
| `cypress/safety/live-runner-policy.mjs` — new | C1 configuration validation plus strict operator evidence, inherited-setting rejection, native DB listener/catalog checks, process/port ownership and loopback policies. |
| `cypress/safety/live-runtime.mjs` — new | Windows adapter: private files/profiles, sanitized child environments, exclusive lock helper, native Job Object control, real future read-only catalog check, bounded readiness/monitoring, C1 identity verification and private diagnostics. |
| `cypress/safety/live-windows.ps1` — new | Read-only OS inventory/ACL checks, private artifact directory creation, machine-wide named mutex and owned-job control protocol. Does not invoke ordinary development startup. |
| `cypress/safety/live-process-job.cs` — new | Windows Job Object containment; child created suspended, assigned before resume; kill-on-close with no breakaway; membership/empty-job verification; termination only through owned handles. |
| `cypress/safety/live-runner.test.mjs` — new | 27 isolated checks using fake processes, locks, listeners, approvals, HTTP responses and PostgreSQL clients; synthetic dotenv fixtures and static native ownership checks. |
| `docs/cypress-phase-c7c-live-orchestration.md` — new | Usage, operator requirements, validation and limitations. |

No production application/password/schema files, reset/bootstrap code, E2E specs, fixture data, support commands, C1 guards, Cypress/Angular configuration, dependencies or existing isolated tests changed. `server/scripts/bootstrap-admin.mjs` was not modified or executed.

## Exactly what the runner does

The runner takes no spec override and executes the existing `SPECS.live` order:

| Order | Approved file | Existing live scenarios |
| --- | --- | --- |
| 1 | `cypress/e2e/sign-in.cy.ts` | 2 |
| 2 | `cypress/e2e/roles.cy.ts` | 3 |
| 3 | `cypress/e2e/toponyms/regions.live.cy.ts` | 2 |
| 4 | `cypress/e2e/toponyms/permissions.live.cy.ts` | 2 |
| 5 | `cypress/e2e/toponyms/details.live.cy.ts` | 2 |
| Total | Five files | **11** |

1. Reject missing opt-in or extra CLI arguments before loading the real adapter.
2. Validate external private files, inherited settings, exact C1 target/reset authorization, fresh operator evidence, installed binaries and unchanged approved startup definitions.
3. Acquire the Windows machine-wide `Global\CardsSqlAppLiveE2ESerialV1` mutex without waiting/takeover. Concurrent new runners fail before database access or application startup.
4. Inspect processes/ports and prove that the DB listener is the approved native local PostgreSQL process. Then perform the separately authorized read-only catalog/role verification and close that client.
5. Start one dedicated E2E frontend in an owned Job Object. Its environment contains no DB credentials. Wait for the owned local frontend; C1's compiled-environment browser handshake remains required.
6. For each approved file: generate a fresh 64-character random run ID; create a private per-spec dotenv snapshot; start a **new** guarded backend; check ownership/readiness and exact C1 backend identity; start one Cypress CLI process tree selecting only that file.
7. Monitor process ownership/configuration and Cypress termination. A nonzero result, backend/frontend disappearance, identity mismatch, unexpected process, unsafe binding or cancellation stops the workflow.
8. Verify Cypress job/helper exit, stop the backend job/helper, and verify port 8080 is free **before another pair can start**. No backend memory is reused between files.
9. After the final file, recheck safety, stop the owned frontend, verify every owned job is empty/exited and release/verify the mutex helper exit. Console summaries contain only approved spec names and generic outcome messages.

The adapter starts the exact guarded `api:e2e` entry (`node cypress/safety/backend.mjs`) with explicit live configuration. Frontend arguments match `start:e2e`; those two script definitions are checked before startup. It invokes their known Node entry points directly to avoid npm shell/process-tree/lifecycle ambiguity. Cypress uses the installed CLI with fixed live flags, exact `--spec`, `--record false` and private artifact paths. It does not invoke `api:test`, `server`, `dev`, reset CLI or bootstrap commands.

**Opting in is destructive authorization, not a dry run.** A future execution opens a real read-only PostgreSQL connection, starts backend initialization that can sync tables/permissions, and runs five suites whose existing hooks reset the approved schema. Do not use the authorized runner as a harmless readiness probe.

## Required approvals and configuration

No example below approves an existing target. All placeholders must be replaced privately **after independent provisioning and verification**. Never mark the development/integration database disposable merely to satisfy the launcher.

Three independent gates are required:

1. CLI argument exactly `--authorize-live`.
2. C1's selected private environment with a one-target exact allowlist and matching `RESET <target>` authorization.
3. A separate private operator JSON record, verified within the preceding 24 hours, bound to that same tuple and explicitly authorizing all five files.

### Supported first adapter

This implementation supports **Windows with native local PostgreSQL**, a numeric `127.0.0.1` database target, and the unchanged C1 application origins `http://localhost:56379` / `http://localhost:8080`. The application hostname must resolve only to loopback. The DB port must differ from both application ports.

The PostgreSQL port must bind only to loopback, with readable creation/executable metadata for its `postgres.exe` owner, matching the canonical installed executable named by the operator. SSH tunnels, Docker/WSL proxies, remote/UNC paths, ambiguous process metadata, Unix and other ownership arrangements fail closed. Supporting another platform/container topology requires a separately reviewed ownership adapter; C1's broader legacy local-host support was not weakened or silently redefined.

### Private environment file

Set `E2E_ENV_FILE` to a canonical local file outside the checkout, with a private containing directory. Only these file keys are accepted:

```text
E2E_MODE, NODE_ENV, PORT,
DB_USERNAME, DB_PASSWORD, DB_LINK_TEST,
E2E_DB_ALLOWLIST, E2E_RESET_AUTHORIZATION, E2E_RUN_ID,
PASSWORD_PEPPER, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

Requirements:

- `E2E_MODE=live`, `NODE_ENV=test`; `PORT`, if present, is 8080.
- `DB_LINK_TEST` is `127.0.0.1:<explicit-port>/<approved-database>`; the C1 URL format is `postgresql://<role>@127.0.0.1:<port>/<database>`, without a password/options.
- Exactly one canonical C1 allowlist entry and exact corresponding reset authorization. All existing C1 restrictions on names, targets, competing selectors and loaded clients remain.
- Four distinct, fresh E2E-only secrets, each at least 32 characters: DB password, password pepper, access secret, refresh secret. Generate/store them privately; do not reuse production values or print them into shell history. Existing synthetic **application seed passwords remain unchanged**.
- Source `E2E_RUN_ID` is optional; if present it must meet C1's format. The runner supplies a fresh identity per file through a private snapshot. Original dotenv quoting is copied; the resulting fresh ID, target and source values are revalidated before use.

Do not use root `.env`, `server/.env.test`, a mixed development/production file, or an integration-test target. The source file stays unchanged. Per-spec selected paths are installed through C1 before database/app modules load.

### Private operator record

Set `E2E_LIVE_APPROVAL_FILE` to a separate private JSON file outside the checkout. Format illustration only:

```json
{
  "version": 1,
  "target": "postgresql://cards_e2e@127.0.0.1:5433/cards_e2e_disposable",
  "authorization": "EXECUTE FIVE LIVE SPECS postgresql://cards_e2e@127.0.0.1:5433/cards_e2e_disposable",
  "verifiedAt": "<actual recent ISO timestamp after independent verification>",
  "cypressBinary": "C:\\Users\\<operator>\\AppData\\Local\\Cypress\\Cache\\<installed-version>\\Cypress\\Cypress.exe",
  "server": {
    "address": "127.0.0.1",
    "port": 5433,
    "executable": "C:\\Program Files\\PostgreSQL\\<version>\\bin\\postgres.exe"
  },
  "confirmations": {
    "disposable": true,
    "separateDevelopment": true,
    "separateIntegration": true,
    "lowPrivilege": true,
    "exclusiveUse": true,
    "localServerVerified": true,
    "loopbackEgressOnly": true,
    "watchersAndAutomationReviewed": true,
    "syntheticDataOnly": true
  }
}
```

These confirmations are **operator attestations, not automatically observed facts or a cryptographic certificate**. They must follow real independent verification of the local service/port/data directory, disposable contents, permissions, isolation, absence of other workloads/watchers/automation and network containment. Do not auto-generate affirmative flags to bypass the prerequisite review. The runner additionally checks listener ownership and actual catalog privileges, but cannot infer that existing data is safe to destroy.

The cached Cypress executable must already exist outside the checkout and match the installed package version. No dependency upgrade/install is part of the runner. Input files/directories require private Windows ACLs with only the current account, SYSTEM and/or Administrators allowed; artifacts created by the runner grant current-account/SYSTEM access. Canonical local paths and readable OS metadata are required.

### Future usage — not executed in C7C

From a trusted, clean shell and frozen checkout, after separate runtime authorization:

```powershell
$env:E2E_ENV_FILE = 'C:\Private\cards-e2e\approved.env'
$env:E2E_LIVE_APPROVAL_FILE = 'C:\Private\cards-e2e\approval.json'
npm run e2e:live:serial -- --authorize-live
```

Direct `node cypress/safety/live-runner.mjs --authorize-live` is equivalent and avoids an initial npm configuration/lifecycle layer. Never place secrets on either command line. Running the new alias without the exact opt-in refuses before dispatching the real adapter; `--spec` and other extra arguments are rejected. **No existing command was redirected to this destructive workflow.** The older all-in-one live orchestration still shares one backend and should not be used for the serial plan.

## Database checks before backend initialization

After authorization, lock and OS inventory, the future adapter lazily loads the existing `pg` dependency with explicit numeric local connection fields, no SSL/remote options and bounded connection/query timeouts. It issues `BEGIN READ ONLY`, one catalog `SELECT`, `ROLLBACK`, then closes the client on success/failure. No provisioning/reset/DDL is performed by this preflight.

It checks actual database/login/DB owner, local server address/port, public-schema ownership, and rejects superuser, CREATEDB, CREATEROLE, replication, bypass-RLS, other role memberships (except the database-owner pseudo-role), ownership of any other database, and CONNECT access to other non-template application databases. CONNECT to the maintenance `postgres` database is excluded from the latter test; ownership is not. The operator must verify it is a maintenance database without application data. Public schema may be absent or owned by the login/`pg_database_owner`.

The account must own only the approved disposable database/schema and have the DDL/DML rights required by the existing reset. Do not grant superuser to fix a failure. Default PUBLIC CONNECT grants on another application DB will cause rejection; prefer a separately provisioned native disposable cluster rather than changing development/integration grants casually.

The checks do not prove empty/disposable contents, identify real PII or independently establish physical cluster provenance. Those remain explicit operator responsibilities. Native listener verification prevents accepting a local SSH/Docker proxy as PostgreSQL merely because its port is localhost; it does not replace provisioning evidence.

## Environment and network boundaries

Children receive a constructed OS/tool-path environment and fresh private profiles/npm config files, not a spread of the parent environment. Common inherited DB/PG/JWT/pepper/cloud/Cypress/dotenv/proxy/preload settings and E2E target/authorization overrides reject. Runner debugger/preload flags also reject. Only selected private file paths/mode are supplied to backend/Cypress; C1 loads the secrets in Node. The frontend has no DB secrets. Secrets are not placed in Cypress browser `config.env`; C1 still exposes only its required run identity there.

The initial Node/npm executable and shell must themselves be trusted/clean: a script cannot undo hostile code loaded before its first instruction. The child whitelist prevents parent production settings from being propagated; it is not a machine-wide secret scanner.

C1 host/API/visit controls, redirects disabled on identity/helper requests, required support/test isolation, compiled frontend handshake and exact backend fingerprint/run-header checks remain. The runner validates backend identity before starting each Cypress job, and C1 continues checking within each spec/test/request/reset.

**Loopback-only egress must be independently enforced and attested before runtime**—for example, an appropriately isolated offline local Windows environment with already installed dependencies/binaries and local PostgreSQL. The runner does not change firewall rules or enable networking. Its TCP snapshot monitor detects non-loopback connections from controlled PIDs, but observation after a connection attempt is not prevention and does not cover every UDP/native transport. Browser `blockHosts` is not a firewall for Cypress/Node/Electron or unrelated processes. No claim of complete network containment is based solely on the operator JSON flag.

## Ownership, locking and cleanup

Windows Job Objects contain each frontend/backend/Cypress tree. `CreateProcessW` uses suspended/no-window flags, assigns the process to a non-breakaway kill-on-close job, then resumes it. Private child stdout/stderr goes to files. The helper reports contained PIDs, exit code and verified empty membership through a narrow control channel; parent code never calls `taskkill`, kills by discovered PID, or terminates unrelated processes.

Native helper/child handle identity avoids PID-reuse-based termination. The runner inspects Node/project shell/watch commands and application listener ownership before startup and during readiness/Cypress waiting. Unexpected nodemon/watch mode, project processes, missing Node identity, wrong port owner or non-loopback application binding abort. Existing unrelated tool hosts are left alone. Read-only inspector PIDs and owned job/mutex helper PIDs are distinguished explicitly.

Process names/command lines cannot reveal every arbitrary watcher script or scheduled startup mechanism. The operator's independent watcher/service/task review and exclusive maintenance window remain mandatory. A process that cannot be classified safely is a blocker, not permission to kill it.

Cleanup runs in reverse order and attempts every owned child even after one failure. Success requires empty kernel jobs and clean helper exits. Backend port 8080 must be free before the next pair. Foreign listeners are not mistaken for owned children or terminated as cleanup. Application checks are revalidated before final frontend shutdown.

If owned exit cannot be verified, continuation stops, the exclusive lock is not released by the workflow, and `UNSAFE-REQUIRES-OPERATOR-REVIEW` is written in the private per-user base. A failed runner may remain alive holding its lock until reviewed. There is no automatic stale-lock takeover, PID killing or marker removal. Independently verify all owned processes/listeners have exited before any later manual remediation; do not remove a marker just to obtain a green run. Named mutex ownership also rejects parallel runners across checkouts/users on this Windows host; access-denied/abandoned acquisition fails closed.

The mutex coordinates this new runner, **not non-cooperating legacy commands, other test systems or arbitrary database clients**. The account/target must remain exclusively reserved and private. The launcher cannot guarantee host stability against privileged users starting processes between observations.

**Hard crashes cannot guarantee database fixture cleanup.** Closing jobs/parent pipes helps contain processes, but cannot undo committed route writes, an interrupted non-atomic seed/reset or a fixture whose ID was never captured. C7A bounded cleanup remains; recovery/reset/reprovision requires separate target-specific approval.

## Private diagnostics and artifacts

The adapter creates an ACL-restricted per-user directory under `AppData\Local\CardsSqlLiveE2E`, outside the checkout, with a fresh batch subdirectory, private profiles, empty npm configs and per-spec logs/artifact directories. Env snapshots and control JSON stay there; run IDs/secrets are not printed in public summaries. Child logs may contain third-party failure/network details and must remain private. C7B typing/request/wait suppression and artifact Git exclusions are unchanged; screenshots were not disabled.

Apply C7B's restricted-access and maximum seven-day recommended retention, deleting sooner after diagnosis. No retention/deletion daemon was introduced; snapshots/profiles can remain after failure and contain sensitive material. Do not publish raw child logs, screenshots, downloaded data, browser configuration or network captures. Only synthetic application data/accounts are authorized.

## Isolated validation

| Required boundary | Evidence from new tests |
| --- | --- |
| Exact serial order and fresh backend/ID | All five approved filenames in order; five distinct IDs; prior backend exit/port-free proof precedes next pair; one owned frontend. |
| Explicit opt-in and configuration | Missing opt-in/extra args reject before adapter work; missing/conflicting reset/allowlist/mode, parent overrides, remote targets and weak/reused secrets reject. |
| Operator verification | Missing/stale/wrong-target evidence or any false required confirmation rejects. Numeric DB loopback and loopback-only application DNS enforced. |
| Unexpected watchers/processes/ports | Fake nodemon, watch mode, ordinary/guarded backend, project shell, unreadable Node metadata, wrong listener owners and remote bindings reject. |
| Native PostgreSQL listener | Fake SSH/Docker proxy, wrong executable, missing process metadata, external binding or missing listener rejects before database use. |
| Database ownership and privileges | Fake catalog owner/server mismatch, elevated flags, memberships and unrelated DB access reject; only read-only SQL/rollback/close observed on fake clients. |
| Identity/startup failures | Wrong backend identity, frontend/backend start failure and initialization failure close owned children and start no further spec. |
| Cypress/early exit/cancellation | Nonzero Cypress, unexpected backend exit and cancellation stop the sequence and clean only owned handles. |
| Unstoppable backend | Blocks continuation, attempts remaining cleanup and retains lock for review. |
| Parallel execution | A second fake runner cannot acquire the same lock and starts no child. |
| Secrets/snapshots | Synthetic dotenv files keep exact approved values, replace identity per pair, and do not put DB/JWT secrets into child environment objects. Whitelisted child environments contain no inherited service selectors. |
| Readiness/native ownership structure | Fake readiness checks require ownership first, fixed local URLs, no redirects and bounded 503 polling. Static checks require suspended assignment before resume and owned-handle termination; native methods not invoked. |

| Check | Result |
| --- | --- |
| Starting complete isolated suite | **161 passed, 0 failed, 0 skipped.** |
| Final complete isolated suite | **188 passed, 0 failed, 0 skipped, 0 cancelled**: existing 161 + 27 new. |
| Scenario/assertion preservation | **39 distinct / 31 stub / 11 live registrations**; all original E2E source files retain their starting hashes. |
| Cypress/config TypeScript | `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` — passed. |
| E2E frontend TypeScript | `node node_modules/typescript/bin/tsc -p cypress/frontend/tsconfig.json --noEmit` — passed. |
| Node syntax | `node --check` on four new `.mjs` modules — passed. |
| PowerShell/C# static validation | PowerShell parser passed; `Add-Type` compiled C# declarations without constructing a job or invoking process lifecycle methods. |
| Whitespace/scope | `git diff --check` plus explicit new-file whitespace/encoding checks passed. Only the listed package-script addition and seven new files. |
| Real runtime | **Not executed:** runner/native lifecycle, Cypress, services, PostgreSQL, resets/schema/seed/migration/bootstrap. |

Executed commands were isolated Node tests (including a diagnostic dot-reporter run), the two no-emit TypeScript checks, Node syntax checks, PowerShell parsing/C# declaration compilation, Git/hash/source inspection and read-only Node/application-listener inventory. Only existing Codex Node tool hosts were found at preflight; no application listener was present. No unrelated process was stopped. A credit-related automatic-review failure prevented two checks from executing; after the user added credits, the checks were rerun successfully without bypassing approval.

## Exact prerequisites for the first real live run

1. Obtain separate authorization for actual native process-adapter validation using harmless offline child processes. Verify job assignment/descendant containment, shutdown/parent-EOF handling, global mutex and ACL behavior on the intended Windows host. No real native lifecycle was demonstrated in C7C; do not relax containment if nested jobs/Electron compatibility fails.
2. Independently provision and approve a **new disposable native local PostgreSQL cluster/database** and dedicated login. Verify service/port/executable/data-directory identity, loopback-only binding, ownership, minimum required schema rights, no elevated memberships and no unrelated application DB access. No development/integration data is disposable by assumption. Provisioning remains outside this phase.
3. Verify synthetic-only contents, absence of other DB clients/workloads, no nodemon/backend/file watchers or scheduled restarts, free 8080/56379 and readable process/listener metadata. Reserve the target/host exclusively for the batch.
4. Enforce and verify loopback-only egress outside this script. Install/cache matching trusted Cypress/Node/Angular dependencies beforehand; freeze source/cache/configuration and do not run development/integration commands concurrently.
5. Store fresh private secrets/environment and the recent independently verified operator record outside the checkout. Confirm the exact C1 allowlist/reset authorization and full five-spec destructive scope without printing secret values. Run static/isolated checks in a clean environment first.
6. Approve one actual serial run explicitly. Review each private browser result, collection/counts, network observations, exit/cleanup proof and remaining fixture state. The runner's public exit/spec summaries are not a substitute for actual browser results or proof of database cleanup.

No automatic continuation to those steps is authorized. No C1–C7B guard, rate limiter, authentication behavior, fixture semantics, schema or production bootstrap was weakened to make execution possible.

**PHASE C7C — SAFE LIVE E2E ORCHESTRATION**

Production application files changed: **0**. Real service/database execution in C7C: **0**. Commits/pushes: **0**.
