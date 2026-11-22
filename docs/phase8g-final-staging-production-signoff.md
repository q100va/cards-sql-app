# PHASE 8G — FINAL STAGING / PRODUCTION SIGN-OFF

November 22, 2026.

## Candidate revision and final repository state

The candidate is `3a98325a30fe6e6f158888f27038a1ccad0b6c2a` plus the reviewed Phase 8 working-tree changes and the 8G documentation. HEAD alone does not contain the candidate. The staged diff was empty. Assemble the exact reviewed tree for any deployment and verify it contains all protected templates and the new logging helper.

| Classification | Inventory |
| --- | --- |
| Production | `.gitignore`, `angular.json`, `server/app.js`, `server/cors.js`, `server/logging/request-path.js`, `server/controllers/ctrl-update-seniors-list.js`, `server/middlewares/{error-handler,request-logger}.js`, `server/routes/{client-logs,files-api,orders-api,seniors-api,volunteers-api}.js` |
| Tests | `server/tests/int/{files-api,orders-api,seniors-api,volunteers-api}.int.test.js`, `server/tests/unit/{ctrl-update-seniors-list,senior-bulk-exit-timestamp}.unit.test.js`, `src/app/services/file.service.spec.ts` |
| Shared source and artifacts | `shared/schemas/senior.schema.ts`, `shared/dist/schemas/senior.schema.js`, `shared/dist/schemas/senior.schema.d.ts` |
| Protected templates | The five XLSX files listed under Release assets |
| Documentation | `README.md` and the reports for 8A through 8G |
| Pre-existing unrelated | `server/scripts/bootstrap-admin.mjs`, untracked and preserved |
| Unexpected | None in the working-tree inventory. Normal build/cache artifacts are ignored. |

The 8G diff consists of the README runtime correction and this report. No application or test changes were required.

## Phase 8 blocker closure map

All six listed code findings are **CLOSED**. Their regression cases passed in both integration runs.

| Finding | Regression protection in the candidate | Remaining deployed check |
| --- | --- | --- |
| 8B bulk stale and foreign-Home integrity | Stale edit/removal, foreign-Home rejection, atomic rollback, accurate counts and same-Home success | Synthetic staging comparison, update and refresh |
| 8C limited order list | Two owners, limited count and option scope, foreign filter and full permission precedence | Two staged actors with real role grants |
| 8C workbook authorization | Per-file permission and attachment checks, 401/403, safe 404, real static bypass control | Staging API and browser download |
| 8C workbook packaging | All five frontend references resolve to importer-compatible protected binaries and the browser build omits workbooks | Verify the assembled backend artifact |
| 8D contact-log privacy | Success, controlled failure, structured logs, relay, ordinary-route and unmatched controls | Controlled request through deployed log pipeline |
| 8F existing exit timestamp | Exact PostgreSQL round trip, offset-zone day preservation and explicit null clearing | Same workflow through deployed UI |

## Automated baseline and final automated validation

The complete baseline was started before the README correction. Final commands were run again after the documentation change. Integration suites use the verified dedicated loopback test database. The production-like startup smoke binds an ephemeral loopback port with dummy credentials and bypasses database initialization. It checked 31 registered layers, `/healthz`, JSON 404, matching 404 correlation ID and readable `X-Request-Id` on an allowed-origin workbook 401.

| Check | Baseline | Final |
| --- | --- | --- |
| Backend unit | 400/400, 45 suites | 400/400, 45 suites |
| Backend integration | 217/217, 19 suites | 216 passed, 1 setup-hook timeout, 18 suites passed and one failed |
| Frontend full | 724/724 | 724/724 |
| Auth | 29/29 | 29/29 |
| Routing | 33/33 | 33/33 |
| FileService and diagnostics | 9/9 | 9/9 |
| Bulk frontend | 4/4 | 4/4 |
| Production and shared TypeScript | Pass | Pass |
| Production build | Pass | Pass |
| Backend safe startup | Pass | Pass |
| Working/staged `git diff --check` and report whitespace | Pass | Pass |

The final integration run's sole failure was the 30-second `beforeEach` timeout in the Users password-change/refresh-revocation test. The database truncation hook was interrupted before the test assertions ran. The reported case duration was nearly 13 minutes and coincided with the host execution gap. The complete Users suite passed **16/16** on retry, including the affected test. The table preserves the observed aggregate result.

## Schema compatibility rehearsal and backup / rollback readiness

