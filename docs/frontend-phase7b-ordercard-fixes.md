# PHASE 7B — ORDERCARD IDENTITY / RETRY / DIALOG CONTRACT FIXES

## In-scope Phase 7A failures

All five tests in `src/app/pages/order-card/order-card.request-state.spec.ts` were kept unchanged:

1. `keeps the latest selected volunteer when an older lookup finishes afterwards`
2. `keeps contact suggestions cleared after the search becomes too short`
3. `keeps the latest search suggestions when an older search completes late`
4. `releases the Create latch after duplicate preflight fails so the user can retry`
5. `does not request an undefined volunteer when the creation dialog closes without a result`

These were five failing expectations covering four root causes, not five independent architectural defects. The initial focused run reproduced **5 failed, 0 passed**. After the fixes, all **5/5 pass**.

## Executable workflow map

| Workflow | Trigger and async boundary | State/pending owner | Error and retry path |
| --- | --- | --- | --- |
| Volunteer selection | Autocomplete selection calls `getVolunteer(id)`; VolunteerService `getById` HTTP | Commits `volunteer`; optionally chooses the existing first contact for `updateContact = true`; clears existing result/message fields as before | Live errors keep the existing MessageWrapper path; a later selection is a new intent. Clearing the contact invalidates a pending selection. |
| Contact suggestions | Autocomplete complete event calls `filterContact`; `searchContacts` HTTP | Commits `filteredContacts`; short/empty input clears suggestions | Live errors clear suggestions and use the existing handler; old errors/results are ignored. There is no separate lookup spinner in the existing component. |
| Create, institute warning | `onCreateOrderClick`; optional ConfirmationService callback and 200 ms timeout | Sets `blockCreateButton`; captures one Create-attempt identity | Reject releases the attempt; delayed acceptance cannot revive a finished/destroyed attempt. |
| Duplicate preflight | `checkDuplicates`; OrderService `checkOrder` HTTP, then optional duplicate confirmation | One preflight per Create attempt; continuation belongs to that attempt | Current preflight error reports once and releases authority; retry starts a new attempt without changing form values. |
| Create request | `createOrder`; existing form checks, DTO construction, OrderService HTTP | `createRequestPending`, `showSpinner`, `blockCreateButton`; one request per live continuation | Existing error notification and successful result handling remain. Finalization releases only its current attempt; early-return validation guards also release pending state. |
| Creation dialog | `onAddVolunteerClick` opens the existing DetailsDialog host | No creation-result-to-ID continuation exists now | Any close ends the continuation. A new volunteer can be selected through the existing contact search. Cancellation does not cause a request or error. |
| Existing volunteer card | `onOpenCardClick`; existing volunteer fetch, dialog, then optional refresh fetch | Captures current selection intent and known volunteer ID | A valid `{ refresh: true }` result refreshes that ID. False/missing/invalid results, destruction, or a newer selection do not resume it. Live lookup errors retain existing notifications. |

## Root causes

- Volunteer and contact requests used independent `subscribe` calls, with no check that a response still belonged to the current user intent. They are separate workflows and need separate ownership identities.
- Clearing a short search did not invalidate a pending contact response; clearing the selected contact likewise needed to invalidate pending volunteer work.
- The duplicate-preflight error path never cleared `blockCreateButton`. UI disabling alone also did not protect reentrant Create calls or repeated confirmation continuations.
- OrderCard assumed a creation-dialog result contained `res.id`. The actual host returns `{ refresh: boolean }`; VolunteerService creation validates a name string, not a newly created record/ID.

No shared infrastructure failure or backend/schema correction was needed.

## Files changed

- `src/app/pages/order-card/order-card.component.ts` — the only production file modified.
- `src/app/pages/order-card/order-card.selection-retry.spec.ts` — 11 new focused controls.
- This report.

All existing tests, including every Phase 7A regression and the deferred failing suites, remain unchanged. No templates, styles, services, shared dialog contracts, backend files, schemas, dependency files, or configuration files were changed. Pre-existing untracked documentation was preserved. Nothing was staged or committed.

## Volunteer ownership mechanism

`volunteerLookupIntent` increments for every `getVolunteer` invocation, including A → B → A. A response/error can act only when its captured intent is current. Repeated entity IDs are not used as an intent identity.

Contact clearing still performs the existing null/reset behavior and additionally invalidates pending volunteer work. The existing-card dialog captures this selection intent and the known ID; a newer selection or clear prevents old opening/closing continuations from refreshing obsolete state.

## Contact ownership mechanism

`contactLookupIntent` advances on every autocomplete request/clear, before the minimum-length return. Stale success cannot repopulate short-query suggestions, replace a newer query's results, or affect the volunteer workflow. Contact and volunteer counters do not invalidate each other.

The service still receives the same trimmed query from this caller, and its existing single-path-segment encoding is unchanged. No search semantics, endpoint, or service signature changed.

## Stale success behavior

Outdated results return before assigning volunteer/contact state or choosing a contact. The controls cover A/B/A repetition, correct current result/contact application, two independent workflows, and clearing a pending volunteer selection. No physical cancellation or global request manager was introduced.

## Stale error/loading behavior

Outdated lookup errors return before clearing current suggestions or calling MessageWrapper. Current errors continue through the existing source/stage notification path. The guard is at the OrderCard state/user-notification boundary; existing HTTP interceptor diagnostics remain unchanged.

Lookup flows do not own a spinner, so none was added. Create owns its existing spinner/latch through the attempt identity and pending-request guard. Existing `takeUntilDestroyed` remains; destroy invalidates the local identities so delayed continuations cannot resume a finished owner. The edit-dialog close subscription now also uses `takeUntilDestroyed`.

