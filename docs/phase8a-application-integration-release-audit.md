# PHASE 8A — APPLICATION INTEGRATION / RELEASE-READINESS AUDIT

**Recommendation.** Begin release-candidate hardening. Hold release sign-off until the bulk-write integrity, order access, download delivery and contact-log privacy findings are resolved and a staged deployment smoke check passes.

## Current repository state

Reviewed `3a98325` on November 21, 2026. At entry, `git status --short -uall` showed only `server/scripts/bootstrap-admin.mjs`, classified as pre-existing unrelated work. Working and staged tracked diffs were empty. The Cypress/config/backend-script work described in Phase 7J is now committed in this checkout. The untracked script was preserved and never executed. The 8A deliverables are this report and one Senior bulk contract test. No production, schema, deployment or runner changes were made.

## Application architecture map

`src/main.ts` boots Angular using `app.config.ts`, `app.routes.ts` and an Angular environment selected in `angular.json`. Services send authenticated JSON to `/api/*`, apart from workbook downloads. The interceptor chain handles bearer attachment, recovery, language and HTTP diagnostics. `server/server.js` starts `server/app.js`, which applies CORS, request identity and logging, body parsing and cookies, then registers domain routers. Routers apply auth and operation checks, parse requests with shared Zod contracts, call controllers and Sequelize models and return data/code envelopes. `server/database.js` selects PostgreSQL configuration and `server/models/index.js` wires database relationships. File responses are attachments from the server filesystem. Reports export in the browser. Audit hooks attach request context to business mutations, and client diagnostics have a separate bounded log endpoint.

## Frontend/backend contract map

This inventory compares service calls, route registration, request validation and consumers for the representative paths. The gap map below identifies where the browser has yet to exercise the real API.

| Domain | Representative contract and boundary |
| --- | --- |
| Auth/session | Credentialed POST sign-in, refresh and sign-out, GET me and permissions. JSON access/session payloads, cookie rotation and status-based recovery. |
| Users | POST paged query and create/update, positive ID in detail and delete URLs, PATCH block/unblock/password. User uniqueness and dependency failures preserve domain codes. |
| Roles/permissions | GET lists, POST create, PATCH role and operation rules, DELETE by ID. Role dependency check returns a count and domain code at 200. Operation checks remain server-side. |
| Partners | POST check/create/update/list, GET detail and dependency preflight, DELETE by ID, PATCH block/unblock. Owner mutations carry separate change, outdate, restore and delete sections. |
| Volunteers | Same owner lifecycle, plus GET contact lookup with encoded path term. Lookup is available with add or edit order rights. Verify null contacts and owner relations on a real browser flow. |
| Homes | POST create/update/list, GET detail and reference lists, DELETE by positive ID, PATCH block/unblock. Addresses and coordinations are transactional owner data. |
| Seniors | POST check/create/update/list, GET detail and home-scoped lookups, DELETE and PATCH block/unblock. Single-owner update preserves the Home relationship. |
| Toponyms | GET query-parameter lists and preflights, POST typed create/update/populate, DELETE with query IDs. Existing browser-live candidate specs cover this domain. |
| Orders | GET selection preflight with query parameters, POST creation and paged list query, GET detail by ID, PATCH status or recipient removals and DELETE by ID. |
| Recipients | POST create list, create rows and paged query, PATCH clear/check, DELETE selected IDs in a JSON body. Occasion linkage and permission are independently validated. |
| Occasions | GET list/detail/type lookup and duplicate preflight, POST create, PATCH status, DELETE by ID. Related recipient rows and dependency rules matter for destructive actions. |
| Reports/statistics | POST report DTO dispatches by type and returns `data: { type, report, cols }`; GET statistics returns `data: { report, cols }`. JSON feeds the table and client workbook generation. |
| Audit | GET with paging/filter/sort parameters, paged response and separately enforced audit permission. Verify actor/correlation filter and timestamp rendering against real responses. |
| Files | GET attachment by encoded basename, browser expects Blob and decodes JSON error bodies. Packaging and authorization differ between file-serving paths. |
| Bulk seniors | POST workbook-derived JSON for comparison and update. Compare returns differences and a Home ID. Write returns created/removed/updated counts. Server reconciliation and affected-row validation are the weak boundary. |

## Shared schema findings

Angular imports `shared/schemas` and `shared/constants` source. Express imports compiled `shared/dist`; the shared build must precede packaging after a source change. The shared compiler check passed with `--noEmit`. Runtime shared validators distinguish coercible URL IDs from numeric request body IDs. Local envelopes still exist for some null/void responses and bulk comparison constructs its request schema inline. Source review found no proven enum drift in the traced order status, occasion status or report types. The bulk schema validates positive IDs and accepted fields independently and supplies no relationship between the top-level Home and row IDs. Date contracts differ by field as noted below.

