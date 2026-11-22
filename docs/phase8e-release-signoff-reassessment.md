# PHASE 8E — RELEASE SIGN-OFF REASSESSMENT

November 21, 2026. Candidate reviewed at `3a98325` plus the Phase 8 working changes. This verification adds only this report.

## Current baseline and repository state

`git status`, the working diff and the staged diff were inspected. The staged diff was empty. The candidate is the reviewed Phase 8 working tree, including the new source helper and workbook assets. The current HEAD by itself does not contain that candidate.

| Classification | Paths |
| --- | --- |
| Expected Phase 8 production | `.gitignore`, `angular.json`, `server/app.js`, `server/cors.js`, `server/controllers/ctrl-update-seniors-list.js`, `server/middlewares/{error-handler,request-logger}.js`, `server/routes/{client-logs,files-api,orders-api,seniors-api,volunteers-api}.js`, `server/logging/request-path.js` |
| Expected Phase 8 tests | `server/tests/int/{files-api,orders-api,seniors-api,volunteers-api}.int.test.js`, `server/tests/unit/ctrl-update-seniors-list.unit.test.js`, `src/app/services/file.service.spec.ts` |
| Expected Phase 8 docs/assets | Reports 8A–8E under `docs/`, plus the five files enumerated below in `server/protected-templates/` |
| Pre-existing unrelated | `server/scripts/bootstrap-admin.mjs`, untracked and preserved |
| Unexpected artifact | None in the working inventory. Build/cache outputs are ignored. |

## Phase 8 P1 closure

All four original 8A P1s are **CLOSED**. Their regression cases passed in the 216-test PostgreSQL run.

| Original defect | Fix | Current protection | Remaining risk |
| --- | --- | --- | --- |
| Bulk could mark a Home updated after stale or wrong-Home row requests | 8B | Existing stale-edit assertion, stale removals, foreign admission/edit/removal, rollback and successful mixed batch verify 409, persisted state and actual counts. | Validate a normal batch on the staging database. Timestamp policy is tracked separately. |
| Limited order list could expose another user's orders and options | 8C | Two-actor PostgreSQL regression checks broad and explicit foreign filters, rows, totals, paging and user/occasion options. Full permission takes precedence. | Verify a limited actor on deployed role grants. |
| Workbook permissions, static delivery and release sources disagreed | 8C | Per-template permission and attachment checks, real Express static denial, packaging/importer validation and Angular asset exclusion. | Exercise the assembled candidate and browser download on deployed origins. |
| Contact terms appeared in server diagnostic paths | 8D | Complete serialized log checks for successful and failed lookup, client-log relay and unmatched paths, with an ordinary-route control and correlation checks. | Trace a synthetic failing request through the staged logging pipeline. |

## Remaining P2 classification

