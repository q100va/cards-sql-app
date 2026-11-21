# PHASE C5 — CONTROLLED STUB E2E VALIDATION

Date: 2026-11-18. Runtime: Cypress 15.20.0, headless Electron 138, Node 22.11.0, Windows.

## Safety acceptance: blocked

**The browser results are green, but C5 does not satisfy the required no-backend/no-database criterion.** A pre-existing repository-wide `nodemon` process restarted the ordinary backend after a test-file edit. This was discovered during final cleanup. Runtime work was stopped; the dedicated frontend was terminated. The unrelated watcher was not stopped or contacted.

The preflight verified Cypress collection, guards and child-process environment isolation, but failed to identify the existing watcher's file-change side effects before editing. That omission should have blocked editing until the watcher was isolated.

Evidence:

- Before startup, OS socket metadata showed an existing Node listener on port 8080, PID 33108. No request was sent to it.
- During cleanup, that listener was a different Node process, PID 32440, running `server/server.js` under a pre-existing `nodemon` parent, PID 26544.
- The edited `cypress/safety/assertion-integrity.test.mjs` has last-write time **2026-11-18 18:35:46 UTC**; the new backend process was created at **18:35:47 UTC**, one second later. This matches the watcher's default monitoring of `.mjs` files. No local/global nodemon configuration or extension/config command override was found.
- `server/server.js:22` awaits `initInfrastructure()` before listening. `server/app.js:243` authenticates Sequelize and calls `Model.sync({ force: false, alter: false })` before returning. The restarted listener therefore reached the normal database-initialization path. Permission synchronization and, depending on its inherited environment, retention work are also normal startup paths.

**Database initialization occurred outside the controlled Cypress process tree.** Its configured database target, data changes and other startup connections were not inspected. It is not possible to confirm that no real database was contacted or that its data remained unchanged. No reset, migration, bootstrap, `api:e2e`, `api:test`, or live Cypress command was issued, but the watcher restart is an unintended violation of the broader execution requirement.

The remaining work after discovering this condition was read-only verification, preservation of generated artifacts, and this Markdown report. Markdown is outside the observed watcher's default JavaScript/JSON extensions. No further application or test execution was performed.

## Browser and isolated-test results

Latest genuine browser results for each approved spec:

