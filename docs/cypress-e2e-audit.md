# Cypress E2E infrastructure audit

Date: 2026-11-17. Repository: `cards-sql-app`. Reviewed revision: `f10e20c`.

## Executive summary

The infrastructure has useful UI permission, sign-in, role-editing, and toponym coverage, but the broad Cypress commands are not safely separated into stub and live runs. **The stub run selects live specs that unconditionally invoke a destructive PostgreSQL reset.** The reset also has stale password-module imports that would fail after its destructive statements, if database initialization reaches that point.

There are **20 findings: 1 CRITICAL, 3 HIGH, 14 MEDIUM, and 2 LOW**. These describe infrastructure defects, coverage weaknesses, and conditional risks; they do not establish a production application defect or an actual production-data incident. Address mode selection and reset safeguards before repairing the live runner or broadening execution.

Static review also confirmed an incorrect fixture-helper return value, an invalid users-list stub, an unreachable initial-refresh stub, and several tests whose assertions do not establish their named behavior. Download, authorization recovery, sorting, deletion, and save persistence are the most important assertion gaps.

Only this report was created. No Cypress tests, fixtures, support files, configuration, dependencies, scripts, backend, or production files were changed. No Cypress run, application server, database reset, login request, or data mutation was executed. The Cypress TypeScript no-emit check passed; this is not a runtime test result.

## Method, evidence, and limits

- Read every file in the requested Cypress directories, the sole matching root configuration, and the relevant package scripts. Traced directly referenced reset, database, frontend auth, schema, address-filter, and download code without importing the reset module.
- Verified findings by source inspection, reference searches, TypeScript parsing, module-existence checks, and a pure Windows path/URL comparison. Did not inspect private `.env` contents, database contents, real credentials, or application services.
- Installed Cypress package metadata reports **15.20.0**; `package.json:91` declares `^15.1.0`. Recommendations use existing APIs and do not require an upgrade. Current official documentation was consulted for interception, command yielding, isolation, and actionability; version-specific newer APIs are not proposed.
- **Confirmed bug/coverage defect:** the code directly establishes an incorrect infrastructure behavior or an assertion gap. **Risk:** a proven pattern has conditional consequences requiring a controlled run or environment knowledge. **Optional improvement:** maintainability work without a demonstrated runtime failure.
- Severity considers destructive capability, reach, and loss of confidence. CRITICAL does not mean production destruction was observed. No runtime failures, flake frequency, current pass count, or actual deployment/database target is claimed.
- Line references below are repository-relative and refer to the reviewed revision. Ranges identify the relevant implementation, not a proposed change.

## Reviewed file inventory

All 18 primary infrastructure files were reviewed in full. Case counts are static declarations after expanding the Viewer/Admin loop; mode-dependent skips mean they are not a per-run pass count.