## Create/preflight root cause and retry behavior

`finishCreateAttempt` releases the current Create latch, request-pending state, and spinner, then invalidates that continuation. It is used for preflight errors, confirmation rejection, existing early validation exits, and request finalization.

The deterministic retry test sets a valid form, starts preflight, receives HTTP 503, confirms notification and unchanged form values, retries that same state, and verifies the normal POST payload and successful response continuation. This proves actual retry, not only a boolean reset.

Form definitions, validators, required fields, payload values, DTO assembly, and response semantics remain unchanged. In particular, an empty successful recipients result still uses the existing failed-allocation message behavior.

## Double-submit behavior

- A second `onCreateOrderClick` is ignored while `blockCreateButton` is true.
- A Create attempt starts preflight only once, even if the institute confirmation callback repeats.
- `createRequestPending` prevents two simultaneous Create requests from repeated confirmation acceptance/direct continuation.
- Settling/rejecting an attempt invalidates its captured continuation, so a late repeated acceptance cannot submit again after completion.
- A failed attempt does not consume the next valid attempt's authority.

Tests exercise both the institute-warning continuation and the duplicate-order confirmation, plus repeated click/direct continuation while the Create request is pending.

## Dialog result contract

The existing shared host maps child close data to `{ refresh: !!data }`. It does not return an entity ID. The create API returns the volunteer name string, and names are not unique record identifiers for an automatic lookup.

The user explicitly confirmed the bounded handling: guard/end all creation-close continuations, do not invent/derive/look up an ID from the result or name, and select newly created volunteers through the existing contact search. Automatic post-create selection is unsupported by the current contract.

### Undefined/no-result behavior

Creation opens the dialog without subscribing to an invalid ID-return continuation. `undefined`, `null`, cancel/dismiss, `{ refresh: false }`, and `{ refresh: true }` never start a volunteer lookup or display a lookup error. No placeholder/coerced ID or name-based fallback exists.

### Valid-result behavior

The existing-volunteer edit flow has a real captured ID. A local `unknown`-based type guard accepts exactly an object with `refresh === true`; only the current selection may use it to refresh that known volunteer and update the existing first-contact choice. A false result does nothing. A newer selection makes an old dialog continuation stale.

This preserves the actual shared result contract; no synthetic `{ id }` result was added or tested as though the host produced it.

## Focused and existing OrderCard specs

| Run | Passed | Failed |
| --- | ---: | ---: |
| Original Phase 7A OrderCard tests | 5 | 0 |
| New controls | 11 | 0 |
| Existing component/service/host tests in affected group | 60 | 0 |
| Combined affected group | 76 | 0 |

The affected group includes `pages/order-card/**/*.spec.ts`, OrderService, VolunteerService, OccasionService, and the existing shared details-host specs. Phase 7A tests were not edited, weakened, renamed, or skipped.

## Full frontend / remaining failures

**689 passed, 5 failed; 694 total.** The Phase 7A total of 683 increased by the 11 new controls. All 670 pre-audit baseline tests remain green. The five remaining enabled failures are exactly the unchanged Phase 7C work:

| Deferred suite | Exact failing test |
| --- | --- |
| OrdersList request ownership | `keeps the latest requested page when an older page completes afterwards` |
| OrdersList request ownership | `keeps loading while the current page is pending after an older completion` |
| CreateRecipientDialog home selection ownership | `keeps Home B seniors when the older Home A lookup completes late` |
| CreateRecipientDialog home selection ownership | `keeps loading until the latest home lookup completes` |
| AuditTable HTTP recovery | `can request another page after a failed HTTP request` |

No Phase 7D privacy/Blob behavior was changed, and no failing automated test in this remaining set belongs to 7D. The full-suite nonzero exit is expected from these five preserved 7C regressions, not from an OrderCard or existing-suite regression.

## Final validation

| Check | Result |
| --- | --- |
| Auth | 29/29 passed |
| Routing | 33/33 passed |
| Cypress permissions, existing stub setup | 8/8 passed |
| Production TypeScript | Passed |
| `git diff --check` and new-file whitespace checks | Passed |
| Existing tests changed/skipped/weakened | 0 |
| Production files changed | 1, OrderCard only |

Commands: `npm test -- --watch=false --browsers=ChromeHeadless` with focused include paths before the full run; the existing Auth/Routing groups and `permissions.cy.ts` stub runner; `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`; `git diff --check`.

AST-based review verified unchanged `orderForm`, `filterForm`, `dialogConfig`, both request DTO construction expressions, and unrelated helper/reset/date/display methods. All four Phase 7A spec files match HEAD byte-for-byte. No broad `any`, type suppression, disabled test, new logger, or service abstraction was introduced.

Logs and integrity evidence: `C:\Users\Owner\AppData\Local\Temp\phase7b-fix-c9e48e2a`.

## Behavior preserved

Latest live volunteer/contact intentions win; stale results and errors do not change current selection/UI notification state. Existing Create pending/loading state is owned and recoverable, current errors still notify, successful retry works, and simultaneous/repeated submissions are guarded. Creation-dialog cancellation/no-result performs no lookup; valid known-ID edit refresh follows the existing lookup path. No request method, endpoint, parameter/body shape, response schema, backend contract, validator, or shared dialog contract changed.

PHASE 7B — ORDERCARD IDENTITY / RETRY / DIALOG CONTRACT FIXES COMPLETE