| Spec | Passed | Failed | Pending/skipped | Evidence log |
| --- | ---: | ---: | ---: | --- |
| `cypress/e2e/sign-in.cy.ts` | 6 | 0 | 0 | `affected-2.log` |
| `cypress/e2e/roles.cy.ts` | 8 | 0 | 0 | `affected-2.log` |
| `cypress/e2e/permissions.cy.ts` | 8 | 0 | 0 | `affected-2.log` |
| `cypress/e2e/toponyms/regions.stub.cy.ts` | 2 | 0 | 0 | `affected-2.log` |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts` | 7 | 0 | 0 | `toponyms-3.log` |
| **Latest per-spec total** | **31** | **0** | **0** | |

This total combines the latest verified results after affected-spec reruns. There was no additional all-five green run after the final Regions-list fixes: only that affected spec was rerun. Earlier failures and automatic hook-related skips are recorded below; they are not reported as passes.

- Mandatory initial isolated safety baseline: **133 passed, 0 failed, 0 skipped**.
- Final isolated safety suite: **134 passed, 0 failed, 0 skipped** — all previous 133 checks plus one new card-hierarchy contract check. Existing header/selector/binary checks were strengthened.
- Cypress TypeScript no-emit check, isolated-test syntax check and `git diff --check`: passed.
- Native downloaded `template-regions.xlsx`: **6,404 bytes**, SHA-256 identical to the existing synthetic fixture's decoded bytes.

These are valid Cypress test results for the guarded stub browser traffic. They do not override the separate watcher/database safety failure above.

## Mandatory preflight findings

The audit and all four C1–C4 implementation reports were read before application startup. Current source was checked rather than relying on historical pass claims.

| Requirement | Evidence/result |
| --- | --- |
| Exactly five approved stub/shared files | `cypress/safety/policy.mjs` supplies the explicit five-file stub list. `configureCypress()` replaces collection settings; independent Node and browser checks enforce mode/file selection. Actual banners collected one, four or five specifically selected approved files as requested. |
| No live spec in stub mode | Live-only files are excluded and independently rejected. Shared Sign-in/Roles files register only common/stub cases in this mode. No live case was collected. |
| Reset rejection | Stub `db:reset` rejects before importing reset infrastructure. Mandatory isolated negative tests passed. No real reset was attempted. |
| Direct API fixture rejection | Stub `cy.request` is rejected before its original implementation. Isolated negative checks passed. No direct real API fixture request was made. |
| Unhandled browser API rejection | Required first middleware checks origins; the fallback destroys unmatched API requests. `blockHosts='!localhost:56379'` is the independent outbound backstop. Real execution demonstrated the fallback rejecting the missing district response. |
| Dedicated local frontend | `npm run start:e2e` used the Angular `e2e` build/serve configuration, `cypress/frontend/main.ts`, and its dedicated tsconfig. The compiled environment was non-production with the fixed localhost API origin. The required frontend handshake remained enabled. |
| Approved frontend origin only | Frontend fixed to `http://localhost:56379`; visits/origins/support/test isolation and host blocking remained enforced. Root `proxy.conf.json` was not configured by this serve target. No backend proxy was started. |
| Inherited secrets/settings | Child environments were cleared and populated from an explicit OS-path allowlist. A fresh temporary user/application-data profile and two separate empty npm config files prevented inherited user settings/credentials. `.env` contents were not loaded for the stub launch. `NODE_OPTIONS`, DB/PG selectors, production settings, proxy variables, Cypress record keys and arbitrary `CYPRESS_*` overrides were not inherited. |
| Runner background traffic | `CI=1`, `NG_CLI_ANALYTICS=false`, crash reporting and Cypress internal telemetry disabled, `--record false`, cached binary only. Installed runner source returns local version metadata in run mode; no installation/update command was run. |
| Isolated safety suite | All 133 existing tests passed before frontend/Cypress startup in a cleared child environment. |
| Existing workspace services | **Preflight incomplete.** Port 8080 was observed without contact, but its nodemon ownership was not investigated before watched-file edits. This invalidates overall no-database acceptance. |

## Commands and launch isolation

Commands below are the actual executable/script arguments. They were launched through native `ProcessStartInfo` with `EnvironmentVariables.Clear()`, `UseShellExecute=false`, `CreateNoWindow=true`, the workspace as working directory, and the explicit environment described above. PowerShell execution policy was not changed.

```text
C:\Program Files\nodejs\node.exe --test cypress/safety/*.test.mjs
npm run start:e2e
npm run cypress:run:stub -- --browser electron --record false --spec cypress/e2e/sign-in.cy.ts
npm run cypress:run:stub -- --browser electron --record false --spec cypress/e2e/roles.cy.ts,cypress/e2e/permissions.cy.ts,cypress/e2e/toponyms/regions.stub.cy.ts,cypress/e2e/toponyms/toponyms-list.stub.cy.ts
npm run cypress:run:stub -- --browser electron --record false --spec cypress/e2e/sign-in.cy.ts,cypress/e2e/roles.cy.ts,cypress/e2e/permissions.cy.ts,cypress/e2e/toponyms/regions.stub.cy.ts,cypress/e2e/toponyms/toponyms-list.stub.cy.ts
npm run cypress:run:stub -- --browser electron --record false --spec cypress/e2e/toponyms/toponyms-list.stub.cy.ts
C:\Program Files\nodejs\node.exe node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit
C:\Program Files\nodejs\node.exe --check cypress/safety/assertion-integrity.test.mjs
git diff --check
```

`start:e2e` expanded to `ng serve --configuration e2e --port 56379 --host localhost`. The Cypress script expanded to `cross-env E2E_MODE=stub cypress run --project . --env USE_STUBS=1,API_URL=http://localhost:8080` plus the displayed selection/browser/record arguments. No orchestration that starts an API was used.

