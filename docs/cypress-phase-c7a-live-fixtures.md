# PHASE C7A — LIVE E2E FIXTURE OWNERSHIP & READINESS

Date: 2026-11-18. Reference: [C6 live readiness review](cypress-phase-c6-live-readiness.md).

## Result

Implemented the approved fixture ownership, cleanup, independent Details setup, live notification selector and login readiness changes. **147/147 isolated tests pass: 134 existing C1–C5 tests plus 13 new C7A regressions.** Cypress/config and dedicated E2E frontend TypeScript checks pass. All **39 original distinct E2E scenarios remain represented**, including **31 stub and 11 live registrations**; three scenarios are shared between modes.

These are isolated/static results, not browser passes. No Cypress E2E execution, frontend/backend startup, real API/database connection, provisioning, reset, migration, seeding or bootstrap was performed. Live execution remains blocked by the separately deferred environment, logging and orchestration requirements.

## Exact C7A files changed

This inventory is relative to the files present at the start of C7A. Earlier uncommitted work remains in the checkout; the full diff against HEAD also includes those earlier phases.

| File | Change |
| --- | --- |
| `cypress/e2e/toponyms/permissions.live.cy.ts` | Capture/validate created region ID, explicit country 143, owned search-response/row checks, exact-ID suite cleanup, authorization response readiness and normal menu/search actions. |
| `cypress/e2e/roles.cy.ts` | Observe existing live sign-in for cleanup credentials; snapshot pre-existing role IDs; capture/validate the newly created role ID; exact-ID `afterEach` cleanup; correct live warning selector; normal live form/navigation actions. |
| `cypress/e2e/toponyms/details.live.cy.ts` | Separate per-case fixture creation and `afterEach` cleanup, independent starting names/IDs, explicit short name/country, initial persisted-name assertion and normal search focus. |
| `cypress/e2e/toponyms/regions.live.cy.ts` | Explicit country 143 for both fixtures, verify searched response IDs and exact named cell instead of first-row selection, normal navigation/search focus. Existing captured-ID cleanup and sorting assertions retained. |
| `cypress/support/commands.ts` | Live sign-in page readiness, enabled submit, AUT-document focus checks, visible/enabled/focused input assertions, normal typing without forced actions. |
| `cypress/safety/live-fixtures.test.mjs` — new | 13 focused isolated regressions using closed fake HTTP/browser dependencies and actual test/helper source. |
| `cypress/safety/reset-fixtures.test.mjs` | Existing hook regression now invokes the Details fixture's per-case setup/cleanup hooks; retains exact-ID and cleanup-result assertions. |
| `cypress/safety/assertion-integrity.test.mjs` | Harness recognizes `afterEach`, runs fixture setup in its new lifecycle position, and reads the explicit initial short name for the unchanged save-contract assertions. |
| `cypress/safety/stub-auth-contracts.test.mjs` | Fake elements expose their owning document; fake chain supports `and`; registration accepts `afterEach`. Existing authentication/network assertions retained. |
| `cypress/safety/execution-safety.test.mjs` | Registration accepts `afterEach`; additionally compares generated live Viewer/Admin scenario names with their originals. Assertion-preservation check recognizes only the two approved live input action changes while still requiring identical visibility/value assertions. |
| `docs/cypress-phase-c7a-live-fixtures.md` — new | This implementation/validation report. |

No factory, fixture JSON, production file, schema, dependency, package script, environment file, reset script or C1 guard implementation changed. `server/scripts/bootstrap-admin.mjs` was not changed or executed.

## Fixture ownership and cleanup

### Live Permissions

The suite captures the entity returned by the existing HTTP `createRegion()` helper and checks its ID is a positive safe integer. Setup explicitly requests country **143**. Both original Viewer/Admin cases remain, including their existing Add/Delete and menu/icon/text permission assertions.

Each case searches for the suite fixture's unique name. The observed real list response must be 200, use the expected search/type/country parameters and return **exactly the captured ID**. The table must contain one matching row before actions are scoped through that row's action button. No first-row selection remains. Menu clicks use normal actionability. The awaited authorization response must be 200 before navigation.

The suite `after` hook deletes only the captured region through existing `deleteRegion(id)`. Browser Viewer/Admin login does not replace the setup Admin bearer value used by this helper. Successful cleanup clears the tracked ID. Invalid creation responses fail before an ID can be registered; cleanup never substitutes another available record.

The two permission cases remain read-only with respect to this shared suite fixture. This phase does not add server-denied-write coverage or change seeded permissions.

### Live Roles

The existing create endpoint returns the role **name**, not an ID. This phase preserves that response contract. The live creation case retains its original POST name/description, status and response assertions, then obtains the ID from the existing verified real list reload for that unique name.