## Authentication integration

`AuthService` sends credentials on session operations, stores the access token in memory and restores by refreshing before loading identity and permissions. Server JWT signing and verification agree on HS256, issuer `cards-sql-app` and audience `web`. The refresh cookie is HttpOnly, scoped to `/api/session`, Secure and SameSite=None in production, and SameSite=Lax for local use. Logout clears it with the matching attributes and revokes the current refresh record. Missing, invalid and expired tokens produce 401. A protected 403 propagates without logout. Logout revokes refresh capability and clears frontend access state; already issued bearer tokens retain their expiry semantics. Production-origin cookie acceptance, rotation, reload and logout remain a real-browser staging check, especially if frontend and backend are on different sites.

## Authorization integration

Order detail route and GET accept VIEW_ORDER or EDIT_ORDER. The Phase 7 edit affordance, direct handler and server write all require EDIT_ORDER. The list boundary differs. Angular separates the full list route from the personal list and links the personal entry to the signed-in user, while Express applies the same list implementation and client-supplied filters for limited and full operations. Audit route and API both use VIEW_AUDIT_LOG. Role and occasion pages require their respective ALL_OPS permissions, while API list reads accept the narrower list permissions. The stricter UI policy is already reflected in navigation tests; its product intent should be checked if read-only access is promised. Occasion clear/delete uses distinct operations and confirmation. Reports use per-report access plus a separate statistics operation.

## Core CRUD findings

Owner services post draft or sectional updates. Partner, volunteer, home and senior routes perform entity and dependent-row writes transactionally and return a data/code envelope. List/detail clients reload or patch their current state after success. User names are checked for duplicates and persistence-level uniqueness is mapped to the same 409 domain code. User, Home and volunteer deletion recheck dependencies during mutation after the informational preflight. The Home and user DELETE conflicts omit the dependency count, while their toast translations interpolate it. The preflight produces usable counts; a conflict at save time lacks that interpolation value. Role dependencies and address restoration have domain-specific responses. Valid relation resolution and stale preflight conflicts need representative browser journeys, especially across owner restoration and linked deletions.

## Order workflow findings

Creation checks the occasion and volunteer inputs, writes Order and recipient links inside a transaction, and returns the created response. Order detail looks up its positive ID, and edit recipients/status and delete run in transactions and enforce their individual operations. Minimum recipients and occasion status protect edits. Phase 7's isolated recovery coverage remains; API tests exercise order writes and guards but do not verify Angular's actual browser request through selection, details, status change and refresh. Add that workflow to an existing guarded live lane.

## Senior / Home findings

Create requires a Home ID. Single edit's frontend form uses the existing Home and the update schema excludes homeId from editable main fields; linked spouse, history and search work runs inside the same transaction. Delete, block and unblock routes have distinct guards. Bulk selection is scoped during comparison, while save must independently enforce that affected records still belong to the selected Home. The current write accepts separately validated identifiers and can mark a Home update complete even when a compared row disappeared.

## Bulk workflow findings

Angular reads the workbook locally, constructs JSON, submits the compare request and shows differences before sending admitted, removed and changed rows. The write transaction includes Seniors, search records, active-occasion snapshots and the Home update marker. `updateSeniors` discards Sequelize's affected-row count and returns the submitted length. The search refresh returns early for a missing row. The [new contract test](../server/tests/int/seniors-api.int.test.js) confirmed that a stale save recorded one completed Home update without returning a stale-record error. The same write path passes admitted rows directly to the model and updates/removes existing rows by ID, while using the top-level Home for reconciliation and history. A single transaction can therefore commit an internally inconsistent batch. Compare-time normalization, stale IDs and rollback after a mid-batch failure are separate regression targets.

## Files / download findings

Angular sends GET with Blob response handling, uses a supplied filename when saving and decodes backend JSON errors. The API checks a basename, returns an attachment with no-store and maps missing files to 404. Its permission guard accepts any of three download operations without selecting the required permission for the requested workbook. Express also serves the same directory through generic static middleware. Separately, the five senior/toponym workbook templates relied on by Angular are ignored and absent from the tracked release tree. Repository evidence establishes both contracts; deployed provisioning and file contents were not inspected. Existing file API tests create a temporary workbook, so a green test does not prove release packaging.

## Reporting findings

