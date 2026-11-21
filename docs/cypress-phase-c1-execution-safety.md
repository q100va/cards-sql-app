# PHASE C1 — CYPRESS EXECUTION SAFETY

Date: 2026-11-17. Scope: audit findings **E01, E02, and E16 only**.

## Executive summary

Cypress now uses explicit, mutually separated stub/live spec lists and mode-specific case registration. Stub mode rejects database reset and direct HTTP fixture requests. A proxy host deny policy prevents an unhandled or continued stub request from reaching even the local backend; an unhandled API fallback fails the test instead of fabricating success.

Live configuration requires an explicitly selected environment file, an exact disposable-database allowlist, target-specific reset authorization, and a per-run identity. Unsafe configurations are rejected before database imports/connections. A dedicated E2E backend wrapper attests its approved target, and an E2E-only Angular entry verifies the actual compiled frontend environment before loading application bootstrap code. Normal application routes, authentication, authorization, models, and schemas were not changed.

**Verified:** 53/53 isolated safety tests passed; Cypress/config, E2E frontend, and production TypeScript checks passed; Angular E2E configuration schemas and no-emit template compilation passed; syntax and diff checks passed. All 39 distinct existing E2E cases and their meaningful assertions remain represented.

**Not verified or executed:** Cypress E2E runs, real frontend/backend startup, live HTTP requests, database connections, reset, migration, and persisted data operations. No disposable database was assumed or approved on the user's behalf. Live execution remains deliberately blocked without the required configuration. Existing E03/E18 reset defects remain deferred and are additional reasons not to execute a live reset yet.

## Exact files changed

| Existing file modified | C1 reason |
| --- | --- |
| `cypress.config.ts` | Delegate final collection and guarded Node events/tasks to the safety module; remove the active unconditional reset task. |
| `package.json` | Explicit mode scripts, guarded E2E backend entry, E2E-only frontend configuration, static safety-test command; stop dotenv preloading before reset validation. |
| `angular.json` | Add an E2E-only application/serve configuration and entry. Existing production/development settings and defaults are unchanged. |
| `cypress/tsconfig.json` | Include the root Cypress config in static checking; check the E2E application entry through its separate application TypeScript project. |
| `cypress/support/e2e.ts` | Load execution safety before the existing commands/hooks. |
| `cypress/e2e/roles.cy.ts` | Register shared cases in both modes, stub cases only in stub mode, and live cases only in live mode. |
| `cypress/e2e/sign-in.cy.ts` | Register the existing stub-only cases only in stub mode, preserving the common cases. |
| `server/scripts/reset-test-db.mjs` | Validate module entry and each reset before lazy database/model loading; check the loaded client before authentication/destruction. |

| New file | Purpose |
| --- | --- |
| `cypress/safety/policy.mjs` | Mode/spec/origin policies, proxy block policy, exact database approval/authorization and loaded-client validation. |
| `cypress/safety/policy.d.mts` | Types for the shared policy. |
| `cypress/safety/node.mjs` | Deterministic environment loading, source-conflict checks, backend identity verification, guarded database pipeline, Cypress Node integration. |
| `cypress/safety/node.d.mts` | Types for Node-side configuration integration. |
| `cypress/safety/backend.mjs` | Test-only backend wrapper with identity/readiness endpoints and a per-run request gate; delegates approved requests to the real application. |
| `cypress/safety/execution-safety.test.mjs` | Isolated policy, registration, environment, frontend, backend, and pre-connection rejection tests. |
| `cypress/support/execution-safety.ts` | Browser/command guards, actual compiled-environment handshake, API origin validation, unhandled-stub rejection. |
| `cypress/frontend/main.ts` | E2E-only bootstrap entry; approves the compiled environment before importing the existing `src/main.ts`. |
| `cypress/frontend/tsconfig.json` | Separate E2E application entry compilation. |
| `docs/cypress-phase-c1-execution-safety.md` | This report. |

