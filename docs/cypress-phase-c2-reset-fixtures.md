# PHASE C2 — CYPRESS RESET & FIXTURE INFRASTRUCTURE

Date: 2026-11-17. Scope: **E03, E04, and E18 only**, preserving Phase C1 safety.

## Executive summary

The reset now loads the existing production password utility from `server/security/passwords.mjs`, validates required seed dependencies, and prepares both existing account hashes before loading a database client. Missing dependencies, missing/conflicting environment configuration, hashing failures, and unauthorized attempts fail before connection or destructive SQL in the isolated checks.

`createRegion()` now returns the created entity with a typed response/return contract and rejects invalid IDs. The two existing live-suite cleanup hooks return the deletion chain for the exact captured ID. Their test names and assertion bodies are unchanged; fixture creation/deletion still use the same HTTP endpoints.

Direct CLI detection now compares normalized file paths through Node's canonical file URL conversion, supporting Windows and Unix paths. Importing an approved module only validates policy; it does not hash, connect, or reset. CLI execution and explicit `reset()` calls retain C1 authorization and disposable-target checks.

**Validation: 99/99 isolated tests passed: 53 existing C1 + 46 new C2.** Relevant TypeScript, Node syntax, dependency-path, assertion-preservation, whitespace, and scope checks passed. No Cypress run, real reset/schema operation, database connection, live HTTP/API request, native password hashing, or production bootstrap command was executed.

## Exact C2 file changes

The workspace already contained the uncommitted C1 work when C2 started. The following list describes the **C2 increment**, not every outstanding workspace change.

| Existing file modified | Change |
| --- | --- |
| `server/scripts/reset-test-db.mjs` | Preflight the current password module, both hashes, and required database/model APIs; pass the prepared hashes to the existing seeders; repair CLI dispatch through canonical path comparison. |
| `cypress/safety/node.mjs` | Add `PASSWORD_PEPPER` to the protected environment-source conflict checks. No C1 approval, target, task, or network policy was removed or relaxed. |
| `cypress/e2e/toponyms/_helpers.ts` | Type the creation response and returned `Toponym`, return `body.data`, reject invalid created/cleanup IDs. |
| `cypress/e2e/toponyms/regions.live.cy.ts` | Explicitly return cleanup using the captured non-null created ID. |
| `cypress/e2e/toponyms/details.live.cy.ts` | Initialize the captured ID to null and explicitly return cleanup for that ID. |

| New file | Purpose |
| --- | --- |
| `cypress/safety/cli-entry.mjs` | Small, side-effect-free Windows/Unix direct-execution detector. |
| `cypress/safety/reset-fixtures.test.mjs` | 46 isolated C2 regressions using fake module, database, hash, process-exit, and HTTP dependencies. |
| `docs/cypress-phase-c2-reset-fixtures.md` | This report. |

Total C2 increment: **5 existing files modified, 3 files added**. A 34-file starting hash snapshot confirmed that only those five existing files changed; the other 29 baseline files remained identical, including the existing C1 regression tests, policy, config/support/frontend files, package/lockfile, prior reports, and `server/scripts/bootstrap-admin.mjs`.

No production application source, authentication/authorization implementation, schemas, dependencies, package scripts, or bootstrap behavior was changed. The existing password implementation itself was not edited.

## E03 — reset dependency repair and preflight

Relevant code: `server/scripts/reset-test-db.mjs:15–65`, `:139–211`; `cypress/safety/node.mjs:7–10`.

The old `../controllers/passwords.mjs` imports are removed. Reset uses the current `../security/passwords.mjs` implementation, preserving its Argon2id options and pepper handling rather than copying or replacing the hashing algorithm.

The reset order is now:

1. Retain C1 module-entry validation of explicit live mode, selected environment file, exact disposable-database approval, and target-specific reset authorization.
2. Revalidate inside `withApprovedDatabase()` for each explicit reset, then install the selected environment and `DOTENV_CONFIG_PATH` before loading the password/database modules.
3. Require `PASSWORD_PEPPER`, validate the permission dependency exports, import the current password utility, and verify its `hashPassword` export.
4. Compute the hashes for the same existing Admin and Viewer seed passwords. Reject import/native hash failures or missing/non-string hashes before loading a database client.
5. Load the database and model modules and check the APIs used by the seeders: database authentication/query/sync/transaction, role methods, user creation, permission methods, and Country table metadata.
6. Retain C1's exact loaded-client identity check before authentication or SQL.
7. Run the existing authenticate → drop/create schema → sync → role/permission → Admin → Viewer → Country sequence, supplying the prepared hashes to the existing user seeders.