| File | Role and observed coverage |
| --- | --- |
| `cypress.config.ts:1–79` | Global collection, localhost defaults, mode flag, reset task, disabled alternative task implementations. |
| `cypress/tsconfig.json:1–17` | Strict, no-emit TypeScript project for the Cypress tree and frontend declarations. |
| `cypress/support/constants.ts:1` | Wildcard API prefix. |
| `cypress/support/commands.ts:1–235` | `login`, `fillMatInput`, type augmentation, stub/live branches, disabled session alternative. |
| `cypress/support/e2e.ts:1–86` | Support registration, `skipIf`, `visitApp`, language setup, global style hook. |
| `cypress/fixtures/example.json:1–5` | Unreferenced starter fixture. |
| `cypress/fixtures/roles-empty.json:1` | Used by role deletion/reload. |
| `cypress/fixtures/roles-list.json:1–34` | Used by role listing and create/reload composition. |
| `cypress/fixtures/toponyms.json:1–42` | Two regions and one country; shared by both stub region suites. |
| `cypress/e2e/sign-in.cy.ts:1–186` | 6 cases: form validation, success, 401, 423, 429, pending button state; mixed mode. |
| `cypress/e2e/roles.cy.ts:1–540` | 10 cases: 1 common, 7 stub, 2 live; create/cancel, duplicate names, inline edits, delete, permission-group merge. |
| `cypress/e2e/permissions.cy.ts:1–210` | 8 cases: limited/admin navigation, route denial, create-button presence, 401 retry, 403 retention; stub permission responses. |
| `cypress/e2e/toponyms/_helpers.ts:1–79` | Real HTTP login, country selection, region creation/deletion. Not a collected spec. |
| `cypress/e2e/toponyms/regions.stub.cy.ts:1–162` | 2 cases: initial rows and sort-triggered request. |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:1–331` | 7 cases: list, search, sorting, details, delete, download, country selection. |
| `cypress/e2e/toponyms/regions.live.cy.ts:1–55` | 2 cases: seeded-region search and sort attribute. |
| `cypress/e2e/toponyms/permissions.live.cy.ts:1–101` | 2 generated cases: Viewer and Admin UI capabilities. |
| `cypress/e2e/toponyms/details.live.cy.ts:1–171` | 2 cases: save-in-place and save-and-exit UI transitions. |

This is **8 spec files, 39 declared cases**, plus one shared E2E helper. No focused `.only` test was found. The explicit `it.skip` selector in `cypress/e2e/roles.cy.ts:18` and runtime `skipIf` calls in the sign-in suite are mode selection, not evidence of an accidental skipped regression.

Related sources inspected in targeted sections:

| Source | Reason |
| --- | --- |
| `package.json:5–35`, `package.json:91`; installed package metadata | Actual runner/orchestration scripts and Cypress version. |
| `README.md:61–89`; `docs/frontend-phase7j-closure-review.md:118` | Existing test conventions and the scope of the recorded 8/8 result. |
| `.gitignore:1–52`; `tsconfig.json`; `angular.json:32–66` | Artifact exclusions, separate TypeScript projects, frontend environment selection. |
| `server/scripts/reset-test-db.mjs:1–250` | Directly invoked destructive task, seeding, credentials, CLI entry. |
| `server/database.js:1–58`; `server/security/passwords.mjs` | Effective database selection and current password utility location. |
| `server/tests/int/helpers/testEnv.js:5–27,46–50` | Existing dedicated-test-database guard and per-test isolation convention. |
| `src/environments/environment.ts:5–8`; `src/environments/environment.prod.ts:1–4` | Actual Angular API origins, independent of Cypress helper environment variables. |
| `src/app/services/auth.service.ts:61–84,189–210`; `src/app/pages/sign-in/sign-in.component.ts:55–79` | Login completion, permission readiness, initialization requests. |
| `src/app/services/user.service.ts:157–197`; `shared/schemas/user.schema.ts:622–628` | Users-list response validation. |
| `src/app/services/address.service.ts:137–204`; `shared/schemas/toponym.schema.ts:190–241`; `server/routes/toponyms-api.js:70–90` | Fixture/response shapes and region-create envelope. |
| `src/app/pages/toponyms-lists/regions-list/regions-list.component.ts:23–39,78–83`; `src/app/pages/toponyms-lists/toponyms-list/toponyms-list.component.ts:226–249,419–429` under the same pages directory | Default country, filter configuration, download implementation. |
| `src/app/shared/address-filter/address-filter.component.html:5–34`; `src/app/shared/address-filter/address-filter.component.ts:92–141,395–423`; `src/app/services/file.service.ts:31,59–66`; `src/index.html:2` | Empty country option, hierarchy reset, file URL construction, default language. |

### Existing strengths worth preserving

- Most nontrivial flows use aliased HTTP waits and retryable DOM assertions. The two fixed `cy.wait(150)` calls are localized, rather than a suite-wide timing strategy.
- Stable `data-cy` selectors already exist for authentication, navigation, role controls, and many table actions.
- The role rename success test checks request identity/name and the updated UI (`cypress/e2e/roles.cy.ts:245–277`); the busy-create test actively rejects an unexpected POST (`:359–364`); role deletion verifies the deleted label disappears (`:328–349`).
- The live region search checks the unique seeded name (`cypress/e2e/toponyms/regions.live.cy.ts:40–48`). The limited-role guarded-route test checks the exact `/forbidden` result (`cypress/e2e/permissions.cy.ts:54–56`).
- Stub bodies, seed account names, and static token strings are visibly test-oriented. No real personal dataset or genuine bearer credential was identified in the reviewed Cypress files. This is a source observation, not a secret-scanning certification.
- Browser test isolation is not explicitly disabled. The reset code uses the test environment branch and propagates errors; neither fact substitutes for validating the actual database destination.

## Mode and environment behavior

| Entry point/spec group | Actual behavior |
| --- | --- |
| `cypress:run`, `cypress:open` | Default/live flag; broad spec collection. |
| `cypress:run:stub`, `cypress:open:stub`, `e2e:stub:*` | Set `USE_STUBS=1` but still collect all matching specs. Stub orchestration starts/waits for the frontend only. |
| `cypress:run:live`, `cypress:open:live`, `e2e:live:*` | Set `USE_STUBS=0` but still collect stub specs and the stub permission suite. Live orchestration starts the test API and frontend. |
| `cypress/e2e/sign-in.cy.ts`, `cypress/e2e/roles.cy.ts` | Internal partial mode selection; database reset in their live branches. |
| `cypress/e2e/toponyms/*.live.cy.ts` | No mode guard; reset task and real API setup run even under the stub command. |
| `cypress/e2e/toponyms/*.stub.cy.ts` | No mode guard; business responses remain stubbed even under the live command, while shared login switches to live. |
| `cypress/e2e/permissions.cy.ts` | Always stubs permission/auth-recovery responses; shared login switches by global flag. Placeholder role credentials are used by its calls. |

There are three independent target choices: the browser `baseUrl`, helper `API_URL`, and PostgreSQL environment variables. Angular requests use its compiled `environment.apiUrl`, not `Cypress.env('API_URL')`. Defaults are localhost, but no common test-environment identity or target allowlist is enforced.

## Findings and minimal recommended fixes

### E01 — CRITICAL — Stub collection executes destructive live setup

**Classification: confirmed infrastructure bug.**

**Evidence:** `cypress.config.ts:10` collects every `.cy.ts`; `package.json:24–35` only changes flags and never narrows specs. `cypress/e2e/toponyms/regions.live.cy.ts:10–20`, `cypress/e2e/toponyms/details.live.cy.ts:10–20`, and `cypress/e2e/toponyms/permissions.live.cy.ts:38–47` unconditionally call `db:reset` and real API helpers. The task is registered regardless of mode (`cypress.config.ts:17–32`) and reaches `DROP SCHEMA ... CASCADE` / `sync({ force: true })` (`server/scripts/reset-test-db.mjs:17–28`).

**Impact:** Running the advertised stub command can destroy the configured test schema or fail partway through setup, even without a frontend action. This is a concrete destructive execution path; whether its database is disposable is unverified. Browser intercepts cannot protect these Node-side API requests: [`cy.request()` bypasses intercepts](https://docs.cypress.io/api/commands/request).

**Minimal fix:** Explicitly collect the intended spec set for each mode, preserving common cases; add a second fail-closed mode check inside the reset task and live setup. Stub mode must reject reset/real fixture writes, not merely rely on filenames. The live command must exclude stub-only scenarios, including `cypress/e2e/permissions.cy.ts` unless explicitly run as a separate stub job. Do not repair the broken seeder and then run broad stub commands before these guards exist.

**Acceptance evidence:** Inspect collected filenames in each mode, demonstrate that stub mode rejects a reset without opening a DB connection, and run stub cases with application API egress denied. Live validation must use a verified disposable target.

### E02 — HIGH — Destructive reset has no destination identity safeguard

**Classification: risk; production access is not demonstrated.**

**Evidence:** `cypress.config.ts:20–25` forces `NODE_ENV=test` and supplies a fallback dotenv path, but accepts an inherited `DOTENV_CONFIG_PATH`. The reset imports its DB singleton and directly drops/recreates the schema (`server/scripts/reset-test-db.mjs:2–24`). `server/database.js:30–44` selects `DB_LINK_TEST` without checking that its host/database is disposable. In contrast, the integration harness explicitly checks for a test database before importing infrastructure (`server/tests/int/helpers/testEnv.js:9–27`).

**Impact:** A misconfigured `DB_LINK_TEST` or inherited environment can direct destructive operations at shared/non-test data. The label `test` does not validate the actual destination. A process-local imported Sequelize singleton also makes changing environment values after initialization unreliable.

**Minimal fix:** Before any connection/schema operation, validate the resolved database host/name against a dedicated E2E allowlist, require explicit live/reset authorization, and fail closed on unknown configuration. Load the intended env deterministically before database imports. Use separate least-privilege credentials and a disposable database; do not expose credentials in diagnostics. Adopt the intent of the integration guard, with a stronger explicit destination check rather than assuming a name substring alone proves safety.

**Acceptance evidence:** Reject a non-test destination, missing/ambiguous environment, and stub-mode reset before the DB client connects; verify API and reset point to the same dedicated environment. No such negative target test was executed during this audit.

### E03 — HIGH — Reset seeding imports a removed password module after destructive work

**Classification: confirmed infrastructure bug.**

**Evidence:** Both `server/scripts/reset-test-db.mjs:109` and `:151` import `../controllers/passwords.mjs`. That file does not exist; `server/security/passwords.mjs` exists and exports the current password helpers. Reset order drops the schema, synchronizes models, seeds roles, then calls the first broken user seeder (`:21–27`).

**Impact:** If database initialization succeeds, the reset fails during admin seeding with a missing-module error after destructive work has already occurred. The expected reset completion marker cannot be returned through that path. Other earlier environment/database failures are also possible; a live failure was not reproduced.

**Minimal fix:** After E01/E02 safeguards, update only the reset script's stale imports to the current utility. Preflight required helper modules before destructive operations so this class of import error cannot occur after the schema is dropped. Keep real hashing and seeded roles unchanged.

### E04 — MEDIUM — `createRegion()` loses the created entity, silently disabling cleanup

**Classification: confirmed helper bug.**

**Evidence:** `cypress/e2e/toponyms/_helpers.ts:63–64` ends with `.its('body').then((b) => {b.data})`, with no return. The backend returns `{ code, data: toponym }` (`server/routes/toponyms-api.js:88–90`). Callers read `r.id` in `cypress/e2e/toponyms/regions.live.cy.ts:17–18` and `cypress/e2e/toponyms/details.live.cy.ts:18–19`; their cleanup is conditional on that ID (`:24` and `:25`, respectively).

**Impact:** The yielded value remains the response envelope, not `body.data`, so these IDs are undefined and cleanup is skipped. Cypress explicitly preserves the previous subject for an undefined-returning callback containing no Cypress commands: [`.then()` yielding rules](https://docs.cypress.io/api/commands/then).

**Minimal fix:** Yield `body.data` explicitly and type the helper's response/entity return. Assert a positive created ID at setup. Preserve the current HTTP fixture creation and idempotent-delete policy; do not replace API setup with fake models.

### E05 — HIGH — Stub mode has real-network escape paths and late permission stubs

**Classification: risk supported by confirmed registration gaps.**

**Evidence:** The stub `login` submits a form and waits for sign-in (`cypress/support/commands.ts:154–168`) without stubbing `/api/auth/permissions`. Suites register that stub after calling `cy.login` (`cypress/e2e/permissions.cy.ts:29–31`, `cypress/e2e/roles.cy.ts:135–139`, `cypress/e2e/toponyms/regions.stub.cy.ts:104–114`, `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:153–163`). Production login requests permissions before completing (`src/app/services/auth.service.ts:61–84`). The sign-in suite's stub setup has no permission response at all (`cypress/e2e/sign-in.cy.ts:14–43`). Admin permissions coverage also opens `/roles` without stubbing its role-table endpoint (`cypress/e2e/permissions.cy.ts:117–124`). No fail-on-unhandled-API policy is registered in support.

**Impact:** Requests triggered during login can reach a real API before the intended stub exists. A later visit may recover and allow the test to pass, hiding the dependency. A logged-in path assertion can coexist with a failed business-data request. Unexpected mutations in nominally stub tests can also escape where no write stub exists, such as the busy-rename case in E09. Exact runtime timing and current backend availability are unverified.

**Minimal fix:** Register scenario permission and initial-data responses before login/navigation. Add a stub-only guard that rejects unhandled application API traffic, including writes, while preserving intentional scenario overrides. Scope it to API traffic, not all static assets. Treat direct `cy.request` helpers separately because browser interception does not block them. Use scenario-specific responses rather than a blanket successful `{ data: null }` stub.

### E06 — MEDIUM — Successful users-list stubs violate the current response contract

**Classification: confirmed fixture-contract bug.**

**Evidence:** `cypress/support/commands.ts:125–128` and `cypress/e2e/sign-in.cy.ts:23–30` return `data: { users: [], length: 0 }`. `src/app/services/user.service.ts:157–197` validates with `usersSchema`, which strictly requires `list`, not `users` (`shared/schemas/user.schema.ts:622–628`).

**Impact:** These HTTP 200 stubs produce a response-validation error when consumed. Assertions limited to navigation or a create button can stay green while the users table is in an error state. This is not evidence that the real users endpoint has the wrong contract.

**Minimal fix:** Correct both stub envelopes to the existing schema and assert the intended empty-list/table state. Keep validation enabled. A small typed fixture or schema check would prevent drift; do not relax the production schema to accommodate the stubs.

### E07 — MEDIUM — The intended first-refresh 401 is shadowed by the later 200 stub

**Classification: confirmed interception bug.**

**Evidence:** `cypress/support/commands.ts:76–82` registers a one-use refresh 401, then `:85–88` registers an unrestricted refresh 200 for the same method/path. Default intercept processing starts with the most recently registered matching route; a static response ends processing. [Cypress interception order](https://docs.cypress.io/api/commands/intercept).

**Impact:** The later 200 consumes matching requests, so the helper does not implement its documented initial-unauthenticated state. `times: 1` does not give the older route priority. Startup authentication/redirect behavior can be masked.

**Minimal fix:** Use one explicit request sequence, or register a fallback before the one-use override. Assert the intended first response and subsequent authenticated behavior. Do not change application guards to fit the helper's current accidental session.

### E08 — MEDIUM — Permission and auth-recovery assertions admit false positives

**Classification: confirmed coverage defects.**

| Evidence | What the test does not establish | Minimal strengthening |
| --- | --- | --- |
| `cypress/e2e/permissions.cy.ts:59–65` | An immediate `body.then` absence check can pass before `/users` is authorized/rendered, or on a different page. | Establish exact route, permissions readiness, and a visible allowed page element before checking the denied action. Use a retryable scoped assertion. |
| `cypress/e2e/permissions.cy.ts:117–133` | Test titles promise action permissions, but only Create is checked; Edit/Delete assertions are comments and no representative records are supplied. | Supply a minimal valid row and check intended permitted/denied actions after table readiness. |
| `cypress/e2e/permissions.cy.ts:163–187` | Waiting on `protected`, `refresh`, `protected` does not inspect statuses, refreshed token use, request count, or temporal ordering. A hydration refresh after `visit` can satisfy the refresh alias. | Assert the 401 and successful retry, correlate the recovery refresh with that failure, and inspect the retry's authorization and final page readiness. |
| `cypress/e2e/permissions.cy.ts:190–207` | `pathname !== '/session/sign-in'` also allows `/forbidden` or another wrong route. No assertion proves session usability, no recovery refresh, or error feedback. | Assert the intended route remains, a later authenticated operation succeeds, and the expected error state is shown without a recovery refresh. |
| `cypress/e2e/sign-in.cy.ts:96–141` | Error visibility alone does not prove unified credentials/lock/throttle messages. The 429 test reads text without asserting it; its header and body deliberately provide different retry values. | Assert the intended translated error and the documented retry-value precedence, without guessing whether 75 or 120 is correct. |

These are missing checks, not proof of broken authorization or refresh logic. Preserve the exact guarded-route assertion already present at `cypress/e2e/permissions.cy.ts:54–56`.

### E09 — MEDIUM — Several CRUD, normalization, and sort tests prove too little

**Classification: confirmed coverage defects.**

| Evidence | False-positive boundary | Minimal strengthening |
| --- | --- | --- |
| `cypress/e2e/roles.cy.ts:189–231` | Busy-rename title promises no update, but no PATCH guard/assertion exists. UI rollback can pass alongside an unintended write. | Reject unexpected updates, as the busy-create test already does at `:362–364`. |
| `cypress/e2e/roles.cy.ts:281–324` | PATCH count is checked before the final Enter/output transition, so a later duplicate caused by that transition is not covered. | Check completed workflow and relevant request count after that transition; avoid adding an arbitrary sleep. |
| `cypress/e2e/roles.cy.ts:475–483` | For 304, the expected busy-name result is not inspected; a still-visible dialog alone can result from another error. | Make the assertion independent of a missing 304 body, e.g. control caching for this check and assert the semantic duplicate result plus no create. |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:190–195` | Conditional, unanchored `/елка|ёлка|елка\\s*/` accepts untrimmed or unnormalized text; request fields are checked only if type already matches. | Assert the type and exact intended normalized search value for the explicit input. |
| `cypress/e2e/toponyms/regions.stub.cy.ts:140–159`; `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:212–221`; `cypress/e2e/toponyms/regions.live.cy.ts:51–53` | Generic GET/status, alias waits, or mere existence of `aria-sort` do not prove direction, selected column, request parameters, or row order. | Inspect each intended sort state/parameter and a small contrasting row order. |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:120–131,249–268` | Delete reply does not alter the subsequent table fixture; final assertion only requires rows to exist. Wrong-ID or ineffective deletion can pass. | Check ID/reason, return remaining rows after success, and assert the deleted row is absent while the other row remains. |
| `cypress/e2e/toponyms/details.live.cy.ts:90–105,164–169` | Save checks a numeric duplicate-check country ID and UI mode/closure; it does not verify the write's identity, changed name, successful response, or persistence after reload. | Observe the exact write and reopen/reload the seeded record to assert the persisted change and intended dialog transition. |

