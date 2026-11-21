# PHASE C7B — CYPRESS DIAGNOSTIC SECURITY

Date: 2026-11-18. References: [original E17 audit](cypress-e2e-audit.md), [C6 readiness](cypress-phase-c6-live-readiness.md), [C7A fixtures/readiness](cypress-phase-c7a-live-fixtures.md).

## Result and execution boundary

Addressed plaintext seed-password logs, raw custom reset-error dumps, password typing logs, direct credential/bearer HTTP command logs, sensitive auth/permission waits and the live permission-response dump. Added Git exclusions for Cypress runtime artifacts and documented private handling below.

**161/161 isolated tests pass: 147 existing C1–C7A tests plus 14 new C7B regressions.** Cypress/config and dedicated frontend TypeScript checks, modified-module syntax checks and whitespace checks pass. All **39 original distinct E2E scenarios remain represented**, including **31 stub and 11 live registrations**; three scenarios are shared between modes. No meaningful assertion was weakened or removed.

No Cypress E2E, frontend/backend service, real API/PostgreSQL connection, database reset, migration, seed or bootstrap was executed. `node --check` only parsed the reset script; it did not execute its imports or reset function. No database was provisioned or selected. No commit or push was made.

**This is targeted command/custom-diagnostic suppression, not a guarantee that browser network inspection, failure reporting or screenshots cannot expose session information.** There is no new browser-runtime evidence in this phase.

## Exact files changed

This inventory is relative to the C7B starting state, which already contained uncommitted earlier-phase work. SHA-256 scope comparison covers all 672 starting tracked/unignored files.

| File | C7B change |
| --- | --- |
| `server/scripts/reset-test-db.mjs` | Replace seed-password messages with account-seeded status; remove raw error/message arguments from seed failure and CLI failure logging. Preserve original thrown errors and CLI exit status. An inactive Country example's raw error dump was also made generic. |
| `cypress/support/commands.ts` | Add typed, optional logging control to `fillMatInput`; suppress password replacement/typing, stub auth/permission waits and real API-login logging. API-login object form retains its original method/URL/body. |
| `cypress/e2e/sign-in.cy.ts` | Pass `log: false` for the shared password-entry helper and auth/refresh waits; preserve statuses, messages, navigation and submit assertions. |
| `cypress/e2e/toponyms/_helpers.ts` | Suppress all four direct HTTP request logs, including credential and bearer headers; suppress auth-body extraction; validate token type/nonemptiness through a boolean assertion rather than logging the token as an assertion subject. |
| `cypress/e2e/toponyms/details.live.cy.ts` | Suppress the existing bearer-authenticated by-ID fixture reread request log. |
| `cypress/e2e/toponyms/permissions.live.cy.ts` | Remove full permission-response console dump and suppress its wait log; keep the successful authorization status assertion. |
| `cypress/e2e/roles.cy.ts` | Suppress auth/permission wait logs and the exact-ID bearer cleanup request log. C7A identity capture, validation, ownership checks and cleanup remain intact. |
| `cypress/e2e/toponyms/regions.live.cy.ts` | Suppress the permission-response wait log; retain all setup/search/sort/cleanup checks. |
| `.gitignore` | Ignore Cypress screenshots, videos, downloads, logs, results and reports directories. Source fixtures remain eligible for Git. |
| `cypress/safety/reset-fixtures.test.mjs` | Capture custom reset diagnostics using fake dependencies; inject synthetic failures and add five diagnostic regressions. Existing reset, hashing, policy, ID and cleanup checks retained. |
| `cypress/safety/execution-safety.test.mjs` | Verify `log: false` survives the unchanged guarded request wrapper. Assertion-preservation comparison ignores only pure logging options on wait/property-extraction calls; actual assertions/options remain checked. |
| `cypress/safety/diagnostic-security.test.mjs` — new | Nine fake-command/source/artifact regressions covering the affected diagnostic paths. |
| `docs/cypress-phase-c7b-diagnostic-security.md` — new | This report and artifact-handling expectations. |

No production application logic, production password utility, schema, test credential value, permission matrix, dependency, package script, environment file, Cypress configuration or C1 guard implementation changed. `server/scripts/bootstrap-admin.mjs` and previous reports retain their starting hashes.

## Exposures addressed

### Reset script

The success messages now state that the Admin/Viewer accounts were seeded without printing their passwords. Useful reset start/completion, permission-row count, Country seed and operation-failed messages remain.

Custom error logging no longer prints arbitrary `Error` objects or their messages. Those can contain connection details, SQL, password/hash material or nested metadata. Seed failures still roll back and rethrow the **same original error**; CLI failures still exit with status 1. The custom CLI output states failure without serializing the error. This preserves error propagation rather than treating failure as success.