Total: **8 existing files modified, 10 files added**, including this report. The pre-existing untracked `docs/cypress-e2e-audit.md` and `server/scripts/bootstrap-admin.mjs` were left untouched. No fixtures, lockfiles, production application source, routes, model/schema definitions, or production/development Angular configurations were edited. Existing disabled support/config alternatives were not cleaned up.

## E01 — explicit collection and case registration

The exact file lists live in `cypress/safety/policy.mjs`. `setupNodeEvents` replaces broad incoming collection settings with these lists, clears collection exclusions, and installs an independent spec check. `before:run`, `before:spec`, and browser support reject a file outside the selected list. Interactive Node events are explicitly enabled so the Node spec check also applies to `cypress open`.

| Stub mode: 5 files | Live mode: 5 files |
| --- | --- |
| `cypress/e2e/sign-in.cy.ts` | `cypress/e2e/sign-in.cy.ts` |
| `cypress/e2e/roles.cy.ts` | `cypress/e2e/roles.cy.ts` |
| `cypress/e2e/permissions.cy.ts` | `cypress/e2e/toponyms/regions.live.cy.ts` |
| `cypress/e2e/toponyms/regions.stub.cy.ts` | `cypress/e2e/toponyms/permissions.live.cy.ts` |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts` | `cypress/e2e/toponyms/details.live.cy.ts` |

Shared files retain their common behavior while using definition-time mode blocks for mode-specific tests. The role suite's `it.skip` registration adapter and the sign-in cases' runtime `skipIf` calls were replaced only where needed for this separation. Stub-only cases are not registered as pending tests in a live run; they remain registered in the stub job. The general support `skipIf` command was not removed.

Static registration evaluation, without executing hooks/test bodies, finds:

| Job | Registered cases | Pending cases introduced |
| --- | ---: | ---: |
| Stub | 31 | 0 |
| Live | 11 | 0 |
| Distinct across both jobs | 39 | 0 |

Three common cases intentionally run in both jobs. A separate AST comparison against `HEAD` verifies that existing test names and executable test statements are unchanged apart from removing the four mode-skipping commands. No meaningful assertion or test scenario was removed, weakened, or rewritten. The indentation changes in the two mixed specs are the consequence of their new mode blocks.

### Command meanings

| Command family | Meaning after C1 |
| --- | --- |
| `cypress:run:stub`, `cypress:open:stub` | Set `E2E_MODE=stub` and matching `USE_STUBS=1`; collect only the stub list. A separately started E2E frontend is required. No API/DB setup is performed by these commands. |
| `cypress:run:live`, `cypress:open:live` | Set `E2E_MODE=live` and matching `USE_STUBS=0`; require the approved environment and matching dedicated backend before collecting/running the live list. |
| `cypress:run`, `cypress:open` | Delegate to the explicit stub commands. There is no implicit live default. |
| `e2e:stub:run`, `e2e:stub:open` | Start the E2E-only frontend, wait for its local readiness, then use the explicit stub command. |
| `e2e:live:run`, `e2e:live:open` | Start the E2E-only frontend and `api:e2e`, wait for readiness, then use the explicit live command. The ordinary `api:test` startup is no longer used by Cypress orchestration. |
| `start:e2e` | Serve the dedicated Angular E2E configuration on `http://localhost:56379`, bound to localhost. |
| `api:e2e` | Start the real backend through the guarded test-only wrapper; requires approval before application/database imports and initialization. |
| `test:e2e:safety` | Run the isolated Node safety tests only. |

Missing, unrecognized, or conflicting `E2E_MODE` / `USE_STUBS` values are errors. Raw legacy invocations that provide only `USE_STUBS` must use an explicit mode or the documented scripts. A CLI spec override cannot broaden the returned approved file list; independent file guards also reject an incorrect selection. The original eight spec files still exist.

## E02 — reset safeguards

### Validation order