Do not replace real live requests with stubs to strengthen these tests. The role success assertions described in the strengths section should remain.

### E10 — MEDIUM — Download test explicitly succeeds when its expected effect is absent

**Classification: confirmed false-positive test and unstubbed request path.**

**Evidence:** `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:272–297` spies on `window.open`; when it is not called, `:284–292` checks only that the clicked button still exists. Production uses `FileService.downloadFile()` and `saveAs(blob, name)` (`src/app/pages/toponyms-lists/toponyms-list/toponyms-list.component.ts:419–429`), with an HTTP Blob request (`src/app/services/file.service.ts:59–66`), not the commented location-navigation implementation. That request has no dedicated stub in this suite.

**Impact:** A failed or absent download can pass, and the download can contact a backend during a stub run. The strict branch does not exercise the current normal download implementation.

**Minimal fix:** Intercept the exact template GET with a small synthetic file, assert its filename/path and successful response, then verify the produced download through the supported file/download boundary. Remove the conditional success fallback. Keep file contents synthetic and do not require a real server for this stub scenario.

### E11 — MEDIUM — Country-change scenario actually selects the empty option

**Classification: confirmed mismatch between fixture, actions, name, and assertion.**

**Evidence:** The fixture has only Russia (`cypress/fixtures/toponyms.json:34`), the Regions page defaults to country 143 (`src/app/pages/toponyms-lists/regions-list/regions-list.component.ts:31–36`), and the select also renders an empty option (`src/app/shared/address-filter/address-filter.component.html:11–14`). The test chooses the first nonselected option (`cypress/e2e/toponyms/toponyms-list.stub.cy.ts:300–311`), then asserts the Region control has the disabled class (`:316–319`) despite its title saying “enables Region.”