The existing synthetic account names/password inputs, current Argon2id utility, pepper handling, preflight order, authorization, SQL and seeding transactions were not changed. Existing isolated checks still verify the original hash inputs and that both hashes/dependencies resolve before database use. No real hashing or SQL was performed during validation.

Upstream consumers can still display a propagated error. In particular, a failing Cypress task or HTTP library can include request/database context in its own failure report. This phase removes the script's explicit dumps; it does not sanitize every third-party exception or change application error behavior.

### Cypress credentials and auth responses

`fillMatInput` accepts only the relevant typed logging option. Default logging remains enabled for ordinary inputs. Every active password-input call in shared login and the standalone Sign In suite passes `{ log: false }`; both the replacement keystrokes and password typing inherit it. C7A's visibility, enabled-state, AUT-document focus and normal typing behavior remain.

The live API-login request now uses the supported object form with `log: false`, preserving the same POST URL, username/password body, accepted status assertion and navigation. HTTP fixture login suppresses both its request and `.its('body')` extraction. Its nonempty-string token requirement is unchanged, but assertions now see only a boolean so malformed private response values are not printed as assertion subjects.

All seven active direct HTTP request sites in the affected infrastructure use `log: false`: API login in commands, the four toponym helpers, Details reread and Role cleanup. Bearer headers, payloads, response values and cleanup IDs are still passed unchanged to the transport. Non-sensitive status assertions remain available.

Auth/refresh waits in Sign In and auth/permission waits in shared/live setup use `log: false`. The actual callbacks, response status/error-message checks and sequencing remain. The full live permission response is no longer printed to console; its status is still checked before navigation.

Existing non-sensitive mode/count/country-ID diagnostics were not replaced with another payload logger. No custom masked-password logger or token-bearing failure message was added.

### Browser logging boundary

Cypress request/wait/property-extraction logging options control those commands, not every browser/proxy record. Browser `fetch`/XHR inspection can still show authorization headers, response tokens, HttpOnly-cookie traffic and permission data. C1's mandatory middleware also participates in Cypress's request logging/matching. **No log-only intercept was added**, and no routing middleware was altered to conceal traffic: a suppression route must never turn into a successful response stub, consume a scenario handler or bypass host checks.

The installed Cypress 15.20 type declarations and route/logging implementation were inspected read-only to confirm supported controls and this limitation. Cypress itself was not launched. Existing C1 and C7A isolated tests continue to enforce fail-closed routing, exact fixture identity and cleanup; browser/network confidentiality has not been runtime-verified.

## Artifact handling

The following default/conventional generated folders are now excluded from Git:

```text
cypress/screenshots/
cypress/videos/
cypress/downloads/
cypress/logs/
cypress/results/
cypress/reports/
```

An isolated `git check-ignore --no-index` regression verifies each exclusion using synthetic paths without creating artifacts. It also verifies that `cypress/fixtures/toponyms.json` is not excluded. No source fixtures or existing artifacts were deleted.

The existing `video: false` setting is unchanged. Failure screenshots were **not** disabled. No blanket diagnostic shutdown was introduced to obtain passing tests; safe operation/status assertions and useful failure evidence remain.

For any separately authorized future run:

- Use only synthetic test accounts/data and fresh E2E-only secrets. Never reuse production credentials or copy real people/data into fixtures, downloads or screenshots.
- Prefer an access-restricted artifact directory outside the checkout and outside shared/synced folders. If paths are overridden, the new path must remain private; these Git ignore patterns do not cover arbitrary alternate directories.
- Keep screenshots, downloads, terminal/task output, HTML/JUnit/JSON reports, browser traces and network captures private. Screenshots can include Command Log content or visible application data even when a password field is masked. Git ignore is neither encryption nor access control.
- Do not upload raw artifacts to public CI reports, issue trackers, chat attachments or Cypress recording services. Review/redact artifacts before sharing; summaries should contain only spec/scenario names, counts, statuses and safe error categories.
- Recommended retention: retain failure evidence only as long as needed, with a **maximum seven-day private local/CI TTL**, and delete sooner after diagnosis. Keep passing-run output limited to non-sensitive summaries. This is a documented handling requirement, **not** an implemented cleanup job or an assertion that external storage enforces a TTL.
- Check staged files before any later commit. `.gitignore` does not untrack already committed files, prevent force-adds, control terminal logs or remove old artifacts. Existing/default folders are covered; no claim is made about previously shared copies.

## Isolated regression results

The new tests use synthetic markers, a modeled command log and closed fake module/HTTP/document dependencies. Raw fake transport arguments are separate from emitted diagnostics so the checks can verify that values remain correct **and** are omitted from visible output. These tests do not claim that their model proves every Cypress browser/UI logging behavior.