1. Stub/non-live module entry is rejected immediately. Stub Cypress tasks also reject reset independently, before importing the reset module.
2. Require an explicitly selected `E2E_ENV_FILE`; resolve it to its real path. No default `.env` or `.env.test` is guessed.
3. Parse that file without implicit dotenv side effects. Reject a different `DOTENV_CONFIG_PATH` and contradictory protected values supplied by the file and ambient environment.
4. Require explicit live mode and `NODE_ENV=test`, credentials, a canonical test database tuple, and a nonempty exact allowlist. Reject production/general database selectors and conflicting PostgreSQL connection variables.
5. Require `E2E_RESET_AUTHORIZATION` to name the exact approved database target, plus a per-run identity. A mode label or local address alone never grants reset permission.
6. Install the validated environment and dotenv path before lazy database/model imports.
7. Check the loaded Sequelize client's host, port, database, username, password, dialect, and absence of replication against the approval before calling authentication or any destructive statement. A cached client for another target is rejected.
8. Only then may the existing reset/authenticate/SQL/seeding sequence run. The Cypress task additionally revalidates the current environment and backend identity before importing/calling reset.

Negative isolated tests prove rejection before the database loader/connection callback for missing authorization, missing/malformed/duplicate/wildcard allowlists, conflicting environment sources, wrong environment, missing credentials, production/general DB selectors, remote hosts, and ambiguous connection strings. An isolated import of the actual reset module in stub mode confirms its entry guard rejects without invoking reset or loading the database singleton.

### Approval format and restrictions

No real environment/allowlist was created or accepted during this phase. A future operator must provide a private, dedicated E2E environment file and set `E2E_ENV_FILE` in the launching environment. Cypress/API E2E scripts set the required live mode; a direct script caller must supply it explicitly.

The following is a **format illustration, not approval of an existing database and not a command to execute**:

```dotenv
NODE_ENV=test
DB_USERNAME=dedicated_e2e_role
DB_PASSWORD=<private password for that disposable database>
DB_LINK_TEST=127.0.0.1:5432/disposable_e2e_database
E2E_DB_ALLOWLIST='["postgresql://dedicated_e2e_role@127.0.0.1:5432/disposable_e2e_database"]'
E2E_RESET_AUTHORIZATION='RESET postgresql://dedicated_e2e_role@127.0.0.1:5432/disposable_e2e_database'
E2E_RUN_ID=<fresh random lowercase hexadecimal value, 32–64 characters>
```

The allowlist is an exact JSON array of canonical, credential-free `postgresql://username@host:port/database` entries. It binds username, literal host, explicit port, and database; no wildcard, query/fragment options, alternate URL spelling, duplicate, embedded password, or missing port is accepted. Host support is deliberately limited to literal `127.0.0.1` and `localhost`. System/production-named databases are rejected as an additional restriction, not as a substitute for exact approval. Supported usernames/database names use letters, digits, and underscores. Remote Neon/Render/Vercel hosts remain forbidden even if placed in the allowlist.

`DATABASE_URL`, `DB_LINK`, and the conflicting PostgreSQL selectors checked by the policy must be absent/empty. Do not reuse a mixed production/development environment file. `PORT`, if supplied, must be `8080`. `DOTENV_CONFIG_PATH` must be absent or resolve to the same selected file. The same approved file and run identity must be used by Cypress and the guarded backend. No credentials or database approval values are copied into Cypress's browser configuration; only the per-run request identity is provided there.

**Scope boundary:** the legacy direct CLI dispatch comparison remains unchanged (E18), so an approved Windows CLI invocation can still do nothing. Its module entry now rejects unsafe environments first. The stale password imports (E03), seeder logging (E17), and seeding logic are also unchanged. C1 does not make an authorized live reset functional or recommend executing one before those separately scoped defects are addressed.

## E16 — frontend, helper, backend, and database identity

The supported E2E origin pair is explicitly fixed:

```text
Frontend: http://localhost:56379
API:      http://localhost:8080
```

Other origins, including Render/Vercel/Neon and alternate local ports, fail configuration rather than being guessed safe. This is a conservative supported environment, not a remote test-environment discovery mechanism.

### Frontend verification