**Impact:** With the current setup this exercises clearing the country, not switching to another populated country and enabling Region. Clearing correctly disables descendants (`src/app/shared/address-filter/address-filter.component.ts:404–420`). The later reselection of Russia (`:321–328`) does not check that Region becomes enabled. This is not a confirmed deterministic failure and is not evidence of a production hierarchy defect.

**Minimal fix:** Make the scenario explicit. Preserve the clear/reset behavior as such, and use a second country with appropriate response data if the intended coverage is switching countries and enabling Region. Assert selected values, actual request IDs, and downstream state. Do not change filter behavior to match the misleading name.

### E12 — MEDIUM — Browser isolation does not isolate the shared live database

**Classification: risk; no parallel/retry failure was reproduced.**

**Evidence:** Live suites reset the whole schema in `before`, not per test (`cypress/e2e/toponyms/regions.live.cy.ts:10–20`, `cypress/e2e/toponyms/details.live.cy.ts:10–20`, `cypress/e2e/toponyms/permissions.live.cy.ts:38–47`; also the mixed live branches). Details cases operate on the first unfiltered row (`cypress/e2e/toponyms/details.live.cy.ts:44–46,119–121`) and edit shared data. Permission setup creates a region without cleanup (`cypress/e2e/toponyms/permissions.live.cy.ts:46–48`). Live role creation has no corresponding deletion (`cypress/e2e/roles.cy.ts:486–538`). Other region cleanups are presently defeated by E04.