Before the case, the suite records pre-existing role IDs. The new role ID must be a positive safe integer, absent from that snapshot, and accompanied by the current successful UI sign-in's Admin token. The sign-in observer is registered before login and adds no login request or stub. The captured role is registered for cleanup **before** the persisted description/value assertions, so those assertions can fail without losing an already validated cleanup identity.

The live-only `afterEach` issues one bounded DELETE to the existing `/api/roles/delete-role/<captured ID>` contract with that Admin token. It rejects pre-existing IDs and seeded role names (`Admin`, `Coordinator`, `User`, `Viewer`). There is no name-prefix sweep, positional selection or deletion of a seeded role. Successful cleanup clears the registration. Read-only scenarios and stub mode schedule no role deletion.

Cleanup permits 200/204/404, matching the existing region cleanup policy. Authentication, authorization and server failures remain failures; they are not treated as successful cleanup. No retry or bypass was added.

### Live Region Details

The suite still resets/seeds through its existing guarded suite hook and obtains its Admin setup token there. **Region creation moved to `beforeEach`; deletion moved to `afterEach`.** Each case receives a distinct initial region name and returned ID. Country 143 and the existing expected short-name value remain explicit.

The existing by-ID read now also checks that the persisted initial name matches the newly created fixture. The next case does not discover its starting state from the preceding case's edited region. Both original save scenarios retain their request ID/name/parent/short-name assertions, response checks, dialog behavior and real rereads after reload.

Isolated lifecycle tests run the cases in reverse order, simulate an earlier edited record, verify separate IDs/names and exact-ID deletion, and run each case in a fresh harness by itself. Creation failures cannot reuse an earlier tracked ID. Cleanup authorization failures remain visible.

### Explicit Region list identity

Both read-only list fixtures explicitly use Russia's existing country ID 143. Search checks the actual response IDs against both captured fixture IDs, and locates the exact named table cell rather than the first row. The existing sort request/direction/row-order assertions and exact-ID suite cleanup remain. No global default country or helper behavior was changed.

## Selector, readiness and focus corrections

- The live duplicate-role warning now checks `p-toast .ui-toast-warn`, matching the custom template in `src/app/shared/base-layout/base-layout.component.html`. Its exact warning text and visibility assertion remain.
- Live UI login waits for the rendered `[data-cy="sign-in-page"]` before entering credentials, using the existing `pageLoadTimeout` budget already used by stub login. No global timeout was changed. Submit must be enabled before clicking.
- `fillMatInput()` checks visible/enabled state, uses `el.ownerDocument.activeElement` to focus the AUT input when necessary, then requires actual focus before normal typing. It no longer compares the AUT element with the runner document or forces click/typing through overlays. Programmatic focus also avoids clicking a floating Material label over an empty input.
- Touched live searches focus their actual inputs before clearing/typing. Live role inputs and navigation use normal actions. Unrelated existing actions were not broadly rewritten.

The shared input helper is also used by stub cases, so its owning-document behavior was exercised alongside all existing stub-auth isolated regressions. No authentication flow, JWT construction, session caching, endpoint, permission semantics or `noVisit` contract was changed. Live response intercepts remain observers, not successful response stubs.

## Isolated regressions and validation

New tests evaluate the actual TypeScript test/helper source in a closed VM with fake chain, HTTP and document objects. Unexpected imports or transport targets throw. They do not import an application database singleton, open a listener, hash real passwords or execute SQL. DOM command intent/focus behavior is characterized; actual Material/PrimeNG rendering is not claimed.

The 13 added tests cover:

1. Permissions response-ID ownership, scoped row actions and exact Admin cleanup.
2. Creation failures/invalid IDs cannot schedule deletion of another region.
3. Separate Details fixtures/cleanup in reverse scenario order after prior edits.
4. Complete Details fixture setup when either scenario is selected alone.
5. Failed Details creation cannot reuse an ID; cleanup denial remains a failure.
6. Role ID capture from the verified list and current UI Admin cleanup identity.
7. Seeded, noninteger, nonpositive, string and unsafe role IDs are rejected before DELETE.
8. Captured role cleanup survives a persisted-value assertion failure; 200/204/404 succeed and 401/403/500 fail.
9. Read-only Role cases and stub execution schedule no real cleanup.
10. Exact custom warning selector, message and visibility assertion.
11. Live page readiness precedes credentials, normal input actions and enabled submit.
12. AUT focus remains correct when runner-document focus disagrees.
13. Explicit Russia fixtures avoid country-list discovery and searched rows require their captured IDs.

