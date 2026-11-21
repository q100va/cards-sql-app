# PHASE C4 — CYPRESS ASSERTION INTEGRITY

Date: 2026-11-17. Scope: **E08–E11 only**. References: `docs/cypress-e2e-audit.md` and the C1/C2/C3 implementation reports.

## Result and execution boundary

The existing authentication/permission, Roles, and Regions scenarios now check their promised outcomes: page readiness, recovery ordering and token use, specific error messages, rejected writes, exact search/sort parameters, entity identity, persisted saves, Blob download effects, and country clearing/reselection.

**133/133 isolated checks pass: 114 existing C1/C2/C3 checks + 19 new C4 checks.** TypeScript, Node syntax, scenario/assertion preservation, scope hashes, and whitespace checks pass. All **39 distinct existing E2E scenarios** remain: **31 stub / 11 live registrations**, with three scenarios shared between modes. No E2E case was added, removed, skipped, or weakened. Only the two inaccurate download/country labels were corrected.

**No Cypress browser, application server, real HTTP/API/database connection, reset, schema operation, migration, or bootstrap command was executed.** Browser rendering, native download completion, and real persistence remain runtime-unverified. These results establish static contracts and rejection of incorrect observations in isolation; they do not claim a green E2E run.

## Exact C4 file changes

The workspace already contained uncommitted C1/C2/C3 changes. This inventory describes only the C4 increment, measured against a 662-file starting hash snapshot.