**Impact:** A retried or individually rerun test can see mutated seed state; concurrent workers/runners pointed at one DB can erase one another's fixtures. An interrupted `after` cannot guarantee isolation. Default browser isolation does not reset PostgreSQL.

**Minimal fix:** Until isolated DBs exist, document/enforce serial live execution on a dedicated disposable database. Give each independently runnable mutating case deterministic setup, use the returned record identity rather than the first row, and add bounded/idempotent cleanup for created entities. Use separate databases per worker if parallelism is later enabled. Do not introduce a global production cleanup endpoint.

### E13 — MEDIUM — Timing heuristics and broad aliases obscure readiness

**Classification: flake risk; frequency is unknown.**

**Evidence:** `cypress/e2e/toponyms/details.live.cy.ts:87,162` uses `cy.wait(150)` as stabilization. The sign-in pending-state test relies on a 400 ms delayed response (`cypress/e2e/sign-in.cy.ts:149–151,179–181`), leaving a finite window for observing the disabled button. “Optional” hierarchy waits in `cypress/e2e/toponyms/details.live.cy.ts:58–61,133–136` are actually unconditional. The same broad table alias is consumed after multiple rapid sort clicks (`cypress/e2e/toponyms/toponyms-list.stub.cy.ts:214–221`, `cypress/e2e/toponyms/regions.stub.cy.ts:148–159`).

**Impact:** A sleep cannot establish form readiness; a slow runner can miss a transient pending state. A reused alias can refer to an earlier reload rather than the intended final action. The hierarchy fetch currently follows default initialization, so its waits are not classified as a proven timeout bug; their stated optional contract is misleading.