The actual deployment schema, exact disposable staging target and operator-approved restore inputs were not available. No deployment database was queried. The deployment-specific rehearsal remains **NOT RUN**. Existing-schema compatibility must be demonstrated against a restored representation of that deployment, including its current column types, index and constraint definitions, permission grants and retention state.

**Local synthetic rehearsal passed.** An isolated PostgreSQL 16 cluster listened only on loopback. The verified cluster directory and the synthetic source and restore identities (`test_phase8g_source`, `test_phase8g_restored`) were tested independently of the integration database. An archive made with `pg_dump` restored with `pg_restore` into the second database. The candidate initialization, including production-mode audit catch-up and permission synchronization, passed on the restored database and returned HTTP 200 on a loopback listener. Snapshots before and after startup matched across **41 tables, 68 indexes, 107 constraints and 95 permission rows**. Checks confirmed integer institute category, the partial unique latest Home marker index, auth and audit tables and order-recipient foreign keys. A synthetic role was read from the restore and updated in a transaction that rolled back. The owned cluster stopped. This verifies the local restore procedure on the current schema. The deployed database's backup and rollback readiness remain unverified.

Before staged startup, record the candidate revision, exact approved target identity and a schema/grant snapshot. Restore an approved backup or production-like schema into a disposable database. Compare before and after candidate initialization, with special attention to `volunteer-institutes.category`, the latest HomeUpdateDate unique index, auth/audit tables and order relations. Run representative reads and writes. Confirm the operator can restore the reviewed backup and select the previous application revision, with a compatibility check between that revision and the restored schema. Record who can execute rollback, the trigger for invoking it, and how recovery will be verified. If the target still has the historical string institute category, startup sync cannot convert it. The upgrade would require an explicit mapping to the current numeric categories and a reviewed column conversion before production.

For the staged rollback rehearsal, stop the candidate and stop writes before restoring. Restore the selected backup to a fresh approved target, point the prior application revision at that restore, and verify health, sign-in and a representative read/write before switching traffic. Retain the failed target for diagnosis and reconcile any intervening writes before a real rollback.

## Real-origin staging acceptance

No approved deployed frontend/API origin pair or synthetic staging user was identified in the available configuration. The repository names historical providers and contains a production API setting, but has no tracked staging frontend/rewrite or approved staging target. Deployed acceptance is therefore pending. Local evidence below supplements the pending real-origin checks.

| Check | Status and local evidence | Staging evidence required |
| --- | --- | --- |
| Real-origin session | **NOT RUN.** Local Auth tests exercise sign-in/refresh/logout contracts. The safe smoke verifies an allowed-origin request-ID response. | Sign in, bearer call, reload/restoration, expiry and refresh rotation, logout and failed restoration, expired/invalid refresh, 403 without logout. Inspect HttpOnly, Secure, SameSite=None, `Path=/api/session`, credentials and exact origins. |
| Correlation / log privacy | **NOT RUN on real origins.** HTTP and logger regressions prove header exposure and sanitized raw/encoded values locally. | Induce a controlled failure, read `X-Request-Id` in the browser and trace it into sanitized server diagnostics. |
| SPA deep links | **NOT RUN.** Angular routing tests and the local JSON API 404 smoke pass. | Directly reload an authorized order-detail URL, `/seniors` and `/audit`; observe shell and guard behavior. Verify an unknown API route returns JSON 404. |
| Protected workbook acceptance | **NOT RUN on staging.** PostgreSQL/Express tests cover names, bytes, attachments, role enforcement and static denial. FileService tests cover Blob errors. | Download Toponym and Senior templates as the proper roles. Confirm wrong-role 403, unauthenticated 401, unavailable static route, valid workbook bytes and expected filenames. |
| Limited order acceptance | **NOT RUN on staging.** Two-owner API regression covers rows, totals, options, foreign filters and full grants. | Verify two synthetic staged actors and their real permission grants. |
| Bulk acceptance | **NOT RUN on staging.** API tests cover normal mixed save, search/recipient state, latest Home marker, rejection/rollback, exact retained exit timestamp and null clear. | Run comparison, selection, save and reload with synthetic Seniors. Verify side effects; include the 8F non-midnight timestamp. |
| Report / export acceptance | **NOT RUN on staging.** Existing backend report and frontend suites cover their local paths. | Run one authorized real report, verify table columns/rows and open the exported workbook. |
| Audit / correlation acceptance | **NOT RUN on staging.** Local request-context, audit and protected-route checks exist. | Trace a synthetic business mutation from browser request ID through the staged audit/log flow. |
| Keyboard / focus smoke | **NOT RUN.** Phase 7 and current frontend automation cover code-level controls. | Check keyboard navigation, a form, a dialog and a destructive confirmation for reachability, visible focus, focus return and accessible names. |
| Supported-browser download | **NOT RUN.** No formal deployed-browser support matrix was found. | Confirm supported browser scope with the release operator. Exercise a protected XLSX and report XLSX for filename, download start, validity and repeated downloads. |