The added Angular configuration uses `cypress/frontend/main.ts`. This entry imports the same `environment` consumed by application services and invokes a safety handshake with the compiled `production` flag, compiled `apiUrl`, and actual page origin. The original `src/main.ts` is imported only after approval. A production flag, wrong API origin, wrong frontend origin, or missing handshake fails. Normal production/development Angular entry/settings remain unchanged.

Browser support installs the handshake before load, requires its completion on load, and requires a fresh approval on reload. It validates visits before calling the original command and rejects foreign URLs, API paths, and non-GET visit requests. A normal non-E2E frontend build fails the handshake rather than being accepted as an E2E build.

### Backend verification

`api:e2e` validates the selected environment/DB approval before importing the real application. It validates the actual Sequelize client, binds the dedicated local port, then invokes the existing infrastructure initialization and permission-sync behavior. A port conflict prevents initialization. It does not introduce fake route models or replace PostgreSQL operations with mocks.

The wrapper exposes a test-only, no-store `/__e2e/identity` response, gated by the per-run header. It reports the origin pair, live mode, version, and a SHA-256 fingerprint of the approved credential-free database tuple. It does not return passwords or bearer tokens. `/healthz` remains a readiness-only response and grants no API access.

Cypress compares the backend identity before live configuration completes, before a live spec, before each test, before helper requests, and before resets. Identity requests use a fixed approved URL, a bounded timeout, and `redirect: 'error'`. Changed target/run configuration, missing identity, wrong database fingerprint, wrong mode/API identity, unexpected response shape, and redirects fail. Health readiness alone is not trusted as identity.

The wrapper refuses ordinary application requests without the matching `x-e2e-run-id` before delegating to the real app. Approved CORS preflight remains non-mutating. The normal app's JWT/auth/permission middleware still applies after that additional gate. Browser middleware and helper wrappers supply the run header only for the approved API. Helper `cy.request` overloads retain their existing method/body/headers, require backend revalidation, and disable redirect following.

### Stub network containment

- Direct `cy.request` is prohibited in stub mode, regardless of the caller's desired target or helper flag.
- The proxy's `blockHosts` policy denies every host except the frontend in stub mode: `!localhost:56379`. In live mode it permits only the fixed frontend/API pair: `!{localhost:56379,localhost:8080}`. Ports are part of the host match.
- The first browser middleware validates actual application request URLs before scenario routes. A foreign API URL cannot be hidden by a wildcard response stub.
- A stub fallback registered before scenario handlers destroys and reports an API request that no scenario stub answers. It does not reply with a successful placeholder.
- The proxy policy remains a separate backstop when a handler continues a request or no stub replies. External assets are denied too; E2E execution is not allowed to fetch third-party/CDN resources as a side effect.
- Test isolation and the required support file are enforced. Suite-level safety-config drift is rejected before test setup proceeds. The Node reset task retains its closed-over mode independently of browser environment mutations.

The proxy match semantics were checked against the installed minimatch behavior and Cypress's published request pipeline: interception precedes outbound blocked-host enforcement. See [Cypress host blocking](https://docs.cypress.io/app/references/configuration#blockHosts) and the [Cypress 15.20 request middleware order](https://github.com/cypress-io/cypress/blob/v15.20.0/packages/proxy/lib/http/request-middleware.ts#L251-L267). Browser integration of those layers has not been executed in C1; only isolated policy/handler behavior and static integration were tested.

## Static and isolated validation results

