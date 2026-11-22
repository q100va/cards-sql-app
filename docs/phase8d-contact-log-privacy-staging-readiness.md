# PHASE 8D — CONTACT LOG PRIVACY / DIAGNOSTIC CORRELATION / STAGING READINESS

## Original defect and root cause

`VolunteerService.searchContacts` sends `GET /api/volunteers/search-contacts/${encodeURIComponent(query)}`. Express matches `/search-contacts/:q`, verifies the bearer token, checks ADD_NEW_ORDER or EDIT_ORDER, validates the parameter and passes it to a case-insensitive contact lookup. The correlation middleware assigns request identity before Pino binds the request.

Pino used the concrete URL minus query parameters in both its message and structured `req.path`. The centralized error logger repeated it in `route`, and its raw error could carry the query operand in a database message, SQL or parameters. Angular diagnostics could also relay the concrete path in the message or structured context submitted to the existing client-log endpoint.

## Request and error logging

| Surface | Before | After |
| --- | --- | --- |
| Structured request path | Concrete lookup pathname | Known contact-search namespace, because Pino binds the request before Express selects the route |
| Request completion message | Concrete lookup pathname | Express's matched `req.route.path` with the known mount prefix. Early or unmatched lookup-family requests retain the safe namespace. |
| Central error route, message and fields | Concrete path, original error and validation details | Safe route identity, generic contact failure message, status, stable code and correlation ID. The lookup's raw exception and validation details are excluded from the log. |
| Pino automatic failure | Original exception could be serialized | Contact lookup completion retains its safe identity, status, request ID and timing |
| Client diagnostic relay | Concrete lookup paths could reach server log messages or context | Known contact search paths reduce to the route template before existing PII and credential redaction |

Ordinary matched and unmatched routes continue to log their usual pathname with query parameters removed. The contact search family has one parameterized lookup route. Other volunteer routes take entity IDs or structured request data. The HTTP path, encoding, permission checks, lookup predicate, response bodies and user-facing failure behavior retain their existing contract. There are zero frontend production changes.

## Correlation and CORS

Allowed-origin HTTP responses proved that the original direct 401 body has only `code` and `data`. The server already assigned `X-Request-Id`, but browser clients could not read it across origins because the header was absent from the exposed list. The ordinary 403 path has a JSON correlation fallback. Blob consumers can receive an unreadable body at the interceptor boundary before file normalization. Therefore JSON fallback alone did not cover these paths.

Allowed origins now receive `Access-Control-Expose-Headers: X-Request-Id`. Disallowed origins receive no exposure header. Origin allowlisting, credentials, request headers and request-ID generation are preserved. The 401 and 403 envelopes retain their existing fields. The tests verify matching header/body IDs where a body ID already exists.

Existing Pino redaction, request/response header omission, and client masking for credentials and tokens remain in place. Search log tests assert against complete serialized entries using synthetic email and phone values in raw and URL-encoded forms.

## Files changed and tests added

- `server/logging/request-path.js` defines the contact operation identity and safe path handling. `server/app.js` and `server/routes/volunteers-api.js` share its mount and route constants.
- `server/middlewares/request-logger.js`, `server/middlewares/error-handler.js` and `server/routes/client-logs.js` apply the scoped projection at each server logging boundary.
- `server/cors.js` exposes the existing ID for allowed origins.
- `server/tests/int/volunteers-api.int.test.js` adds three PostgreSQL-backed HTTP cases using the real Express app and Pino serialization. They cover successful search and a health-route control, a controlled failure containing sensitive SQL/parameters plus the relayed client diagnostic, and unauthenticated, forbidden and unmatched cases with allowed/disallowed origins.

## Targeted staging readiness

- **Backend production-like smoke passed.** The server entry passed syntax checking, and the app loaded with dummy secrets and an unreachable loopback DB URL. On an ephemeral listener it registered 31 layers, returned 200 for `/healthz`, and returned a correlated JSON 404 for an unknown API route. A direct workbook 401 exposed the existing ID only for the allowed origin. The smoke did not initialize a database or run production permission synchronization.
- **Guarded live Cypress Toponyms — NOT RUN.** The existing runner requires private `E2E_ENV_FILE` and `E2E_LIVE_APPROVAL_FILE` inputs bound to the exact disposable database, recent explicit operator approval, installed process identities and cleanup checks. Those inputs were absent. The guarded runner and its serial execution, fresh identity and cleanup rules remain intact.
- **SPA deep links — STAGING VERIFY.** No tracked host rewrite configuration was found. The frontend deployment must serve the Angular shell for a deep-link reload. The actual hosting rewrite remains a release verification item.
- **Cypress stub stability.** Phase 8A reproduced an extra permissions-request wait and Phase 8C passed the Toponyms stub on retry after a dev-server startup timeout. Evidence points to runner readiness and test assumptions. There was no 8D runner change.

## Remaining P2 reassessment

| Item | Classification | Disposition |
| --- | --- | --- |
| Cross-origin request-ID visibility | FIX BEFORE RELEASE | Implemented and verified in 8D |
| Home/user delete conflict count interpolation | SAFE DEFER | Existing conflicts still prevent deletion |
| Bulk date precision | PRODUCT/POLICY | Agree date-only versus instant semantics |
| Inline month bounds | SAFE DEFER | Validate together with the bulk request contract |
| README/runtime DB config mismatch | DOCUMENT | Align setup instructions with runtime selection |
| Schema migration readiness | STAGING VERIFY | Exercise the real schema upgrade path with a staging copy |
| SPA deep-link hosting | STAGING VERIFY | Confirm the deployed host fallback |
| Cross-site session smoke | STAGING VERIFY | Check sign-in, refresh, reload and logout on deployed origins |
| Cypress stub stability | STAGING VERIFY | Verify the existing lane under release-runner timing |
| Bundle headroom/warnings | SAFE DEFER | Build passes within the existing limit |

## Validation

| Check | Result |
| --- | --- |
| Focused backend diagnostics unit tests | **38/38 passed** across five suites |
| Focused backend diagnostics integration | **27/27 passed** across Volunteers, client logs and request context |
| Full backend integration | **216/216 passed** across 19 suites on dedicated loopback PostgreSQL |
| Full backend unit | **398/398 passed** across 44 suites |
| Frontend full | **724/724 passed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| OrderCard and VolunteerService | **35/35 passed** |
| Production TypeScript | **Passed** |
| Production build | **Passed**, 4.99 MB initial bundle and 17 existing warnings |
| Backend startup smoke | **Passed** |
| `git diff --check` | **Passed** for working and staged diffs. The two new source/report files also passed a trailing-whitespace check. |

The first capture attempt inherited the test logger's muted level. The test fixture now explicitly enables capture while the scenario runs and restores both the level and output stream afterward.

## Behavior preserved

Volunteer lookup semantics, authorization, HTTP envelopes, request identity generation, audit hooks, frontend diagnostic behavior, workbook delivery, order scoping and bulk integrity retain their existing behavior.

**Remaining Phase 8 P1:** none known. The local checks leave the staging verification items above open.

**PHASE 8D — CONTACT LOG PRIVACY / DIAGNOSTIC CORRELATION / STAGING READINESS COMPLETE**