| Existing file modified | C4 change |
| --- | --- |
| `cypress/e2e/permissions.cy.ts` | Authorized page readiness before denied Create; actual Admin Create/Edit/Delete controls; post-hydration 401 recovery sequence and authenticated retry; 403 feedback, exact route, zero refresh, and subsequent successful authenticated operation. |
| `cypress/e2e/sign-in.cy.ts` | Deterministic English locale; exact 401/423/429 messages and statuses; retry-value precedence; continued sign-in route and usable submit button after failure. |
| `cypress/e2e/roles.cy.ts` | Busy-name write rejection and notification; single PATCH through editor exit; exact deletion and survivor; create payload/response/reload values; uncached live duplicate/free-name responses. |
| `cypress/e2e/toponyms/regions.stub.cy.ts` | Typed existing fixture and sort-dependent response order; meaningful shared sort assertions. |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts` | Exact search normalization; sort order; card/deletion identity; stateful delete/reload fixture; synthetic Blob download; explicit clear/reselect country scenario. |
| `cypress/e2e/toponyms/regions.live.cy.ts` | Second owned region for observable sort order; cleanup of both exact IDs; isolated search and real request/order assertions. |
| `cypress/e2e/toponyms/details.live.cy.ts` | Open the created entity; verify duplicate-check/write identity and values; check save mode; reload/reopen and verify persisted response/input values for both save paths. |
| `cypress/safety/execution-safety.test.mjs` | Replace the obsolete exact-body freeze with original-case and meaningful-assertion preservation, allowing the explicitly stronger status checks. No execution-policy assertion was removed. |
| `cypress/safety/reset-fixtures.test.mjs` | Give the two fake region creations distinct IDs; verify cleanup of each; keep the existing single-region/details and invalid-ID checks. Allow the new sort assertion import without running test bodies in fixture-hook isolation. |

| New file | Purpose |
| --- | --- |
| `cypress/e2e/toponyms/_assertions.ts` | Small shared Region sort/order assertions and fixture type used by the three affected sort scenarios. No generic fixture framework. |
| `cypress/fixtures/users-permissions.json` | One synthetic User with the current strict list/detail DTO, sufficient to expose real permission-controlled actions. |
| `cypress/fixtures/template-regions-download.json` | Small base64 XLSX response with one synthetic header row; filename and MIME type. |
| `cypress/safety/assertion-integrity.test.mjs` | Nineteen isolated callback, mutation, fixture-contract and static preservation checks with fake Cypress/HTTP/browser/fixture dependencies. |
| `docs/cypress-phase-c4-assertion-integrity.md` | This report. |

Total: **9 existing files modified, 5 files added**. All other baseline files remain identical, including C1 policy/config/support, C2 reset/helpers, C3 defaults/login/isolated tests, production source, schemas, dependencies, scripts and lockfiles. `server/scripts/bootstrap-admin.mjs` was neither modified nor executed.

## E08 — authentication and permissions

### Readiness and actions

Limited Create absence is now checked only after permissions and Users data respond successfully, the exact `/users` route is established, the allowed table is visible, and its overlay is absent. Menu denials use retryable `not.exist` checks. The existing `/audit` → `/forbidden` assertion is retained.

The Admin Roles scenario waits for permissions/data and verifies Create, Delete for role 1, and a real editable name input before exiting without changes. The Admin Users scenario supplies a valid synthetic list/detail response before navigation, identifies user 71, checks Create and the row's Delete action, opens that user's card, and verifies the enabled Edit control. Production `usersSchema` and `userSchema` accept the fixture in isolation; the legacy envelope remains rejected.

### Recovery and denial

The 401 scenario completes initial login and reload hydration before installing recovery observers. It then triggers the Users sort operation. The protected `POST /api/users/get-users` must receive exactly one **401**, followed by one successful **refresh 200**, then exactly one **retry 200**. Handlers enforce order, the same sort/page intent, and the new `Bearer acc_new_token` on the retry. Alias waits independently check response statuses, and the returned user must render on `/users`.

The 403 scenario also starts after hydration. It requires the specific 403/code and translated permission error, rejects any refresh immediately, and keeps the exact `/users` route. A later sort must return and render a valid user using the unchanged bearer token, demonstrating continued session usability. The final counters require two business requests and zero recovery requests. An unintended logout/write still fails through the unchanged C1 unhandled-request policy.

Sign-in 401 and 423 require their exact English error messages. The 429 fixture deliberately keeps body `retryAfterSec: 75` and header `Retry-After: 120`: **75 takes precedence**, as implemented by `err?.error?.data?.retryAfterSec ?? Number(err?.headers?.get?.('Retry-After')) ?? 60` in `src/app/pages/sign-in/sign-in.component.ts:83`. The test requires “Too many attempts. Try again in 75 sec.” Each error keeps the sign-in route and re-enables submit. No production auth, guard, refresh, JWT, error mapping or retry logic changed.

**False positives now detected:** checking absence on an unauthorized/unrendered page; missing Admin Edit/Delete controls; hydration refresh mistaken for recovery; missing/wrong/out-of-order statuses; stale retry token; duplicate retry/refresh; a 403 refresh/logout/redirect; an unusable session after denial; generic or incorrect error messages; header 120 incorrectly winning over body 75.

## E09 — CRUD, search and sorting

- Busy rename and busy creation reject PATCH and POST throughout the scenario, including the live duplicate check. Both require a successful duplicate result/code, translated duplicate notification, and the existing rollback/open-dialog behavior. Live name-check spies remove conditional cache headers so an unconditional semantic 200/body check replaces the old body-less 304 allowance. They remain live HTTP operations.
- Description editing checks the PATCH body, rejects any second PATCH in its handler, and checks the count again after Enter and the output transition. Existing count/input/output assertions remain.
- Role deletion requires the role-1 DELETE path/status, reloads a fixture containing role 2 and only its permission cells, and checks role 1's absence plus role 2's continued presence. Role creation additionally checks name/description payload, returned name and the matching reloaded entity/values; existing close/list assertions remain.
- Search requires `type=region`, **exactly `search=елка`** for input `  ЁЛКА `, `exact=false`, page zero and country 143. Conditional/unanchored acceptance of wrong or unnormalized values is removed. Existing empty-table/no-data assertions remain.
- All three sort scenarios assert the Name column's actual `aria-sort` states, exact request column/direction/search/page/page-size/country, successful responses, and contrasting DOM row order. Stub replies sort the existing two Region fixtures according to the requested direction. Expected DOM orders are explicit, independent of the stub sorting calculation.
- The app starts with the service sort `name/asc` while MatSort is initially unselected. The first click selects ascending without requiring another request; the second requests descending; clearing MatSort restores the service's ascending fallback. Assertions follow the executable implementation rather than assuming a reload for the unchanged first state.
- The live sort scenario creates a second contrasting region through the existing HTTP helper after API login; both returned IDs are cleaned up. It searches its unique prefix before sorting. No live setup operation was replaced by a stub. The C2 fake-hook regression now verifies both distinct cleanup IDs.
- Region card/delete workflows target fixture 101 rather than the first available button. Delete checks type, ID and `destroy=true`; the successful stub removes only 101 from subsequent replies. Both the reload payload and DOM must show survivor 102 and exclude the deleted entity.
- Both live save paths identify the created region, check the exact duplicate-check parameters, update method/body including ID/name/short name/country, and successful response. `justSave` must remain open in View with the persisted name; `saveAndExit` must close. Each path reloads, searches, reopens that ID, and checks server-returned and displayed persisted values. The setup reads the current created entity so either existing scenario can run independently of the other's prior rename.
- Touched live read spies remove conditional cache headers where response bodies are asserted. The two existing 150 ms waits are replaced by concrete form/readiness and write completion checks required by these workflows; no general timing/selector cleanup was attempted.

**False positives now detected:** rollback with a hidden write; duplicate PATCH after editor exit; unrelated/server-error duplicate responses; 304 without the promised result; deleting another entity or leaving the deleted row; wiping unrelated rows; changed search meaning; sorting another column/direction/page or displaying the wrong order; saving the wrong record/parent/value; closing or switching modes without successful persistence.

## E10 — observable Blob download

The existing scenario now matches `FileService.downloadFile()` → HTTP Blob → `saveAs(blob, name)`. It registers an exact template GET response with synthetic XLSX bytes before the click. It checks method/path/status/MIME type, spies on the real browser `URL.createObjectURL` and anchor `dispatchEvent` methods, and requires:

1. Exactly one Blob URL creation.
2. An actual download-anchor click with `download="template-regions.xlsx"` and that exact Blob URL.
3. The HTTP Blob MIME type and bytes matching the synthetic response.

The browser spies call their original methods; they do not manufacture a successful save. The obsolete `window.open` stub and conditional success fallback are removed. No filesystem task or network-policy exception was added. Only this scenario answers this precise download route; the existing C3 regression still rejects an unsupported download in contexts without the specific response.

**False positives now detected:** no request, wrong path/status/type, no Blob save, Blob URL creation without an anchor click, wrong filename/URL, or altered file bytes. The fixture is independently parsed with installed ExcelJS and contains only `name`/`shortName` headers.

**Unverified browser boundary:** the assertion follows the installed FileSaver download-anchor branch used by Chromium/Electron. Native download-manager/filesystem completion and other browser-specific FileSaver branches were not exercised. The test has no alternative success path for absent effects.

## E11 — explicit clear and reselect

The existing misleading “changing country” test is now named **“clearing country disables Region; reselecting Russia reloads and enables it.”** It checks the initially selected Russia/enabled Region, selects the actual empty option, requires a table request without country/region filters, and checks empty values plus disabled Region (`aria-disabled=true`).

Reselecting Russia requires the Regions request with `ids=143`, the expected returned region IDs, the country-filtered table request, the displayed country, enabled Region (`aria-disabled=false`) and the exact available Region options. This preserves the original clear/reselect behavior. It does not claim switching between populated countries; no unnecessary second-country fixture or filtering change was introduced.

**False positives now detected:** selecting a different nonempty option while claiming to clear, retaining stale filter IDs/values, failing to disable Region, fetching regions for another country, failing to re-enable it, or displaying unrelated options.

## Validation

| Check | Result |
| --- | --- |
| Starting `npm run test:e2e:safety` | **114 passed, 0 failed, 0 skipped** before C4 edits. |
| Final `npm run test:e2e:safety` | **133 passed, 0 failed, 0 skipped**: 53 C1 + 46 C2 + 15 C3 + 19 C4. |
| `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` | Passed, exit 0; specs, helpers, support and root Cypress config. |
| `node --check` on each `cypress/safety/*.mjs` file | Passed: **8 modules**, syntax only. |
| AST scenario preservation | Passed; all 39 original distinct scenarios retained, only the two documented label corrections, no `it.skip`/`it.only` introduced. |
| Original Sign-in/Roles assertion preservation | Passed. Exact executable-body equality was intentionally replaced with original meaningful assertion checks. The 304 status allowance is replaced by 200; the live-create success-status assertion moves into its payload callback with the same accepted statuses. All other original assertions remain. |
| C4 negative-observation checks | Passed; actual test handlers/callbacks reject incorrect HTTP/order/token/search/sort/delete/save/download/country observations. DOM command contracts are inspected statically; no DOM renderer is simulated or claimed. |
| Fixture contracts | Passed against actual strict User/Users and Roles schemas; XLSX parsed in memory. |
| Baseline source-hash scope comparison | Passed; exactly nine baseline Cypress/test files changed, all other baseline files identical. |
| `git diff --check` and explicit whitespace scan of new files | Passed. |
| Cypress/live API/DB/reset/migration/bootstrap | **Not run.** |

The existing C1/C2/C3 checks all remain and pass. Two structural preservation checks needed narrow updates because C4 deliberately changes assertions and introduces a second sort fixture; neither change relaxes authorization, target validation, isolation or network rejection. The final isolated suite also checks the newly added helper/types and both corrected scenario labels.

## Preserved protections, deferred findings and risks

- C1 origin/host blocking, spec/mode selection, required support/isolation, frontend handshake, live backend identity, disposable-target/environment validation, reset authorization and unhandled-request rejection are unchanged.
- C2 password/dependency preflight, dotenv/entry-point behavior, import-versus-execute distinction, region entity return validation and cleanup guards are unchanged.
- C3 early explicit permissions/startup stubs, strict empty Users response, refresh fallback/one-use initial 401 registration order and later-scenario precedence are unchanged. The new responses are scenario-specific, not blanket successful API replies.
- Production application logic, auth/authorization, response schemas, dependencies/configuration, database scripts and bootstrap behavior received **zero C4 changes**. No arbitrary sleep, test retry, force interaction, skip or broad `any` was added.
- E12–E20 remain outside this phase (apart from the previously completed C1/C2 findings). Shared live-database concurrency/retry isolation, remaining timing/selectors, credential/artifact logging, generic dead-code/setup cleanup, and additional real cookie/session/server-denial coverage are not addressed here. The existing controlled 400 ms sign-in loading response remains unchanged.
- Real selector visibility, Material/PrimeNG rendering, native FileSaver behavior and actual backend persistence must still be verified in a separately authorized runtime phase. Isolated tests cannot prove these browser/service behaviors. C4 supplies stronger checks for that future execution, without using stubs in live workflows.

Blocked/not executed commands include all Cypress `run`/`open` commands, `test:e2e`, `cy:*`, `e2e:*` orchestration, `api:e2e`/`api:test`, `reset:test:db`, direct reset invocation, migrations/schema operations, and production/bootstrap commands. No real service target was contacted or authorized. No commit or push was made.

**PHASE C4 — CYPRESS ASSERTION INTEGRITY**