| Item | Class | Evidence, failure mode and coverage |
| --- | --- | --- |
| Cross-origin request-ID visibility | **A — FIX BEFORE RELEASE** | Resolved in 8D. Allowed-origin direct 401 and Blob callers can now read `X-Request-Id`. HTTP regressions and the startup smoke exercise the header, and 403 retains its body fallback. |
| Home/user delete conflict count interpolation | **F — SAFE DEFER** | Preflight supplies a count. Transactional DELETE rechecks dependencies and returns a coded 409 with no count when a dependency appears after preflight. Angular passes the code to the toast, which can lack its count interpolation. API dependency tests cover refusal; exact stale-preflight toast wording lacks an end-to-end assertion. |
| Bulk date precision | **A — FIX BEFORE RELEASE** | A supported keep-existing exit-date selection overwrites the stored instant and can change its displayed calendar day. A rollback-only PostgreSQL probe reproduced it. The normal mixed-batch test covers removal timestamps and does not exercise keeping an existing exit date. |
| Inline month bounds | **F — SAFE DEFER** | The comparison accepts numeric arrays without bounds. Values outside the calendar range fail to match the extracted month, so malformed direct input can produce an incomplete comparison. This read-only request does not persist months. Existing comparison/integration coverage does not assert malformed bounds. |
| README/runtime DB setup | **D — DOCUMENT BEFORE RELEASE** | The development example advertises `DATABASE_URL`, while runtime selects separate local variables outside production. Copying the example alone can prevent startup or select pre-existing environment settings. Local/prod smoke and integration exercise the actual branches. |
| Existing schema upgrade | **B — STAGING VERIFY BEFORE RELEASE** | Phase 8 introduces no model or shared schema change. Startup sync does not migrate existing columns, and older schema lineage includes incompatible types. The dedicated integration database validates current models; the deployment's schema epoch remains unknown. |
| SPA deep-link hosting | **B — STAGING VERIFY BEFORE RELEASE** | No tracked host rewrite was found. A direct reload can return host 404 before Angular runs. Router tests cover in-app routing. |
| Cross-site session | **B — STAGING VERIFY BEFORE RELEASE** | Local Auth/HTTP tests cover token and cookie handling, and smoke covers the allowed-origin header. The deployed browser may refuse the refresh cookie or a host may misconfigure credentials/origin. Verify deployed behavior. |
| Cypress stub stability | **B — STAGING VERIFY BEFORE RELEASE** | Phase 8A reproduced an extra `@perms` wait after the helper had already consumed the initial permission response; Phase 8C's first Toponyms attempt hit a dev-server startup timeout and the retry passed 7/7. That evidence supports a test assumption and runner readiness issue. The stub cannot prove real backend integration. |
| Bundle headroom and current warnings | **F — SAFE DEFER** | The same release build passes under the existing error limit. A small future growth could fail packaging, so retain the exact budget as a gate for every candidate. |

## Schema migration readiness

Startup authenticates and calls each model's Sequelize sync with `force: false, alter: false` in dependency order. It can create missing model tables, ensure PostgreSQL enums and add missing indexes. Constraints defined during table creation apply to newly created tables. The local Sequelize implementation gates adding or rewriting existing columns and their foreign-key changes on `alter`. Existing data or named constraint drift can still prevent successful startup or cause incorrect behavior.

There is no tracked versioned migration framework or verified upgrade script for an arbitrary earlier deployment. The reviewed Phase 8 diff is empty for models, shared schema sources and shared compiled schemas. History does include `c499a4c`, which changed `volunteer-institutes.category` from string to integer. A database predating that change cannot receive the conversion through current startup sync alone. That is a concrete compatibility limit, while the actual deployment schema has not been identified. This candidate can enter staging on a disposable target. Production stays on hold until the existing-schema check passes. If staging proves it still has the older column or another incompatible contract, a reviewed migration and rollback rehearsal become mandatory for that upgrade.

Minimum staging upgrade verification:

1. Record the deployed revision and export a schema-only snapshot. Restore a representative copy or equivalent synthetic fixtures into an explicitly disposable staging database. Record the current columns, types, defaults, indexes, FK/check/unique constraints, permission grants and retention state.
2. Verify the target database and backup/restore route before startup. Use the exact candidate and production-mode topology. Record the permission-sync and audit-retention settings and their expected writes.
3. Diff the schema and grant snapshots after running the real initialization. Verify institute category type, order-related associations, the latest-Home-update unique index, and auth/audit tables and constraints.
4. Run representative reads and writes from the acceptance checklist and verify the backup/rollback path. Hold production if any required conversion, index, constraint or compatible rollback is missing.

## Cross-site session and SPA readiness

Use the actual frontend and API origins with a synthetic staging actor. Verify sign-in accepts the credentialed response, sets the HttpOnly refresh cookie with `Secure`, `SameSite=None` and path `/api/session`, and uses the access bearer for protected requests. Reload and observe session restoration. Use a controlled short-lived access token to verify refresh rotation and retry. Confirm logout expires the refresh cookie and prevents restoration. Check expired/invalid refresh routes to sign-in, and a permission 403 leaves the session and navigation intact. Record the exact approved origin and browser cookie behavior.

The README records historical Render/Neon use and Vercel previews. Angular's production configuration identifies a backend origin only. Neither identifies an approved deployed frontend with a reviewable rewrite. Directly reload an authorized staging order detail route, `/seniors` and `/audit`; verify the SPA shell loads and the applicable route guards resolve. Confirm an unknown API request still returns JSON 404.

## Live Cypress status and fallback

