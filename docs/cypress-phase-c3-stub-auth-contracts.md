# PHASE C3 — CYPRESS STUB AUTH & RESPONSE CONTRACTS

Date: 2026-11-17. Scope: **E05, E06, E07 only**. C1 safety and C2 reset/fixture fixes are preserved.

## Executive summary

Scenario permissions now register before stub login, and the shared login waits for its sign-in permission response before continuing. Initial Users landing-page responses register in the support root hook before suite-specific routes, including the current countries endpoint. Sign-in has explicit landing permissions, and the Admin permission suite has explicit role-page fixture data.

The users-list response is now the strict `{ data: { list: [], length: 0 } }` contract. The actual application schema and response-validation operator accept it as an empty successful result and continue to reject the old `users` shape and unexpected fields.

The refresh success fallback registers before the one-use initial 401 override, so reverse interception order produces **401 first, then 200**. Existing response bodies, aliases, and later scenario overrides remain intact.

**Validation: 114/114 isolated tests passed: 99 existing C1/C2 + 15 new C3.** Relevant TypeScript, syntax, AST preservation, source-hash, and diff checks passed. All 39 existing distinct E2E scenarios remain; no test assertion body was changed. No Cypress, application server, real API/database, reset, migration, or production bootstrap command was run.

## Exact C3 changes

The workspace already contained the uncommitted C1/C2 work. This table describes only changes made after the C3 starting snapshot.