The frontend submits the report type and filters to the shared DTO used by the backend. The route branches by report type and renders JSON with columns; Angular consumes those columns and builds the export locally. Statistics has its own read guard. The backend intentionally permits any authenticated user to request their own personal report, as asserted by its integration test. Angular's Reports page requires a limited or full reports grant, so access for users with only the personal-report capability is a product/affordance decision. Existing backend report tests and frontend service/rendering tests leave a real-browser gap for authorized/denied report types and an export with actual result rows.

## Date / time findings

Senior birth and consent fields are DATEONLY. Order/audit dates are timestamp concerns; occasion month and year are calendar buckets. Senior exit exposes a concrete type inconsistency: the model stores dateOfExit as timestamp, and bulk row/change schemas turn ISO strings into date-only values. Bulk's selected update date travels as a serialized JavaScript Date and persists as a timestamp, while the bulk comparison can normalize exit values to the date prefix. The two paths can lose different precision. Define which business fields are dates versus instants before choosing a conversion. No timezone policy was assumed.

## Null / empty semantics

Owner update DTOs and controllers distinguish absent change sections from explicit null clears and populated arrays. Empty list/filter objects and omitted values usually represent no filter or no operation. Null postal street/building is accepted and normalized by the Home schema; the explicit absence UX stays deferred. Senior creation requires a valid Home ID, while ordinary update excludes it. Bulk chosenMonths uses an empty array for no filter; the inline API request checks numbers without enforcing month bounds. Address, contacts, coordinations, institutes and subscriptions rely on section-specific validators and owner mutation helpers. A real browser/API round trip for clearing versus leaving unchanged remains partial.

## Error contract findings

Centralized errors return `{ code, data, correlationId }`; some direct auth/permission errors return just code and data. Angular primarily translates the domain code and reads status separately. The 409 checks use coded conflicts such as duplicate users and failed address restoration. Schema validation returns 422 and logs its structured details but omits them from the response. Angular therefore has a generic validation toast for failures caught only by the server. The central 404 and 500 paths are covered by stable codes/fallbacks; no global envelope redesign is needed. Confirm domain-specific error/refresh behavior on representative real workflows.

## Diagnostic / correlation findings

Express assigns or accepts a validated identifier, sets `X-Request-Id`, propagates it through request context and includes it in server logs, audit rows and centralized errors. Angular reads it from headers or JSON. CORS currently does not expose the header, so browser code relies on JSON fallback across origins. Direct 401/403 paths and Blob diagnostics before body decoding can consequently lose the shared ID. Logging strips query strings and redacts auth/cookie fields, but the normal OrderCard volunteer lookup encodes the contact search term in a path segment. Request logging includes that segment in both its message and serialized path, and centralized error logging also uses the raw path. The search term may contain contact data. Route-template logging would retain identity and route diagnostics without retaining the term.

## Database / transaction findings

Sequelize models declare FK restrict/cascade and uniqueness, including user names, order-recipient relationships and one latest Home update per Home. Owner children and selected relation cleanup cascade while protected business references can restrict. Order, recipient list, owner restoration and bulk workflows use managed transactions. The bulk issue is validation inside the transaction, which atomicity alone cannot prevent. Startup sync uses `force:false, alter:false`; it can create missing tables and indexes but supplies no reviewed schema migration mechanism for changing existing columns or constraints.

## Deployment configuration

`angular.json` selects the production environment with a fixed Render API URL; the README mentions Render, Neon and Vercel preview deployments. Express trusts one proxy hop, has an explicit credentialed CORS allowlist plus local defaults, serves `public` and exposes `/healthz`. Express does not serve the built Angular SPA or implement its deep-link fallback, so the frontend host must provide that rewrite. No tracked hosting manifest or migration path establishes one reproducible release. The README development example advertises DATABASE_URL although nonproduction runtime reads DB_USERNAME, DB_PASSWORD and DB_LINK. Check deployed origin/cookie behavior, deep-link reloads, templates, migration readiness and host proxy shape in staging. No deployment settings or secret values were inspected.

## Environment variables

| Class | Names and behavior |
| --- | --- |
| Required production | NODE_ENV selects production behavior; DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and PASSWORD_PEPPER are required by imported modules. Missing DB or key values fail at module loading. |
| Required by deployment topology | ALLOWED_ORIGINS must include the real cross-origin frontend. Absence leaves only local defaults, leading to browser credentialed requests failing. |
| Optional | PORT, LOG_LEVEL, JWT_ACCESS_TTL_SEC, JWT_REFRESH_TTL_SEC, AUDIT_RETENTION_DAYS, PERMS_SYNC_ON_BOOT, REDIS_URL. Without Redis, rate limiting is process-local. |
| Development/shared local | DB_USERNAME and DB_PASSWORD with DB_LINK for development. DOTENV_CONFIG_PATH is an optional launcher override. |
| Test-only | DB_LINK_TEST with local test credentials; Cypress E2E_MODE and the private live approval/reset/run identity inputs are test-runner configuration. |