## Live Cypress status

**LIVE CYPRESS: NOT RUN.** Neither the private environment nor the operator approval input was available. The existing guard still requires explicit recent approval for the exact disposable database, fresh run identity, environment allowlisting, serial execution and cleanup protection. The bounded real staging acceptance is an acceptable substitute for that guarded lane.

The prior stub findings point to runner readiness and test assumptions: the extra permissions wait could time out after login consumed the first request, and the Phase 8C Toponyms spec passed 7/7 after a dev-server startup timeout. The current real Express/DB tests and FileService checks cover the local workbook contract. An additional stub rerun adds no deployed evidence, so the earlier findings remain P2 test-infrastructure follow-up.

## Runtime documentation, startup effects and release assets

[README.md](../README.md) now distinguishes production `DATABASE_URL`, development `DB_USERNAME`/`DB_PASSWORD`/`DB_LINK`, and test `DB_LINK_TEST` with the existing private test credentials. It records the supported scripts, required and topology-dependent settings, and optional environment names. It also documents production initialization, default permission synchronization, audit retention and maintenance writes, and the protected release assets.

Production startup authenticates, then uses Sequelize sync with `force: false` and `alter: false`. It can create missing objects and indexes, but it does not perform historical column conversions. Audit catch-up and its scheduler can delete records under `AUDIT_RETENTION_DAYS` and update maintenance state. Permission synchronization is enabled unless `PERMS_SYNC_ON_BOOT=false`; it can create or remove operation grants and normalize dependent permissions. Review these actions for the actual target before starting production.

The five Git-eligible candidate assets in `server/protected-templates/` are `template-countries.xlsx`, `template-regions.xlsx`, `template-districts.xlsx`, `template-localities.xlsx` and `template-seniors.xlsx`. Include them in the backend artifact. The exact ignore exceptions apply to those five files while legacy public workbook copies remain ignored.

## Final build

The post-documentation production build passed at **4,993,764 initial bytes**, with **6,236 bytes of headroom** under 5 MB, **17 warnings**, and **zero errors**. This matches the 8F baseline. The emitted Angular browser output contains zero XLS or XLSX files.

Keep the existing warning dispositions. OrdersList NG8102 and RecipientsList NG8107 are typing follow-up; bundle size and CommonJS warnings are performance follow-up; decorator metadata is safe to defer for this candidate. Keep the current 5 MB error gate.

## Environment checklist

- Record the exact candidate revision/snapshot and verified frontend origin, API origin and database identity.
- Confirm backup identity, restore rehearsal and rollback operator. Verify the existing schema and the five protected template files in the assembled backend artifact.
- Verify required names `NODE_ENV`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `PASSWORD_PEPPER`. Confirm topology-dependent `ALLOWED_ORIGINS`, `PORT` and `REDIS_URL`.
- Review `LOG_LEVEL`, `JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`, `AUDIT_RETENTION_DAYS` and `PERMS_SYNC_ON_BOOT`. Verify cookie behavior and exact allowed origins in the deployed topology.
- Confirm `/healthz`, then perform a real-origin sign-in and representative database-backed read/write. Preserve correlated diagnostics and avoid recording credentials or personal data.

## Remaining P0, P1, P2 and P3

- **P0:** No concrete deployment-safety defect found in the local candidate.
- **P1:** No known code blocker in the reviewed candidate. Existing deployment schema, rollback and real-origin staging evidence are separate release gates.
- **P2:** Runtime documentation closed. Known warning and Cypress stability follow-up remain classified in 8E/8F and are outside the production hold.
- **P3:** Deferred product, localization and general accessibility work remain outside this sign-off. The bounded staging keyboard smoke stays on the acceptance checklist.

## Final decision

**PRODUCTION SIGN-OFF: HOLD.** Required evidence is outstanding for the actual existing-schema upgrade and backup/rollback path, and for real-origin staged acceptance, including session, deep links and protected download and workflow checks.

**KEEP PHASE 8 OPEN.** The reviewed code remains ready for disposable staging. Production approval requires evidence from the deployed topology and a restored copy of the intended database schema.