Other operational checks used `Get-NetTCPConnection`/`Get-CimInstance` without service requests, a bounded frontend-only HTTP GET with proxies and redirects disabled, SHA-256 comparison of the synthetic download, and source hashes. The owned frontend was stopped with `taskkill.exe /PID 24764 /T /F` only after verifying its command was this phase's `npm run start:e2e`. Its process tree contained the frontend/compiler, not the pre-existing API watcher. Port 56379 was absent afterward; the unrelated 8080 listener remained.

### Execution history

Logs are under `C:\Users\Owner\AppData\Local\Temp\cards-c5`.

| Invocation/log | Actual result and reason for next action |
| --- | --- |
| Initial temporary `.ps1` launcher attempt | Windows execution policy rejected it before startup. Native inline commands were used subsequently; policy was not bypassed/changed. |
| Initial native frontend launch | npm rejected using the same `NUL` path as both user/global config. Two separate empty temporary configs corrected it; no application started in that failed attempt. |
| Successful frontend launch / `frontend.log` | Dedicated frontend built and served successfully. It was stopped after browser validation. |
| `signin.log` | One spec/six cases: **4 passed, 2 failed**. Established intercepted auth requests and blocked external stylesheets before proceeding to other stub files. |
| `remaining-launch-failure.log` | No specs ran: `spawn powershell.exe ENOENT`. Added the standard Windows PowerShell executable directory to the clean PATH, then launched the same four files. |
| `remaining-initial.log` | Four specs/25 cases: **4 passed, 5 failed, 16 automatically skipped** after hook failures. |
| `affected-1.log` | Five affected specs/31 cases: **5 passed, 5 failed, 21 automatically skipped**. An added early refresh wait was itself too early for cold bootstrap. |
| `affected-2.log` | Five affected specs/31 cases: **25 passed, 2 failed, 4 automatically skipped**. First four specs fully green; remaining failures isolated to the final Regions-list spec. |
| `toponyms-1.log` | Only affected Regions-list spec: **5 passed, 2 failed**; missing district response and Buffer serialization identified. |
| `toponyms-2.log` | Same affected spec: **2 passed, 1 hook failed, 4 automatically skipped**; the reload permission wait could begin before cold application bootstrap. |
| `toponyms-3.log` | Same affected spec after readiness ordering correction: **7 passed, 0 failed/skipped**. |
| `safety-final.log` | **134 isolated tests passed**. An intermediate extra shared refresh wait had consumed an alias expected by one existing isolated check; removing that unnecessary wait restored the original contract without changing the C3 test. |

No configured test retries or `.skip`/`.only` changes were introduced. Manual reruns followed concrete test/launcher corrections; passing unaffected specs were not rerun after the final Regions-only fixes.

## Failures, root causes and test-only corrections