## Build warnings / budget risk

Build passed at 4,993,670 bytes with 6,330 bytes under the 5 MB error limit. The 2 MB warning threshold is exceeded by 2.99 MB. Classify that family as **worth fixing** and keep the existing gate. The four CommonJS warnings (moment, moment/locale/ru, file-saver and exceljs) are **safe known warnings** with optimization impact. The isolatedModules/emitDecoratorMetadata warning is **safe known** for the current tested build. The ten OrdersList NG8102 and one RecipientsList NG8107 warnings are **worth fixing** when the UI nullability contract is revisited. No warning family alone blocks release.

## Backend validation

Production-like Node loaded the app with dummy secrets and an unreachable loopback DB URL after the server entry passed syntax checking. It registered 31 middleware/router layers without running production infrastructure initialization. An isolated Express listener returned 200 for health and 404 for an unknown API route, with matching response-header and error-body request IDs. The integration suite exercises initialization and route execution against the dedicated loopback test database. This separates module/route validation from production startup, which also authenticates to the DB, may perform retention cleanup and defaults to permission synchronization.

## Cypress / E2E coverage

Existing stubs cover sign-in and route/affordance rules, real client 401 refresh handling and 403 behavior against intercepted responses, roles, regions and Toponyms lists. Live candidates cover Toponyms regions, details and permissions. The committed live runner includes explicit opt-in and database identity binding, private approval/config, process environment allowlisting, fresh backend/run identity, serial execution and cleanup checks. Historical isolated runner/native validation is distinct from running the live frontend and backend together. This audit used the existing permissions stub only and did not execute the guarded live runner.

The permissions stub produced three 7/8 runs. The first timed out at the limited-role Audit redirect. The next two passed that redirect and timed out waiting for the limited-role menu's second `@perms` request, including a rerun after the full backend suite completed. The login helper already waits for the first permissions response, while the menu test assumes a subsequent visit generates another one. This is a repeatable stub readiness gap. API permission enforcement is measured separately by the backend integration suite. Cypress also emitted the existing `allowCypressEnv` migration warning.

## Integration test-gap map

STRONG denotes current real Express/PostgreSQL evidence at the stated boundary. PARTIAL denotes independent layer or stub coverage with an open browser/deployment gap. MISSING denotes a workflow with no corresponding end-to-end validation found.

| Workflow | Strength | Priority remaining evidence |
| --- | --- | --- |
| Authentication | STRONG API, PARTIAL browser | Real sign-in, rotation, reload and logout on staging origins. |
| Permissions | STRONG API, PARTIAL browser | Reuse guarded live setup for users/roles and order view/edit splits. |
| Orders | STRONG API, PARTIAL browser | Create, recipient selection, detail/edit/status, refresh and denial. |
| Seniors/Homes | STRONG CRUD API, PARTIAL browser | Create and immutable Home, explicit clear and stale dependency response. |
| Occasions/recipients | STRONG API, PARTIAL browser | Use real occasion with list create/clear/dependency refusal and refresh. |
| Bulk update | MISSING complete workflow | Workbook-to-compare-to-write; stale rows, wrong Home, count and rollback. |
| Files | PARTIAL | Release packaging, correct operation applied to the template, Blob errors and browser download. |
| Reports/statistics | STRONG API, PARTIAL browser | Allowed and denied real reports, result-to-export. |
| Audit | STRONG API, PARTIAL browser | Follow a real request ID from browser to a filtered audit view. |
| Toponyms | PARTIAL | Execute existing live candidates under the guarded runner; avoid duplicating them. |

## Deferred items reclassified

R16 Recipient Send remains P3 product decision. Postal address explicit absence remains P3 product UX. DialogData<T> remains P3 engineering debt. Manual accessibility, PrimeFlex/CSS and cross-browser downloads remain P3 verification. Date policy remains P3 except the concrete bulk precision mismatch, P2. Budget warning/headroom is P2. Lower-impact localization and retained Phase 7 product/correctness TODOs remain P3 unless new workflow evidence changes their status.

## P0

None observed in the audited checkout. Release remains gated on the P1 findings and staging checks.

## P1