| Check | Result |
| --- | --- |
| Starting isolated C1–C5 baseline | **134 passed, 0 failed, 0 skipped.** |
| Final complete isolated suite | **147 passed, 0 failed, 0 skipped, 0 cancelled.** Existing 134 plus 13 new. |
| Existing registration/preservation checks | **39 distinct original scenarios; 31 stub / 11 live registrations.** Original Sign In/Role assertions and generated Viewer/Admin names retained; existing C4 name-preservation checks remain. |
| Cypress/config TypeScript | `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` — passed. |
| Dedicated frontend TypeScript | `node node_modules/typescript/bin/tsc -p cypress/frontend/tsconfig.json --noEmit` — passed. |
| Node syntax | `node --check` on all five modified/new isolated `.test.mjs` files — passed. |
| Whitespace | `git diff --check` and explicit whitespace check of new files — passed. |
| Source scope | Starting-file SHA-256 comparison limits edits to the nine existing files listed above; two new files added. Protected guards, production/reset/bootstrap files and prior reports retain their hashes. |
| Browser, real service/database operations | **Not run. No runtime E2E pass claim.** |

Commands executed for validation were the installed Node executable with `--test cypress/safety/*.test.mjs` (also a diagnostic `--test-reporter=dot` invocation), the two no-emit TypeScript commands, the five syntax checks, Git whitespace/source inspection and read-only process/port inspection. No npm startup, Cypress CLI, backend health/identity probe or reset command was executed. Process inspection found only the existing Codex Node tool hosts, with no identified project backend/nodemon watcher or listener on 8080; unrelated processes were left untouched.

The existing isolated harnesses needed lifecycle/DOM vocabulary updates because production-like test code now uses per-case hooks and actual owning-document focus. Their assertions were retained. The assertion-preservation exception is limited to normal focus/clear/type replacing the two formerly forced live Role input chains; visibility and entered-value expectations are still required.

## C1–C5 protections retained

The following implementations are unchanged from the C7A starting state:

- `cypress/safety/policy.mjs`, `node.mjs`, `backend.mjs`, `cli-entry.mjs` and associated declarations.
- `cypress/support/execution-safety.ts`, Cypress configuration, Angular E2E configuration/entry and package scripts.
- `server/scripts/reset-test-db.mjs`, including C2 dependency preflight, guarded Windows/Unix CLI entry and reset authorization.

Exact mode/spec allowlists, stub reset/direct-request rejection, unmatched-stub failure, host blocking, fixed origins, frontend handshake, required support/test isolation, selected environment, canonical DB allowlist, loaded-client checks and backend/run identity checks remain. Existing negative C1–C5 regressions pass. No blanket response, live-to-stub conversion, skipped scenario, test retry, arbitrary sleep or new forced interaction was introduced. No meaningful assertion was weakened or removed.

## Remaining risks and runtime blockers

**Cleanup hooks cannot guarantee cleanup after a hard process crash.** A failed/interrupted request can also leave a created record before a valid ID has been captured, particularly if the Role list reload never completes. No broad name-based deletion is used to conceal that uncertainty. Cleanup can fail because credentials expire or the server is unavailable; those failures remain visible. A later reset/reprovision is permitted only after separate authorization of the verified disposable target.

The following C6 blockers remain deliberately unresolved:

- No disposable local PostgreSQL database, effective low-privilege credentials, server identity, database contents or ownership has been provisioned/verified/approved. Development and integration databases must not be assumed disposable.
- Schema reset still affects the entire shared target and has no cross-run lock. Exclusive serial ownership and absence of backend watchers/other workers remain prerequisites.
- Login IP/UA limiter memory survives database reset. All-in-one live execution still needs an approved fresh-backend/per-spec orchestration strategy. This phase neither disables limits nor changes orchestration.
- Existing seed credential logging, full permission diagnostics and sensitive Cypress command details remain deferred by instruction. Restrict artifacts and address diagnostic hygiene before live execution.
- Native hashing, actual PostgreSQL permissions/reset/seed behavior, cookies/auth hydration, real cleanup and browser actionability/selectors remain unverified. Removing forced interactions may reveal a real overlay/timing problem at runtime; it must be diagnosed, not hidden with force/retries.
- The existing animation-style/document-lifetime concern and broader live server-denial/session coverage remain separately scoped. No unrelated stabilization or auth coverage expansion was performed.

Do not provision a database, start services or run live Cypress as an automatic continuation of C7A. Follow the independently verified target, environment isolation, identity and destructive-operation approval gates in C6 under separate authorization.

**PHASE C7A — LIVE E2E FIXTURE OWNERSHIP & READINESS**

Production files changed: **0**. Real API/database operations: **0**. Commits/pushes: **0**.