| Exact spec/scenario | Relevant error/evidence | Classification and correction |
| --- | --- | --- |
| `sign-in.cy.ts` — `renders and keeps submit disabled until form is valid` | `[data-cy="sign-in-card"]` not found within 4 seconds; screenshot showed a blank page with lazy script chunks still arriving. | Cold test readiness. Wait for the rendered sign-in page within the existing `pageLoadTimeout` budget before form assertions. No fixed sleep/global timeout change. |
| `sign-in.cy.ts` — `429 → shows throttling message with remaining seconds (STUB mode only)` | `expected undefined to equal '120'` at lowercase-only header lookup. | Cypress preserved `Retry-After` casing. Lookup is case-insensitive while still requiring header 120, body 75, exact message and unchanged precedence. Isolated checks reject absent/wrong values. |
| `roles.cy.ts` first shared case; `permissions.cy.ts` Limited menu; `regions.stub.cy.ts` `loads table`; final Regions-list `loads initial table` — initial beforeEach hooks | `[data-cy="user-input"]` missing within 4 seconds. | Same cold-bootstrap problem in shared **stub-only** login. Wait for rendered sign-in page before credentials. Existing sign-in/permissions waits and C3 refresh route priority remain intact. |
| Intermediate Sign-in/shared-login hooks | `cy.wait()` found no `refresh`/`refreshInit` request within its 5-second request window. | The added network wait preceded lazy app startup. Sign-in now checks page readiness first; the unnecessary new shared refresh wait was removed. No request deadline/retry was inflated. |
| `permissions.cy.ts` — `403 is propagated (no logout); user stays on page` | Warning visibly said “Not enough permissions.” but `.p-toast-detail` was absent. | Actual template uses `p-toast .ui-toast-warn`. Corrected that selector and the two stub busy-role toast selectors while preserving message/severity assertions. The unexecuted live-role selector remains outside this cleanup. |
| Final Regions-list — `search normalizes text and triggers reload (ё→е, trim, lower)` | Normal input click was covered by its Material floating label. | Click the associated native label and require input focus before typing. Exact normalized request assertions remain. No force click/viewport workaround. |
| Final Regions-list — `sort toggles and reloads` beforeEach | `nav-toponyms` missing after a premature forced profile-menu click; later, the second `perms` request had not begun within 5 seconds. | Wait for exact `/users` and rendered/settled allowed table using the existing page-load budget, then verify the successful permissions response and navigate through visible menus with normal clicks. Three forced navigation clicks were removed. |
| Final Regions-list — `opens details card via row menu` | C1 threw `Unhandled API request in stub mode`. Screenshot showed `GET /api/toponyms/get-toponyms-list?ids=101&typeOfToponym=districts`. | Missing scenario-specific hierarchy fixture. Added only GET/path/type/ID-101 matching response `{ data: [] }` in this card test. Require a completed 200/valid empty list and exact request IDs; legitimate cancelled older requests are tolerated only alongside a completed response. |
| Final Regions-list — `download template saves the HTTP Blob with the expected filename and bytes` | Byte comparison failed; saved file began `{"type":"Buffer","data":[...]}` and was 21,513 bytes. | Cypress serialized the Buffer object as JSON. Installed runner source explicitly supports ArrayBuffer; the stub now supplies an exact-length ArrayBuffer. Existing HTTP/MIME/anchor/filename/Blob-byte assertions remain and pass. Saved XLSX bytes now exactly match the 6,404-byte synthetic fixture. |

All demonstrated browser failures above were test setup, selector or stub-response defects. No production application fix was made. The separate nodemon/database event is an environment safety failure, not a Cypress assertion failure.

## Requests and isolation evidence

- Auth, Users, Roles, Regions, deletion, hierarchy and download requests were answered by explicit scenario/support stubs. Actual 401 → refresh → token-bearing retry and 403-without-refresh assertions passed in the browser.
- The missing **districts/region-101** request was destroyed and failed by C1 before an API response; it did not fall through to the pre-existing backend. Its correction is restricted to that card scenario. Other unhandled requests still fail closed.
- External Google Fonts/Material icon stylesheets and the CDN stylesheet in the application shell were blocked by the proxy policy. Failure screenshots show blocked stylesheet HTTP 503 responses. No host exception was added; missing remote fonts visibly affect icon rendering.
- Repeated process-scoped socket checks during controlled browser execution observed no established/SYN-sent connections to port 8080 or non-loopback addresses from the owned Cypress process tree. Internal Cypress control/proxy traffic and the approved frontend were loopback.
- These checks are samples, not a host-wide packet capture. **They do not cover the unrelated nodemon backend's startup connections.** The newly observed real server initialization prevents the requested global “no database contacted” confirmation.

## Exact files changed

Compared with the C5 starting source-hash snapshot:

| Existing file | Change |
| --- | --- |
| `cypress/support/commands.ts` | Rendered-page readiness before stub login credentials; live branch unchanged. |
| `cypress/e2e/sign-in.cy.ts` | Page readiness and post-readiness refresh assertion; case-insensitive Retry-After header assertion. |
| `cypress/e2e/permissions.cy.ts` | Correct custom warning-toast selector. |
| `cypress/e2e/roles.cy.ts` | Correct the two stub duplicate-warning selectors; live scenario unchanged. |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts` | Settled navigation, native label/focus interaction, exact card hierarchy stub/assertions, binary ArrayBuffer response. |
| `cypress/safety/assertion-integrity.test.mjs` | Header-casing negatives, correct toast contracts, native focus/readiness checks, ArrayBuffer assertion, one new exact card-hierarchy regression. |

New source deliverable: **`docs/cypress-phase-c5-stub-runtime-validation.md`**.

No fixture data, production source, schema, package/dependency/lockfile, configuration, reset script or bootstrap file was changed. In particular, C1 policy/config/support guard implementation, C2 reset/helpers and `server/scripts/bootstrap-admin.mjs` remain unchanged. No existing E2E names, assertions, expected status codes or scenarios were removed/weakened. No blanket success response, arbitrary sleep, configured retry or new forced interaction was introduced.

Generated screenshots/downloads, logs and clean-profile files were preserved under `C:\Users\Owner\AppData\Local\Temp\cards-c5`. Artifacts are in its `artifacts` directory. Four generated Windows cache `.db` files appeared beneath a literal workspace `%SystemDrive%` directory, consistent with that OS variable being absent from the cleared environment; they were preserved under `artifacts/windows-cache`, without inspecting their contents. These are generated Windows cache artifacts, not test fixtures or a provisioned PostgreSQL database. No generated artifact was committed.

The artifact moves used verified absolute source/destination paths, native PowerShell operations, and no deletion/overwrite. All source files outside the six listed modifications remain identical to the starting snapshot. No commit or push was made.

## Collected scenarios

The five approved files represent **31 unique stub scenarios**:

- **Sign-in (6):** form/submit validity; successful `/users` navigation (existing title still says `/`); invalid credentials 401; locked 423; throttling 429/body precedence; disabled button while loading.
- **Roles (8):** create-dialog open/cancel; busy rename rollback/no write; free rename/PATCH/UI; description/single PATCH; delete/accept/reload; busy creation/no write; free creation/close/reload; permission merge only within the same object.
- **Permissions (8):** Limited menu allowed/hidden items; guarded `/audit` → `/forbidden`; Limited Create hidden; Admin menu items; Admin Role actions; Admin User actions; exact 401 recovery/retry; 403 feedback/session usability without refresh.
- **Regions stub (2):** initial rows; Name sorting/request/order transitions.
- **Regions-list stub (7):** initial rows; exact normalized search/empty result; sorting; region-101 card; exact deletion/survivor; HTTP Blob download; country clearing and Russia reselection/dependent control state.

No `.live.cy.ts` file or live-only Roles/Sign-in branch executed. The browser passes above are genuine results, not the isolated harness's simulated DOM outcomes.

## Remaining risks and prerequisites

1. **Resolve watcher isolation before any further runtime validation or watched-file edits.** The pre-existing nodemon owner must stop/suspend it, or supply a separate checkout/workspace without watchers. Re-run preflight and the approved stub suite only after this is verified. Do not infer database isolation from C1's browser guards alone.
2. Database effects of the observed restart are unknown. Review the pre-existing service's own logs/configuration and database state only with separate authorization. No production/disposable-target assumption was made here.
3. The clean Windows environment should preserve necessary nonsecret OS variables such as `SystemDrive`/`ProgramData` in a reviewed allowlist. Native screenshot recycling emitted nonfatal `windows-trash.exe` warnings; no guard was relaxed to suppress them. The temporary `.ps1`/npm/PATH launcher problems are documented above.
4. The dedicated unoptimized frontend contains a roughly 10 MB lazy main chunk and cold loading was slow. The bounded rendered-page barriers are passing; broad flake/performance claims require separately authorized repeat validation. Other browsers and responsive/mobile behavior were not exercised.
5. Remote fonts/icons remain blocked as required. The installed Cypress version warns about `allowCypressEnv`; only explicit public test configuration/dummy tokens were provided to this run. A future metadata API migration is outside C5.
6. Live E2E remains unvalidated. Before attempting it, obtain explicit approval of a local disposable PostgreSQL target, enforce C1/C2 identity/reset protections, isolate background watchers/workers, address remaining live lifecycle/logging issues and the known live toast selector, then authorize a narrow live batch separately. No live command is authorized by this report.

**Final status:** latest guarded browser results **31/31 passed**; isolated safety tests **134/134 passed**; **C5 safety acceptance blocked by the pre-existing backend watcher's restart/database initialization**.