The account names, plaintext test passwords, seeded role names/descriptions, permission construction/update rules, existing-user update path, Country 143 values, SQL statements, and transaction commit/rollback behavior are preserved. Hash preparation moves earlier; the selected production utility still produces each actual hash. There is no new application/production bootstrap path.

`PASSWORD_PEPPER` is now protected against contradictory file/ambient values, just like the existing protected database settings. A private E2E environment file must supply it unless the same value is explicitly supplied by the launching environment. It is never copied into the Cypress browser configuration. No actual pepper, credential, approval, or private environment file was provisioned or read during validation.

## E04 — entity return and exact-ID cleanup

Relevant code: `cypress/e2e/toponyms/_helpers.ts:2–6,51–96`; `cypress/e2e/toponyms/regions.live.cy.ts:17–24`; `cypress/e2e/toponyms/details.live.cy.ts:8–25`.

- `createRegion()` uses the shared `Toponym` type through a type-only import, a typed response envelope, and an explicit `Cypress.Chainable<Toponym>` return.
- Its final callback explicitly returns the response's created entity, preserving the same object and fields instead of yielding the enclosing response body through an undefined return.
- Creation must return a positive safe-integer numeric ID. Missing/null entities, absent/string/non-positive/fractional/non-finite/unsafe IDs fail before a caller can use an invalid fixture identity.
- `deleteRegion()` also rejects an invalid ID before scheduling an HTTP request. Its endpoint, auth headers, `type: 'region'`, `destroy: true`, `failOnStatusCode: false`, and accepted 200/204/404 cleanup statuses remain unchanged.
- The Regions and Details suites retain the ID from the creation result and return the corresponding cleanup chain. A failed setup leaves the nullable ID unset; cleanup never guesses an ID or deletes another record.

No live API fixture operations were replaced with stubs. The only simulated HTTP chains are inside the new isolated Node tests. Input names, short-name defaults, explicit country overrides, default country lookup, payloads, test assertions, and expected status codes were not changed.

The permission suite was reviewed and left unchanged: it has no existing cleanup hook to repair. Adding a new lifecycle/isolation policy there belongs to the separately deferred E12 work; C2 fixes the existing skipped cleanup paths without expanding that finding.

## E18 — CLI detection and environment initialization

Relevant code: `cypress/safety/cli-entry.mjs:1–12`; `server/scripts/reset-test-db.mjs:1–8,270–275`.

The CLI detector resolves the entry path with the applicable Windows/Unix path rules and converts through `pathToFileURL` / `fileURLToPath`. It compares decoded normalized paths, using Windows case-insensitive and Unix case-sensitive comparison. This handles drive letters, relative paths, separators, spaces, encoded `#`/`%`, Unicode, and Windows UNC paths. A missing entry, different caller, non-file module URL, or import URL with a query/fragment is not direct execution.

The reset module still performs C1's entry guard before dispatch. Merely importing it does not execute `reset()` or load a database singleton. Direct execution calls the same guarded exported reset and preserves the existing success/failure exit handling; it cannot choose an unapproved database or bypass live-mode/authorization checks.

There is no eager `dotenv/config` import in the reset script and no dotenv preload in the existing C1 `reset:test:db` command. C1's side-effect-free dotenv parser reads only the explicitly selected file; the validated values and selected dotenv path are installed before the password utility or database modules load. The database module's own dotenv initialization therefore sees that selected environment rather than a guessed default file. Missing or conflicting configuration fails closed.

Synthetic Windows and Unix entry paths were tested on the current Windows host using Node's explicit platform conversion options. No real CLI reset was launched on either operating system.

## Preservation of C1 protections

All existing **53 C1 regression tests still pass, unchanged**. C2 retains:

- Exact stub/live spec selection and definition-time scenario registration.
- Stub-mode reset and direct HTTP-request rejection.
- Proxy host blocking, unhandled-stub failure, required support/isolation checks, frontend compiled-environment handshake, and approved backend identity verification.
- Explicit `E2E_ENV_FILE`, conflict rejection, exact disposable DB allowlist, exact reset authorization, required run identity, production/remote target rejection, and loaded-client verification before use.
- Both module-entry and per-reset validation. An approved import cannot later reset after its environment/authorization changes to an invalid state.