| Check | Result |
| --- | --- |
| `npm run test:e2e:safety` | **53 passed, 0 failed, 0 skipped**. Fake DB/network/listener/application dependencies; temporary synthetic env files removed afterward. |
| Cypress/config TypeScript: `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` | **Passed**, exit 0. |
| E2E frontend TypeScript: `node node_modules/typescript/bin/tsc -p cypress/frontend/tsconfig.json --noEmit` | **Passed**, exit 0. |
| Production TypeScript: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | **Passed**, exit 0. |
| Angular E2E template/static compilation: `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p cypress/frontend/tsconfig.json --noEmit` | **Passed**, exit 0; nonfatal existing NG8102/NG8107 warnings in OrdersList/RecipientsList templates. Those files were not modified. |
| Angular E2E application/dev-server options against installed local JSON schemas | **Passed**, no builder/server executed. |
| Production/development Angular settings and dependency declarations compared with `HEAD` | **Unchanged**. No dependency/lockfile update. |
| Node `--check`: policy, Node integration, backend wrapper, safety tests, reset script | **Passed**, 5 files; syntax only. |
| Static registration and original-case AST comparison | **Passed**: 31 stub / 11 live registrations, 39 distinct original cases, no pending cases introduced, preserved names/assertions. |
| `git diff --check`, explicit new-file whitespace scan, scope review | **Passed**. |
| Cypress E2E / real API / database / reset / migrations | **Not run**. No real-data or production-service operation. |

The first new reload-handshake test exposed property redefinition on a reused window object. The safety handler was corrected to reuse its trusted approver while clearing prior approval; the test remained intact and now passes. Initial Cypress typing also exposed that the E2E application entry needed its own application project; the separate project resolves that without changing production code or suppressing diagnostics.

## Remaining risks, limitations, and blocked commands

| Item | Status / boundary |
| --- | --- |
| Real disposable database identity/approval | **Not supplied or inferred.** Live config, guarded backend, and reset reject missing/ambiguous approval. No actual target was inspected or approved. |
| Real end-to-end frontend/backend identity | **Runtime unverified.** The handshake, fingerprint, command wrappers, and rejection order are verified statically/with fake dependencies; no running services were contacted. |
| E03 stale password-module imports | **Deferred, unchanged.** An explicitly authorized reset may still fail after destructive work on the approved disposable DB. Do not execute it in C1. |
| E18 Windows direct CLI dispatch | **Deferred, unchanged.** Approved direct CLI dispatch can still be a no-op; unsafe entry now rejects first. |
| E04 helper yield, E05 late/missing stubs, E06 invalid users stub, E07 refresh sequence, E08–E15/E17–E20 | **Deferred, unchanged.** The new fail-closed guard will expose unhandled API traffic instead of allowing nominal stub tests to depend on a live service. A green legacy E2E run is not claimed. |
| Third-party styles/fonts/assets | Denied by the E2E proxy policy. Rendering impact has not been tested. No production asset/template was changed to work around it. |
| Local environment trust | Exact approval is an operator declaration of disposability. The policy does not inspect data to infer whether it is safe, or defend against deliberate OS/DNS/tunnel manipulation by someone controlling the machine. Remote targets remain unsupported. |
| E2E API initialization | Still uses the real app's existing model sync and permission initialization after approval. These are potentially mutating test-DB operations; they were not executed. |
| Existing ordinary `api:test`, `server`, development/perms scripts | Outside C1's E2E guard entry. They remain unchanged and must not be used as substitutes for `api:e2e` to bypass approval. C1 Cypress orchestration no longer invokes `api:test`. |

Commands **not authorized or executed in this phase** include every Cypress E2E run/open command, `e2e:*` orchestration, `api:e2e`, `api:test`, `reset:test:db`, and migration/bootstrap commands. Stub execution has safer selection/network boundaries but still requires a later authorized runtime validation. Live execution additionally requires an explicitly approved local disposable target and a common fresh run identity; it remains blocked without them and should wait for the deferred reset defects to be addressed.

No actual secrets, allowlist entries, or run identities were provisioned in the checkout. No production schema or production data was modified. `server/scripts/bootstrap-admin.mjs` was not modified or executed. No commit or push was made.

## Recommended next phase

Request a separate C2 batch to repair the deferred reset imports (E03) and region fixture return/cleanup boundary (E04), with isolated tests and pre-destructive dependency checks. Then address the missing/late scenario stubs and invalid response fixtures without weakening the C1 network policy. Only after explicit authorization and a verified disposable environment should narrow E2E runtime validation be considered. C2 implementation was not started here.

**PHASE C1 — CYPRESS EXECUTION SAFETY**

Implementation and permitted static/isolated validation complete. Real Cypress/service/database validation: not performed.