Five additions in `reset-fixtures.test.mjs` verify:

1. Successful reset status logs contain useful operations but no seeded passwords, computed fake hashes, database password or pepper.
2. Admin seed failure keeps its operation/rollback and original exception without dumping unsafe metadata.
3. Viewer seed failure has the same protection.
4. Country seed failure has the same protection.
5. Guarded CLI hash failure reports failure/exit 1, emits no private error marker and reaches neither database authentication nor SQL.

Nine additions in `diagnostic-security.test.mjs` verify:

1. Live/stub password replacement and typing are hidden while the original password reaches the fake input; ordinary username logging remains.
2. API login suppresses credential/response output while retaining the exact body and accepted status assertion.
3. Standalone Sign In's password path and auth wait options remain private.
4. HTTP fixture login hides token extraction and validates malformed tokens without printing them.
5. Country/region helpers hide bearer request details while retaining their operations and IDs.
6. Live Permissions retains status readiness without its full private response dump.
7. Every active direct credential/bearer request site has explicit suppression, including C7A cleanup and reread.
8. Active auth/permission waits and password call sites have explicit logging options.
9. Generated artifact paths are ignored, source fixtures remain eligible, and failure screenshots/video configuration are not weakened.

| Validation | Result |
| --- | --- |
| Starting isolated suite | **147 passed, 0 failed, 0 skipped** before C7B edits. |
| Final complete isolated suite | **161 passed, 0 failed, 0 skipped, 0 cancelled**: 147 existing + 14 new. |
| Scenario/assertion preservation | **39 original distinct scenarios**, including **31 stub / 11 live registrations**. Existing strict validation, status/message, no-write, persistence, sorting, identity and ownership checks remain. |
| Cypress/config TypeScript | `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` — passed. |
| Dedicated frontend TypeScript | `node node_modules/typescript/bin/tsc -p cypress/frontend/tsconfig.json --noEmit` — passed. |
| Node syntax | `node --check` on the reset script and three modified/new isolated test modules — four passed. No module execution from these checks. |
| Whitespace | `git diff --check` and explicit new-file whitespace/encoding checks — passed. |
| Scope | Starting-file hashes confirm only the eleven existing files listed above changed; the new diagnostic test and this report were added. Production application/guard/bootstrap/other C7A files unchanged. |
| Runtime operations | No Cypress, application startup, real HTTP/API, PostgreSQL, reset/schema/seed/bootstrap operation. No external API access. |

Executed checks used the installed Node executable with `--test cypress/safety/*.test.mjs` (also a diagnostic dot-reporter invocation), the two no-emit TypeScript commands, four syntax checks, Git checks, source/hash inspection and a read-only Node/listener inventory. Only the existing Codex tool-host Node processes were found; no project backend or frontend listener was present. No unrelated process was stopped. Private environment-file contents were not read or changed.

## Preserved protections and remaining blockers

C1 mode/spec allowlists, fixed origins, host/network blocking, unmatched-stub rejection, selected environment/database authorization, loaded-client identity, backend run identity, frontend handshake and support/test-isolation requirements remain unchanged. The request wrapper retains `log: false` without changing payloads, its required run header, backend verification or disabled redirects; an existing regression now checks this explicitly.

C2 pre-drop dependency/password preflight and guarded Windows/Unix direct entry remain. C3 response/refresh contracts, C4 assertion integrity and C5 containment checks remain. All C7A exact-ID ownership/cleanup, pre-existing-role protection, separate Details fixtures, country 143, warning selector and login readiness/focus improvements remain protected by their original isolated regressions.

Remaining blockers before live execution:

- Separate explicit approval and independent verification of a disposable **local** PostgreSQL target, actual least-privilege credentials, schema ownership, contents and exclusive use. The development/integration databases remain unapproved.
- A separately scoped C7C execution/environment plan, including fresh backend/per-spec ownership to prevent rate-limiter memory leaking across runs. No orchestration or limiter implementation was changed here.
- Confirmation of private runtime artifact storage/retention and controlled environment inheritance before any service launch. No recording/upload authorization is implied.
- Future browser/runtime verification of normal actionability, actual logging controls, cookies/network visibility, real database privileges/reset/seeding and persisted cleanup. Cleanup hooks still cannot guarantee cleanup after a hard process crash or recover an ID never captured from a failed response.

No retries, sleeps, skipped tests, blanket success stubs, authentication changes, credential changes or permission changes were introduced. Do not provision a database or run Cypress as an automatic continuation.

**PHASE C7B — CYPRESS DIAGNOSTIC SECURITY**

Production application files changed: **0**. Real service/database operations: **0**. Commits/pushes: **0**.