The only C1 helper change is the additional protected `PASSWORD_PEPPER` key. This tightens required environment consistency; it grants no new target or authorization path.

## Validation results

| Check | Result |
| --- | --- |
| Starting C1 baseline: `npm run test:e2e:safety` before edits | **53 passed, 0 failed, 0 skipped**. |
| Final combined `npm run test:e2e:safety` | **99 passed, 0 failed, 0 skipped**: 53 original C1 + 46 new C2. |
| Relevant TypeScript: `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` | **Passed**, exit 0. Covers the helper types, affected specs, and Cypress config. |
| Node `--check` | **Passed** for `server/scripts/reset-test-db.mjs`, `cypress/safety/node.mjs`, `cypress/safety/cli-entry.mjs`, and `cypress/safety/reset-fixtures.test.mjs`. Syntax only. |
| Local dependency paths / package resolution | **Passed**: database, models, operations and current password utility paths exist; installed Sequelize/Argon2 entry resolution succeeds. No native hashing or application module was executed by this check. |
| Affected E2E test names/assertion bodies compared by AST with the original files | **Identical** for Regions and Details. No E2E tests added, removed, skipped, or weakened. Existing C1 registration checks also remain green. |
| C1/source starting hash comparison | **Passed**: only the expected five existing C2 files changed; protected/excluded files unchanged. |
| `git diff --check` and explicit new-file whitespace/encoding checks | **Passed**. |
| Cypress E2E, live HTTP/API, real database, reset/schema/migration, bootstrap commands | **Not executed**. |

The new isolated tests evaluate the actual reset/helper/hook source with a closed fake module loader and fake HTTP chains. Database calls record SQL strings in memory; they do not send SQL to an engine. Hash calls use deterministic fake functions, and CLI exits use a fake process object. Unexpected imports are rejected instead of falling back to real database/application modules. Environment files contain synthetic values in temporary directories and are removed afterward.

Coverage includes:

- Windows/Unix synthetic direct-entry matching, relative and normalized paths, Windows casing/UNC, reserved path characters, Unicode, non-entry imports, and import URL suffix rejection.
- Approved import without reset, guarded direct dispatch, unchanged exit handling, and revalidation after mode/authorization changes.
- Missing password/database/model modules; missing hash/model/client APIs; native hash failures before either first or second seed completes; invalid hash return values.
- Missing pepper/DB credentials, contradictory pepper sources, invalid environment mode, missing authorization, and unapproved DB configuration before connection/destructive SQL.
- Hash/dependency ordering, original seed values and existing-user saves, exact created-object return, malformed IDs/responses, HTTP creation errors, unchanged cleanup status policy, and exact captured-ID deletion in both existing live hooks.

## Unresolved risks and blocked runtime commands

- No actual disposable database/environment approval was supplied, inferred, or provisioned. C1 still blocks live operations without its explicit approval, authorization, identity, and matching environment requirements; `PASSWORD_PEPPER` is additionally required for reset preflight.
- Real database permissions, native hashing, backend identity, full E2E execution, and actual persisted cleanup have not been exercised. Passing isolated tests is not a claim that a live Cypress suite now passes.
- Preflight prevents the demonstrated missing-dependency/environment/hash failures from occurring after a drop. It does not make the existing multi-step reset atomic: a later database/server failure can still leave an approved disposable database partially initialized. SQL and seeding transaction architecture were not redesigned.
- Other audit findings remain deferred, including late/missing stubs, invalid unrelated fixtures, assertion gaps, shared live-DB isolation, and existing seed credential logging. No assertion or safety policy was weakened to conceal those issues.
- The permission suite's creation-only lifecycle remains unchanged, as noted above; this report does not claim a general fixture/isolation cleanup.

**Blocked/not authorized in C2:** `npm run reset:test:db`, every Cypress E2E run/open command, `e2e:*` orchestration, `api:e2e`, `api:test`, database migrations, and production/bootstrap commands. The repaired CLI can now actually enter reset when explicitly approved, so it must not be used as a harmless syntax/readiness check. Real runtime validation requires a separately authorized, confirmed disposable environment.

`server/scripts/bootstrap-admin.mjs` was neither modified nor executed. Production application behavior, schemas, authentication, authorization, and dependencies are unchanged. No commit or push was made.

**PHASE C2 — CYPRESS RESET & FIXTURE INFRASTRUCTURE**

E03/E04/E18 implementation and permitted static/isolated validation complete. Real database/application services contacted: **0**.