| Existing file modified | Reason |
| --- | --- |
| `cypress/support/commands.ts` | Correct refresh registration priority; relocate startup-data defaults to the earlier support hook; wait for the scenario's `@perms` response after `@signIn`. |
| `cypress/support/e2e.ts` | Add three narrow, stub-only initial Users-page responses before suite setup; correct the users envelope and countries route. Preserve safety import order and existing hooks. |
| `cypress/e2e/permissions.cy.ts` | Move each permission intercept before login; add the existing `roles-list.json` response to Admin setup before navigation. |
| `cypress/e2e/roles.cy.ts` | Move stub permissions before stub login. Live setup and all test bodies remain unchanged. |
| `cypress/e2e/sign-in.cy.ts` | Register minimal Users landing permissions before the first visit; use the earlier shared startup-data defaults instead of duplicate local responses. |
| `cypress/e2e/toponyms/regions.stub.cy.ts` | Register permissions before login; add only the limited Users-list permission needed for the existing initial `/users` landing. |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts` | Same setup-order/landing permission correction; retain the existing country/region/table fixtures and action permissions. |

| New file | Purpose |
| --- | --- |
| `cypress/safety/stub-auth-contracts.test.mjs` | Fifteen isolated regressions for setup ordering, strict contracts, refresh precedence, scenario overrides, and continued network rejection. |
| `docs/cypress-phase-c3-stub-auth-contracts.md` | This report. |

Total C3 increment: **7 existing files modified, 2 files added**. A 38-file starting snapshot confirmed that only those seven existing files changed; the other 31 baseline files remained identical. No fixtures, production services/schemas/guards/JWT logic, dependency declarations, package scripts, database reset code, or bootstrap code were edited.

## E05 — authentication setup and API isolation

### Permission readiness

Every stub caller of `cy.login()` now registers its scenario permission response first:

- Limited, Admin, and auth-recovery contexts in `cypress/e2e/permissions.cy.ts`.
- The stub branch of `cypress/e2e/roles.cy.ts`.
- Both Regions stub suites.

The standalone Sign-in suite also registers its permission response before navigation. It grants only `VIEW_LIMITED_USERS_LIST` for the existing successful `/users` landing. Both Regions setups receive the same narrow landing permission because the unchanged application redirects `/` to `/users` before their existing menu navigation to Regions. No Users create/edit/delete or administrative permission was added. Existing Toponym action permissions and Limited/Admin permission-denial fixtures are otherwise unchanged.

The shared stub login still uses the same form inputs, sign-in response, token/user data, and subsequent location behavior. It now waits for the explicit permission-response alias immediately after sign-in, matching the application's permission-loading completion boundary. This is an aliased network-readiness wait, not a timed sleep. A missing scenario permission route fails under C1 rather than contacting a backend or receiving a generic success response.

### Initial page-data registration

`cypress/support/e2e.ts:53–67` registers only these defaults in **stub mode**, before suite hooks:

| Request | Default response |
| --- | --- |
| `POST /api/users/get-users` | `{ data: { list: [], length: 0 } }` |
| `GET /api/roles/get-roles-names-list` | `{ data: [] }` |
| `GET /api/toponyms/get-toponyms-list` with `typeOfToponym=countries` | `{ data: [] }` |

The country route matches the current `AddressService` request, replacing the unused `get-countries-list` setup. Its query condition does not answer Region/District/Locality requests.

Moving these defaults earlier is necessary for precedence: registering a default countries reply inside login after a Regions fixture would mask the fixture. The support defaults now precede scenario routes, so the existing populated Russia/Region fixtures and later auth-recovery handlers override them. Isolated tests confirm that the Regions country response still contains fixture ID 143, not the default empty array.

The Admin permission suite separately registers `GET /api/roles/get-roles` using the existing `roles-list.json` before login/navigation. This is scoped to its existing role-page scenario context; no global role-table success response was added.

There is **no blanket successful API interceptor**. Unknown reads/writes, wrong country-list query types, unsupported download requests, foreign API origins, and direct `cy.request` still fail closed. No C1 allowlist, host rule, environment check, request rejection, or identity requirement was relaxed. Live-mode support registers none of the new successful data responses.

## E06 — users-list contract

The two former incorrect `users: []` providers are replaced by one early shared stub returning:

```javascript
{ data: { list: [], length: 0 } }
```

Its response alias remains `usersList`. The production `usersSchema`, `UserService`, and strict response-validation operator were not modified.

The isolated contract test evaluates the actual shared schema and `validateResponse()` source with installed Zod/RxJS, using an in-memory response. It verifies HTTP 200, an empty validated `data.list`, a zero `data.length`, exactly the expected keys, and no validation diagnostic. Thus the empty result is valid data, not an error handler's empty-list fallback. Separate negative assertions confirm that the legacy `users` shape and an extra field are still rejected.

This validates the empty-list data contract. Actual browser rendering of the empty table/no-data row was not executed or claimed; the application/template and its existing E2E assertions remain unchanged.

## E07 — refresh priority and overrides

`cypress/support/commands.ts:75–88` now registers:

1. The normal 200 refresh fallback, retaining alias `refreshOk` and its existing access-token response.
2. The one-use 401 route, retaining `times: 1`, alias `refreshInit`, and its existing unauthorized response.

Because matching non-middleware routes run in reverse registration order, the initial request consumes the one-use 401 and later requests receive the fallback 200. Later scenario-specific refresh routes still take priority. No auth guard, token implementation, endpoint, or production redirect was changed.

The isolated matcher tests verify the first response/alias, multiple subsequent 200 responses/alias, validity of the successful auth response bodies, and precedence of a later `acc_new_token` scenario override. Additional tests verify that protected-endpoint 401 → 200 and 403 overrides supersede the startup role-name default. They test response selection, not actual Angular recovery/redirect execution.

## Validation

| Check | Result |
| --- | --- |
| Starting C1/C2 baseline before edits | **99 passed, 0 failed, 0 skipped**. |
| Final `npm run test:e2e:safety` | **114 passed, 0 failed, 0 skipped**: 53 C1 + 46 C2 + 15 C3. |
| `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` | **Passed**, exit 0. Relevant support/spec/config TypeScript only. |
| `node --check cypress/safety/stub-auth-contracts.test.mjs` | **Passed**. TypeScript syntax is covered by the no-emit check. |
| All eight E2E specs compared with the C3-start AST snapshot | **Identical test names, arguments, and executable assertion bodies**. Changes are outside test bodies in setup/support. |
| Existing C1 registration checks | **Passed**: 31 stub / 11 live registrations, 39 distinct original E2E cases, no pending cases introduced. |
| Protected-source hash comparison | **Passed**: C1 safety module/config/backend/frontend and C2 reset/CLI/fixture implementations/tests remain unchanged. |
| `git diff --check`, explicit new-file whitespace/encoding checks, phase scope review | **Passed**. |
| Cypress/browser E2E, real API/database, reset/migration/bootstrap commands | **Not executed**. |

The C3 harness evaluates the actual support commands and suite setup hooks against a closed fake command/router layer. It models middleware-first/reverse route matching, one-use routes, aliases, and explicit replies. Its simulated visit/sign-in requests exercise setup and response selection without HTTP transport. A direct transport attempt throws; no backend/network fallback is available. Public schema/validator code is evaluated read-only with pure Zod/RxJS dependencies.

It does not execute browser DOM assertions or application guards. DOM calls in setup are placeholders; their UI behavior and real asynchronous timing remain unverified. Existing E2E test bodies are retained and are not used as simulated passing browser tests.

New coverage checks all six login setup contexts plus standalone Sign-in startup; scenario permission readiness; valid empty Users data; populated Region fixture precedence; Admin role-table data; retained Limited-role denials; refresh ordering/aliases; later error/success overrides; failure for missing permission setup; no successful defaults in live mode; and C1 rejection of unknown, foreign, direct, or mutating API requests.

## Preserved protections and unresolved work

- C1's exact spec separation, required support/isolation checks, frontend handshake, backend identity, host blocking, environment validation, and reset/request authorization remain in force. The safety module loads before the new narrow support defaults.
- C2's reset dependency/hash preflight, pepper checks, canonical CLI detection, typed region entity return, valid-ID checks, and exact-ID cleanup were not changed. `server/scripts/reset-test-db.mjs` and `server/scripts/bootstrap-admin.mjs` were not modified or executed.
- No real environment, credentials, disposable-database approval, or API target was provisioned or contacted. Live execution still requires all existing C1/C2 approvals and prerequisites.
- Runtime E2E pass/fail status is unknown. This phase establishes isolated registration/contract behavior, not a green browser suite.
- E08 and later unrelated findings remain deferred. For example, the download scenario still lacks its own correct download stub/assertion (E10); the C1 guard continues rejecting that unsupported request. The existing auth/permission assertion gaps, sort/CRUD assertions, country-selection intent mismatch, live isolation/timing issues, force/focus behavior, logging, dead code, and wider coverage gaps were not repaired here.

**Blocked/not authorized in C3:** all Cypress E2E run/open commands, `e2e:*` orchestration, application/API server startup, `reset:test:db`, schema/migration operations, and production/bootstrap commands. Real E2E execution requires a separate instruction; it was not started as a follow-on phase.

No E2E scenarios or meaningful assertions were removed, weakened, or skipped. No dependencies were upgraded. No commit or push was made.

**PHASE C3 — CYPRESS STUB AUTH & RESPONSE CONTRACTS**

E05/E06/E07 implementation and permitted static/isolated validation complete. Real database/application services contacted: **0**.