**LIVE E2E: NOT RUN.** The private environment and approval inputs are absent. The reviewed runner requires an explicit recent approval tied to an exact disposable database, its allowlist and native identity, a fresh run ID, restricted environments, serial execution and verified cleanup. Production sign-off requires real staging evidence. The bounded acceptance checklist below can supply that evidence if the guarded automated lane remains unavailable. Stub success alone cannot replace it. Record whichever real-backend acceptance path is used.

## Build, budget and warnings

| Warning family | Count | Classification |
| --- | ---: | --- |
| OrdersList NG8102 | 10 | TYPING FOLLOW-UP |
| RecipientsList NG8107 | 1 | TYPING FOLLOW-UP |
| isolatedModules / emitDecoratorMetadata | 1 | SAFE DEFER |
| CommonJS `moment`, `moment/locale/ru`, `file-saver`, `exceljs` | 4 | PERFORMANCE FOLLOW-UP |
| Initial bundle exceeds the 2 MB warning threshold | 1 | PERFORMANCE FOLLOW-UP |

The build emitted 4,993,670 initial bytes (4.99 MB), with 831.10 kB estimated initial transfer, 17 warnings and zero errors. Its 6,330 bytes of headroom under the 5,000,000-byte error limit match 7J and the 8D build baseline. The headroom is safe for this exact release candidate with follow-up. Rebuild the final candidate under the same error limit.

## Delete-conflict UX

The shared table calls DELETE only on a zero preflight count and reloads only on DELETE success. On rejection its error handler displays the domain message and retains the row. Home and user integration tests verify both the preflight count and DELETE refusal. The gap is missing toast data on the late conflict path.

## Date and month policy

The normal mixed-batch fixture verifies that the submitted update instant persists to both the removed Senior and the latest Home marker. A separate path fails when a returning Senior is found during comparison. Choosing the existing exit value in the changes table submits the original timestamp. The save DTO's `acceptedChangesSchema.dateOfExit` currently uses `nullableDateOnly`, which strips the time, and the bulk write then persists the shortened value.

The rollback-only probe ran the actual comparison, response parser, save DTO, ownership guard and write helper against a synthetic record in dedicated loopback PostgreSQL. Keeping `2026-11-21T21:00:00.000Z` produced validated input `2026-11-21` and persisted `2026-11-21T00:00:00.000Z`. That changes the displayed day from November 22 to November 21 in Europe/Moscow. The fixture rolled back. Keeping an existing value must preserve it regardless of any future calendar policy.

Out-of-range compare months can skew the initial read-only comparison, while the save endpoint independently checks the existence and Home ownership of submitted IDs.

## Release assets

The release sources are `template-countries.xlsx`, `template-regions.xlsx`, `template-districts.xlsx`, `template-localities.xlsx`, and `template-seniors.xlsx` under `server/protected-templates/`. The current files are untracked and Git-eligible via the exact ignore exceptions. Include all five in the release snapshot. The packaging regression scans actual frontend references, matches exactly the protected directory and parses each blank workbook. Attachment authorization, public static denial, and the FileService 401/403/404 Blob handling have independent regression coverage. The built Angular browser output contains zero XLS/XLSX files and includes the public translation asset.

## Production environment checklist