- **Bulk writes can claim success for stale data and can reconcile a different Home from the rows written.** The schema and `server/routes/seniors-api.js` carry an independent Home ID; `server/controllers/ctrl-update-seniors-list.js` writes by row ID, trusts admitted rows' Home IDs, and reports the submitted update count. The route can commit a Home update marker without the corresponding write. This can occur after an ordinary stale comparison.
- **The order API does not enforce the limited/full scope shown by the UI.** `src/app/app.routes.ts` restricts the full list to VIEW_FULL_ORDERS_LIST, and `base-layout.component.html` links the limited entry to the signed-in user's list. `server/routes/orders-api.js` applies the same query and option selection after either list grant. The current API test uses only one actor's orders, which leaves visibility across users untested. Confirm limited scope explicitly and enforce the agreed scope for rows, counts and options on the server.
- **Workbook authorization and release packaging are inconsistent.** `server/routes/files-api.js` uses an any-of permission set, while `server/app.js` serves the same directory independently. The five workbooks referenced by Angular are ignored and absent from release source. A clean checkout cannot provide them using the checked-in build/start path alone. Clarify public versus protected templates and prove the deployment artifact matches that policy.
- **Contact search terms enter backend logs.** `src/app/services/volunteer.service.ts` places the input in the lookup URL path. `server/middlewares/request-logger.js` and `error-handler.js` retain the path value. This is independent of Phase 7's frontend diagnostic-payload fixes.

## P2

Cross-origin request ID visibility, missing dependency-count parameters on Home/user delete conflicts, bulk exit date precision, inline month bounds, the README/runtime development configuration mismatch, unproven schema upgrade and static-host rewrite, cross-site session smoke coverage, stub run stability and narrow bundle headroom.

## P3

The deferred product, typing, localization and manual verification ledger above. Existing CommonJS/template warnings remain visible for later work.

## Recommended Phase 8B

Bulk integrity. Scope `server/routes/seniors-api.js`, bulk helpers and integration fixtures. Validate Home ownership and affected rows in the same transaction, retain single-edit immutability, and report conflict through the current frontend recovery path. Tests exercise stale, foreign and missing rows and assert rollback, count and Home update marker consistency. Risk is high because the path updates resident and recipient data.

## Recommended Phase 8C

Order scope and file delivery. Scope orders and files routers, shared authorization policy, public/static packaging and deployment guidance. Enforce the agreed limited-order scope and make filename-to-permission mapping and artifact provisioning explicit. Validate role-specific order responses, protected downloads and missing-file Blob errors. Risk is high because filtering and asset routing can affect access and existing workflows.

## Recommended Phase 8D

Diagnostics and staging acceptance. Scope backend request/error logging, CORS and existing guarded Cypress infrastructure. Verify synthetic contact terms are absent from logs while the response identifier remains readable across allowed origins. Verify existing-schema upgrade and initial SPA deep linking. Run existing live Toponyms first, then add targeted session, order and bulk acceptance where the gap map warrants it. Include report/export, accessibility and cross-browser download as staging/manual verification. Risk is medium due to observability, deployment-origin and browser differences.

## Validation

| Check | Current result |
| --- | --- |
| Frontend suite | **722/722** |
| Frontend Auth | **29/29** |
| Frontend Routing | **33/33** |
| Cypress permissions stub | **7/8** on each of three runs. The final run reproduced the limited-role menu's second-permissions-request timeout. |
| Frontend production TypeScript | **PASS** |
| Frontend production build | **PASS**, 4,993,670 bytes initial, 17 warnings, 0 errors |
| Backend unit suite | **44/44 suites, 397/397 tests** on rerun. The first concurrent run had one failure in the session suite; its assertion detail was not retained. |
| Backend integration suite | **18 passed suites, 1 failed suite. 198 passed tests, 1 failed test, 199 total**. The one failure is the intentionally retained stale-bulk test, reproduced in isolation against PostgreSQL. All 198 pre-existing tests passed, six more than the 192-test historical baseline. |
| Backend production-like check | **PASS** for syntax, module loading, route registration and loopback HTTP smoke with database initialization bypassed |
| Shared TypeScript | **PASS** with `--noEmit` |
| Git diff whitespace | **PASS** for working and staged diffs, plus a trailing-whitespace check of the new report |

The backend integration suite used a verified loopback PostgreSQL database with a dedicated test name. Jest initializes and truncates that test database through its existing setup. The reset and bootstrap scripts did not participate.

**PHASE 8A — APPLICATION INTEGRATION / RELEASE-READINESS AUDIT COMPLETE**