**Minimal fix:** Wait on concrete enabled/ready form state and the exact save/request boundary. Hold/release a stubbed sign-in response around the pending assertion instead of depending on a 400 ms window. Correlate sort requests with expected parameters. Either document a required hierarchy request and assert it, or use observable UI readiness when that request is truly optional. [Cypress guidance on explicit waits](https://docs.cypress.io/app/core-concepts/best-practices#Unnecessary-Waiting).

### E14 — MEDIUM — Global animation stabilization targets the document that visits replace

**Classification: confirmed ineffective setup under the current visit pattern.**

**Evidence:** `cypress/support/e2e.ts:53–62` appends styles to the current document in a root `beforeEach`. All specs subsequently perform `cy.visit`/login visits. With default isolation the browser starts each test on a blank page; a subsequent visit replaces that document, discarding the injected style. [Cypress test isolation](https://docs.cypress.io/app/core-concepts/test-isolation).

**Impact:** The comment promises animation suppression that is not present in the newly loaded application. The style also forces overlay opacity/transform and disables label pointer events (`:58–59`), which could mask real interaction defects if moved wholesale into the application document.

**Minimal fix:** If animation suppression is necessary, apply a narrowly scoped transition/animation policy to each actual AUT document through visit/load handling. Keep overlay visibility, transforms, and hit-testing intact. Retain at least a small normal-actionability path. Do not disable test isolation to preserve these styles.

### E15 — MEDIUM — Forced actions and fallback selectors weaken user-path fidelity

**Classification: reliability/false-positive risk, with a concrete focus-helper defect.**

**Evidence:** `fillMatInput` force-clicks/types and compares AUT elements with the spec runner's global `document.activeElement` (`cypress/support/commands.ts:43–52`), rather than their owning document. Details/delete use unions containing any `button[matMenuTriggerFor]` followed by `.first()` (`cypress/e2e/toponyms/toponyms-list.stub.cy.ts:228–230,253–259`; `cypress/e2e/toponyms/details.live.cy.ts:44–46,119–121`). Live permission checks also use global English text/icon matches (`cypress/e2e/toponyms/permissions.live.cy.ts:86–97`). Some actions intentionally force through overlays (`cypress/e2e/toponyms/regions.stub.cy.ts:147–155`).

**Impact:** DOM order can select another menu/record, library-class changes can break selectors, and forced actions can bypass obstructions that prevent a user acting. The focus comparison does not establish actual AUT focus. [Cypress documents that forcing bypasses actionability checks](https://docs.cypress.io/app/core-concepts/interacting-with-elements#Forcing).

**Minimal fix:** Scope existing `data-cy` selectors to the identified row/dialog, assert identity and readiness, and re-query after actions that can rerender controls. Use `el.ownerDocument.activeElement` or a focused-element assertion for the focus helper. Remove forced actions incrementally where normal interaction succeeds; keep any necessary exception explicit. Use the existing `visitApp` language setup for tests asserting English labels. Current HTML defaults to English (`src/index.html:2`), so a locale failure is a portability risk, not a confirmed current failure. [Selector guidance](https://docs.cypress.io/app/core-concepts/best-practices#Selecting-Elements).

### E16 — MEDIUM — API helper targets and browser application targets can disagree

**Classification: environment consistency and security risk.**

**Evidence:** Helper requests use `Cypress.env('API_URL')` (`cypress/support/commands.ts:208–214`, `cypress/e2e/toponyms/_helpers.ts:2,15,33,54,72`); Angular uses its compiled development/production environment (`src/environments/environment.ts:5–8`, `src/environments/environment.prod.ts:1–4`). Most browser stubs use `**/api/...` regardless of host (`cypress/support/constants.ts:1`, `cypress/support/commands.ts:70–138`). `package.json:34–35` checks local API health, but not the identity of the API the frontend actually uses or the DB reset target.

**Impact:** Overriding helper `API_URL` does not retarget Angular. Setup can create rows in one environment while UI calls another; wildcard stubs can conceal an incorrect origin, and unstubbed calls can escape there. Pointing `baseUrl` at a production build is not made safe by the helper's localhost default.

**Minimal fix:** Validate a single explicit E2E target contract: expected frontend origin/build, actual browser API origin, helper API origin, and dedicated database identity. Fail live startup on inconsistency and reject non-test service origins. In stub runs reject unexpected API origins/requests rather than letting a wildcard response imply the target is safe. Keep localhost defaults.

### E17 — MEDIUM — Credential/token-bearing setup lacks explicit log minimization

**Classification: conditional exposure risk, not a confirmed committed secret.**

**Evidence:** `fillMatInput` types the supplied value without `log: false` (`cypress/support/commands.ts:51–52`), including password calls at `:158,226`. Both live login helpers use default-logged `cy.request` with password bodies (`cypress/support/commands.ts:211–216`, `cypress/e2e/toponyms/_helpers.ts:13–23`); fixture requests carry the bearer token. The seed script prints known test passwords (`server/scripts/reset-test-db.mjs:139,181`). The live permissions suite dumps the full permission response (`cypress/e2e/toponyms/permissions.live.cy.ts:25–27`). Admin credentials can be overridden through environment values (`:15–16`). `.gitignore` has no explicit Cypress screenshots/videos/downloads exclusions, and `video: false` does not establish a screenshot/log retention policy.

**Impact:** Real test-session tokens or environment-supplied credentials can be exposed in runner details, terminal logs, failure artifacts, or uploaded reports. The checked-in static token strings are obvious stubs; the fixed seed passwords are test credentials, not evidence of stolen production secrets.

**Minimal fix:** Suppress password typing and credential/token-bearing request logs, remove seed password/full-response logging, and document restricted artifact retention and synthetic-only accounts/data. Never use production credentials. Keep useful status/operation diagnostics without bodies or authorization headers. The `.type()` command's logging option is documented in [Cypress typing options](https://docs.cypress.io/api/commands/type#Arguments).

### E18 — LOW — Manual reset command has a Windows entry-point mismatch

**Classification: confirmed platform-specific helper bug; separate from the active task.**

**Evidence:** `package.json:16` runs the reset script directly. Its entry check compares `import.meta.url` to ``file://${process.argv[1]}`` (`server/scripts/reset-test-db.mjs:245–249`). On this Windows workspace, `pathToFileURL(resolvedScriptPath).href` does not equal that constructed string. This was verified using path conversion only, without importing/executing the reset script. Also, the script's fallback `DOTENV_CONFIG_PATH` assignment (`:6–7`) occurs after its static `dotenv/config` import (`:2`); the package command preloads dotenv before either.

**Impact:** Direct invocation can import the module but skip `reset()` and its success/failure handling. The script-body dotenv fallback cannot select the file retroactively. The Cypress task explicitly calls `mod.reset()` and is not protected by this CLI mismatch.

**Minimal fix:** Once reset safety is addressed, use a canonical URL/path comparison and provide the env path before dotenv loads. Validate CLI entry behavior without touching a database, then test the actual reset only on the verified disposable target. Do not “fix” this by deleting the entry guard and causing imports to reset data.

### E19 — LOW — Duplicated setup, dead code, and weak helper types invite drift

**Classification: optional maintainability improvements with confirmed unused items.**

**Evidence and bounded cleanup candidates:**

- Region permissions/data/navigation setup is nearly duplicated in `cypress/e2e/toponyms/regions.stub.cy.ts:6–133` and `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:10–182`. Keep scenario-specific responses/actions visible; share only small stable setup primitives.
- `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:3–8` contains an unused API import, `as` helper, and `fxToponyms` wrapper. `cypress/e2e/roles.cy.ts:34` declares an unused `SeedRole` type.
- `cypress/fixtures/example.json:1–5` has no reference. `cypress/fixtures/toponyms.json:3` (`regions.request`), `:35–40` (`regionsByCountry143`), and `:41` (`emptyList`) are not consumed by the current suites. The other three fixture files are used; do not delete them as a bulk cleanup.
- Disabled login/session implementations occupy `cypress/support/commands.ts:141–152,171–205`; disabled task alternatives and their now-unused imports occupy `cypress.config.ts:3–5,36–76`. The `.session(...)` in that comment is not an active session cache.
- `login` is declared `Chainable<any>` (`cypress/support/commands.ts:32–38`); fixture row transformations and the download spy use explicit `any` (`cypress/e2e/toponyms/regions.stub.cy.ts:76`, `cypress/e2e/toponyms/toponyms-list.stub.cy.ts:101,284`). Strict TypeScript therefore does not enforce those response contracts or catch E04.
- `noVisit` is not honored consistently: stub login always visits sign-in and uses the flag only to omit a final path check (`cypress/support/commands.ts:154–168`); live branches always visit (`:219,224`). Callers then revisit and attach observers after login. Define the option's intended meaning before changing it, preserving each suite's auth setup.
- `skipIf` uses an ignored internal `cy.state('runnable')?.skip()` API and is declared to return `void` (`cypress/support/e2e.ts:25–30,72`). Prefer the existing definition-time mode selection style where possible, after E01's explicit collection rules are in place.
- `cypress/tsconfig.json:12–15` does not include the root `cypress.config.ts`, so the passing Cypress typecheck does not validate that file. No dedicated Cypress typecheck script exists in `package.json:5–35`.

**Minimal fix:** Remove only reference-verified dead items, replace weak helper/fixture types, and consolidate the repeated stub setup in small steps after behavior assertions are strengthened. Review all call sites before changing helper options. Add config typing to an appropriate static check in a separately approved cleanup; no new generic fixture framework or session cache is needed.

### E20 — MEDIUM — Important negative and real-session boundaries lack E2E protection

**Classification: coverage risk, not evidence of application vulnerabilities.**

**Evidence:** The full inventory is concentrated on auth, roles, and Regions. `cypress/e2e/permissions.cy.ts:117–133` omits Edit/Delete assertions; the live permissions suite checks UI presence only (`cypress/e2e/toponyms/permissions.live.cy.ts:51–98`). No active spec asserts cookies, logout, session expiry, refresh rejection, or server denial of a forbidden write. The helper stores an API token in `Cypress.env('ACCESS_TOKEN')` (`cypress/e2e/toponyms/_helpers.ts:5–7,20–23`); browser isolation does not by itself give that spec-level value role/session ownership. Current helper setup uses it as admin, so this is not a demonstrated viewer privilege bypass.

**Minimal additions, in priority order:**

1. On a guarded disposable live environment, verify a Viewer cannot perform one representative create/update/delete request and that data remains unchanged; pair with a permitted Admin action. UI hiding alone does not verify server authorization.
2. Verify the real cookie/session boundary: login, reload hydration, logout and subsequent denial; inspect applicable HttpOnly/Secure/SameSite attributes for the configured environment without printing cookie values. Test rejected refresh and concurrent 401 recovery in a controlled stub scenario, asserting exact outcomes.
3. Cover unauthorized direct navigation, revoked/changed permissions after refresh, and representative disabled action behavior. Keep real role identity visible and scope any future cached session by user, mode, and target, with validation. Do not add `cy.session` solely for speed before ownership is clear.
4. Add denied/cancelled/failed write checks for existing role/toponym workflows: duplicate/restricted delete, failed save preserves edits, cancel emits no write, successful update survives reload, exact permission-change request body. Avoid duplicating the stronger existing role tests.
5. After the runner is safe, select a small number of business-critical cross-page flows outside Regions/roles, such as Order creation/recovery and a denied/allowed operation. Choose them from business impact rather than adding every page. Add keyboard/focus interaction to an existing dialog flow before claiming accessibility coverage.

Frontend auth/routing/component tests and real-DB integration tests already exist and should retain fine-grained cases. New browser tests should protect browser/network/session boundaries those layers cannot establish, rather than reproduce their entire test matrix.

## Security assessment

| Question | Evidence-based result |
| --- | --- |
| Real PII in reviewed fixtures? | No real personal dataset identified. Region names, role metadata, sample names, and the starter `hello@cypress.io` address appear synthetic/public examples. No private dataset was inspected. |
| Real static tokens committed in scope? | No genuine credential identified; the static `tok_*` / `acc_*` values are plainly stub tokens. Live helper tokens exist at runtime and need log protection (E17). |
| Password handling? | Fixed local seed credentials are checked in and printed by the seeder. Environment overrides and default request/typing logs create conditional exposure risk; do not reuse these accounts outside disposable tests. |
| Production writes prevented? | Not established. Default origins are localhost and `NODE_ENV=test` selects `DB_LINK_TEST`, but destructive target identity and browser/API origin safeguards are missing (E01/E02/E16). No production access or write was performed or observed. |
| Browser stubs block DB helpers? | No. `cy.task` and Node-side `cy.request` remain real operations; a mode flag and wildcard intercept are not a security boundary. |
| Artifacts safe to publish? | Not established. No real artifacts were produced here. Restrict screenshots/logs/downloads to synthetic data and review retention before publishing them. |

## Commands, validation performed, and safe execution boundaries

### Performed during this audit

| Check | Result |
| --- | --- |
| Primary inventory and references | All 18 infrastructure files reviewed; 8 specs / 39 static cases identified. |
| Static Cypress TypeScript | `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` — passed, exit 0. Does not execute Cypress/config/reset or contact services. |
| Reset dependency/path checks | Old password module missing, current utility present, Windows CLI comparison false. Checks used file existence/path conversion only. |
| Runtime Cypress, API requests, database reset, server startup | Not executed. Current full-suite result is unknown. |
| Repository scope / whitespace | Only `docs/cypress-e2e-audit.md` added; tracked/staged diffs empty and `git diff --check` clean. Explicit new-file comparison reported no whitespace errors (exit 1 for the new-file difference); a static scan also found no trailing whitespace. Git emitted only an LF-to-CRLF normalization notice. |

The previous **8/8** result in `README.md:73` is explicitly historical (`:76`). Its source identifies `cypress/e2e/permissions.cy.ts` under stub mode (`docs/frontend-phase7j-closure-review.md:118`). It is not evidence that all eight spec files or live paths currently pass. There is no new pass/fail baseline from this read-only audit.

### Existing commands to report, not execute against unknown services

| Command | Actual prerequisites / caution |
| --- | --- |
| `npm run cypress:run:stub` / `npm run e2e:stub:run` | **Do not treat as isolated/safe today:** broad selection includes destructive live setup (E01). The orchestrated version starts only the frontend. |
| `npm run cypress:open:stub` / `npm run e2e:stub:open` | Opening a chosen spec is still mode-dependent; selecting a live spec can invoke reset. An interactive UI is not a safety guard. |
| `npm run cypress:run` / `npm run cypress:open` | Default to live behavior and collect mixed modes. Need E01/E02 fixes first. |
| `npm run cypress:run:live` / `npm run e2e:live:run` | Destructive/live. Require validated disposable DB, matching frontend/API target, repaired seeder, explicit mode collection, and serial ownership. The orchestrated command starts the API using `api:test`. |
| `npm run api:test` | Selects `NODE_ENV=test`, port 8080, `server/.env.test`; still requires independent confirmation that its DB/services are dedicated and disposable. Not started here. |
| `npm run reset:test:db` | Destructive intent, with the additional Windows CLI defect E18. Do not use as a harmless readiness check. |
| `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` | Safe static check, performed here; root config is outside this project's include. |
| `git diff --check` | Safe static tracked-diff check; also check the new untracked report explicitly. |

An existing narrowly selected example is `npm run cypress:run:stub -- --spec cypress/e2e/permissions.cy.ts`. It avoids the live specs' reset hooks, but is **not certified network-isolated** because of E05/E06/E07. Run it only after verifying a local synthetic frontend/API environment or implementing the stub fail-closed policy. Likewise, selecting only `cypress/e2e/toponyms/*.stub.cy.ts` avoids live reset hooks but still has unhandled-request gaps. No runtime command is recommended for execution against an unknown target.

## Prioritized action plan

| Priority / batch | Findings | Smallest useful change | Evidence required before continuing |
| --- | --- | --- | --- |
| P0 — Make execution safe | E01, E02, E16 | Explicit stub/live collection; reject resets in stub mode; validate database/service identity before connection. | Stub job selects no live hooks, rejects unexpected API traffic, and cannot call DB reset. Unsafe/mismatched target configurations fail before connecting. |
| P1 — Repair live fixture infrastructure | E03, E04, E18 | Correct existing reset imports/entry handling; preflight dependencies; return/type created region; assert fixture IDs. | Static/path checks, then one isolated live spec on the approved disposable DB; verify setup and cleanup. Do not run broad live suites yet. |
| P1 — Make stub auth/data deterministic | E05, E06, E07 | Register permissions before login; fix users response; define refresh sequence; fail unhandled application API calls. | Narrow affected specs pass with no real API access; required UI/table readiness is asserted. |
| P2 — Close misleading assertions | E08–E11 | Strengthen existing tests for recovery, deny readiness, no-write guarantees, persistence, sorting/search, download, and country reset/change. | Each test fails when its named effect is absent and passes for its intended behavior; preserve useful existing assertions. |
| P2 — Remove flake/ownership risks | E12–E15 | Deterministic live fixture identity, serial DB ownership, condition-based readiness, scoped selectors and normal actions. | Repeated and individually selected affected cases pass on synthetic isolated targets; reruns do not depend on previous cases. |
| P2 — Limit diagnostic exposure | E17 | Redact/suppress credential-bearing logs and define artifact handling. | Inspect synthetic run output/failure artifacts; no passwords, cookie values, tokens, or sensitive response bodies are emitted. |
| P3 — Maintainability and focused gaps | E19, E20 | Small setup deduplication, dead-item removal, stronger typing; add a few high-value browser boundaries. | Static checks plus explicitly separated stub and live jobs; report per-job specs/cases and any intentional skips. |

Keep changes incremental and reviewable. Preserve real PostgreSQL/API behavior in live tests and response validation in stub tests. Do not hide current failures with blanket success stubs, forced actions, longer waits, retries, broader status allowances, skipped cases, or weakened assertions. Session caching, framework upgrades, a generic fixture framework, and wider production refactoring are not prerequisites for the recommended fixes.

## Audit completion

Deliverable: `docs/cypress-e2e-audit.md` only. Cypress source/configuration changes: **0**. Production/backend/schema changes: **0**. Dependency/script changes: **0**. Test additions/removals: **0**. Application/database mutations: **0**. Commits/pushes: **0**.

Runtime findings remain unverified where explicitly labeled as risks. Confirmed findings are established by the cited code and static checks; no claim of a current full Cypress pass, production incident, or measured flake rate is made.