| Variable | Class | Release check |
| --- | --- | --- |
| `NODE_ENV` | Required | Explicit production selection. Omission can enter the local DB strategy and nonproduction cookie behavior. |
| `DATABASE_URL` | Required | Verify the intended production PostgreSQL identity. Missing fails initialization in production. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_PEPPER` | Required | Confirm secret presence and continuity for existing signing and password verification. Missing values fail module loading. |
| `ALLOWED_ORIGINS` | Required for topology | Match the actual credentialed frontend origin. Omission leaves only development defaults and prevents the deployed browser connection. |
| `PORT` | Required for topology | Match the hosting listener contract. The app defaults to its local port when the setting is omitted or unparsable. |
| `REDIS_URL` | Required for topology | Configure shared limits when required across instances. Omission uses process-local limits. |
| `LOG_LEVEL` | Optional | Confirm desired production output. |
| `JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC` | Optional | Confirm effective lifetime and default fallback behavior. |
| `AUDIT_RETENTION_DAYS` | Optional | Confirm the effective deletion policy. Missing or invalid input falls back to the built-in retention period. |
| `PERMS_SYNC_ON_BOOT` | Optional | Confirm the operator's intended mode. Boot synchronization is enabled unless explicitly disabled. |

## README and runtime configuration

Documentation should state that production uses `DATABASE_URL`, development uses `DB_USERNAME`, `DB_PASSWORD` and `DB_LINK`, and the test database path uses local credentials with `DB_LINK_TEST`. The candidate can be configured correctly with the runtime names.

## Production startup risks and health

Real startup can create schema objects, run audit retention and update its maintenance marker, then synchronize role grants before listening. Permission sync can create or remove operation rows and normalize dependent flags. Audit catch-up can delete rows under the configured retention policy. Redis is lazy and the limiter has a process-local fallback. The release operator should explicitly verify database identity and restore capability, review the schema and permission diff and retention policy, coordinate rollout, then confirm listener readiness. A health 200 confirms the running listener, while an independent representative database read is needed for ongoing readiness.

The isolated production-mode smoke used dummy secrets and an unreachable loopback database URL. The safe app listener registered 31 layers, returned a request ID with health 200, returned JSON 404 with matching header/body identity, and exposed the header on an allowed-origin workbook 401. The smoke bypassed database initialization, permission synchronization and retention.

## Test integrity

Working-tree comparison and targeted searches found no focused or skipped backend/frontend Phase 8 cases. The stale bulk assertion, two-actor order regression, protected asset and static bypass checks, and request/error/client-log privacy assertions remain present. The Phase 8C change to legacy file tests deliberately replaces arbitrary text and Homes-operation access with stricter per-template rules. No Phase 8 regression was deleted or loosened in this reassessment.

## Automated validation

| Check | Result |
| --- | --- |
| Backend unit | **398/398 passed** across 44 suites |
| Backend integration | **216/216 passed** across 19 suites |
| Frontend full | **724/724 passed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| FileService and diagnostics | **9/9 passed** |
| Production TypeScript and shared TypeScript | **Passed** |
| Production build | **Passed**, 4,993,670 initial bytes, 6,330 bytes of headroom, 17 warnings, zero errors |
| Backend safe startup smoke | **Passed** |
| Synthetic bulk keep-existing date probe | **Defect reproduced**, PostgreSQL fixture rolled back |
| `git diff --check` | **Passed** for working and staged diffs, plus a trailing-whitespace check of the report |

## Manual / staging acceptance checklist

1. Cross-site sign-in, refresh, reload, logout, expired session and 403 behavior as specified above.
2. Direct SPA deep-link reload on the actual host, including the authenticated guard result.
3. Protected template success for the proper role, denial for the wrong role, and static URL denial.
4. One limited-order actor sees own rows, count and options, with a foreign filter empty.
5. One synthetic same-Home bulk comparison/save flows through refresh, related updates and marker creation.
6. One report renders and exports representative staging data.
7. One failed synthetic request correlates with a server/audit lookup and retains safe route identity.
8. Basic keyboard/focus sequence through navigation, a form and a dialog.
9. Supported-browser download preserves filename and attachment behavior.

## Additional code work required

**YES, before production.** No additional code batch is required to enter disposable staging.

**Phase 8F — preserve existing exit timestamps in bulk reconciliation.** Scope the shared accepted-changes contract and its compiled backend artifact, the bulk save boundary and one regression for a return comparison where the operator keeps the existing exit value. Assert exact persisted timestamp and unchanged calendar-day display in a representative offset zone. Keep the ordinary mixed-batch assertions and avoid defining new date policy.

## Release-candidate decision

**READY FOR RELEASE-CANDIDATE STAGING** on the reviewed candidate snapshot and a disposable schema target. The four original P1 controls are green and the candidate can be exercised with synthetic data.

**PRODUCTION SIGN-OFF: HOLD.** Resolve the reproduced bulk keep-existing timestamp defect, verify schema compatibility, complete real-origin session and deep-link acceptance, and update the runtime setup documentation before production approval.

**PHASE 8E — RELEASE SIGN-OFF REASSESSMENT COMPLETE**

