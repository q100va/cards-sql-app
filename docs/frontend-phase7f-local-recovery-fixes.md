# PHASE 7F — LOCAL RECOVERY / LOADING OWNERSHIP / ORDER EDIT AFFORDANCE

## Scope and starting point

Starting verified baseline: **705/705 frontend tests passed** after 7B–7D and the production-free 7E reassessment. This batch addresses only R09–R12. No accessibility, R14 confirmation wording, localization, visual, or release/build-budget work was included.

Tests were added and run before production edits. The initial focused run reproduced **5 failures and 4 passing controls**, all within the intended boundaries. After the local fixes, all **9/9** pass. No existing test or expectation was modified.

## Files changed

Production:

- `src/app/pages/order-details/order-details.component.ts`
- `src/app/pages/order-details/order-details.component.html`
- `src/app/pages/seniors-bulk-update/seniors-bulk-update.component.ts`
- `src/app/pages/toponyms-lists/toponyms-list/toponyms-list.component.ts`

New focused specs:

- `src/app/pages/order-details/order-details.recovery-permissions.spec.ts`
- `src/app/pages/seniors-bulk-update/seniors-bulk-update.comparison-recovery.spec.ts`
- `src/app/pages/toponyms-lists/toponyms-list/toponyms-list.loading-ownership.spec.ts`

Report: `docs/frontend-phase7f-local-recovery-fixes.md`.

## R09 — ORDERDETAILS

**Root cause / workflow traced before editing:** Route `paramMap` produces order/user IDs → `switchMap` starts `getOrderById` → success replaces `order` → inner finalizer releases loading. The HTTP error was handled only by the outer subscription, which then terminated. Starting a new fetch did not clear the prior `order`, so A could remain after B failed, and later route C could not trigger a request.

**Files changed:** OrderDetails controller and the new recovery/permission spec. The existing neutral card shell/template presentation remains.

**Failure behavior:** Handle each fetch error inside its inner observable using the existing MessageWrapper context and return `EMPTY`. Finalization still releases loading. The original outer error handler remains for errors outside this request boundary; no global route-error suppression or redirect was introduced.

**Recovery behavior:** A later valid route ID still reaches the active subscription, issues a real GET, and assigns the validated response. Notifications retain their source/stage/order/user context, now captured from the failing request's IDs.

**Stale-data behavior:** Set `order` to null when each route fetch starts. A therefore cannot remain current during B or after B fails. The existing shell remains, with no automatic redirect or new user-facing wording.

**Request/loading ownership:** Keep existing switchMap cancellation and `takeUntilDestroyed`. Loading is acquired inside the projection, after switchMap has cancelled/finalized the previous request. No request counter or shared recovery infrastructure was needed.

**Tests — 2:**

1. Load A, start B, assert immediate clearing/loading, fail B, assert no old recipient view and one existing error notification, then issue real C GET and load C through the same component/subscription.
2. Replace pending A with B, assert A is cancelled while B owns loading, then verify B success and loading completion without an obsolete notification.

## R10 — RECIPIENT EDIT AFFORDANCE

**Permission source:** Existing `AuthService.has('EDIT_ORDER')`, which reads the current permissions signal. This is the same authority used by the existing `HasOpDirective` on order actions and by the recipient component's other permission-dependent presentation. No new permission constant, facade, backend policy, or guard was created.

**Files changed:** OrderDetails controller/template and its new spec. OrderRecipients itself remains unchanged.

**Viewer behavior:** The parent supplies `isEditAllowed = false` without EDIT_ORDER. The child's existing conditional action UI consequently hides Edit/Save/removal affordances while preserving recipient viewing. The parent mutation handler also checks the same permission before sending a write, protecting that local event boundary from a stale/direct invocation.

**Editor behavior:** EDIT_ORDER holders keep the existing order-status 1/2 and open-occasion restrictions. The existing child Edit → staged removal → Save flow sends the same PATCH body and applies the same validated response. VIEW_ORDER route access remains unchanged.

**Security distinction:** This fixes a misleading affordance and avoidable forbidden request. Backend authorization was already the security boundary and was not changed.

**Tests — 3:**

1. VIEW_ORDER without EDIT_ORDER: recipient editing is unavailable in the actual child/DOM; direct parent invocation sends no write and retains the order.
2. EDIT_ORDER: actual rendered Edit/Save buttons drive the existing PATCH `{ id, deletingIds }`; successful response refresh and loading remain valid.
3. An editor still receives no edit affordance for a noneditable order or closed occasion.

## R11 — BULK COMPARISON

**Root cause / workflow traced before editing:** The prepared home starts with visible Start and a month control in its current enabled/disabled state. `onStartClick` hides Start and disables months before awaiting comparison. `compareLists` owns request loading, notification, and failure rethrow. The caller previously let that rejection escape without restoring the preparation step.

**Files changed:** Bulk controller and the new comparison-recovery spec. No upload, row validation, date policy, reconciliation, apply/save, or other feature architecture was changed.

**Failure recovery:** Capture Start visibility and whether months were enabled before the attempt. Catch the comparison rejection at the caller, restore that prior Start/control state, and return. The comparison helper still reports the original error and settles its loader exactly once. No duplicate notification was added.

**Retry behavior:** The prepared home/list, selected months, comments choice, and update date remain available. Retrying sends the same existing POST payload and can succeed. Previously disabled months stay disabled; recovery does not blindly enable every control.

**Successful behavior:** Existing difference-group assignment, home ID, no-changes handling, hidden Start, and intentionally disabled months are untouched. There is no unconditional finally block that would reopen controls after a successful comparison.

**Tests — 2:**

1. Real comparison request → HTTP failure → resolved handled attempt, existing notification, released spinner, restored Start/enabled months, preserved inputs → same-body retry → successful difference groups/home ID with Start hidden and months disabled.
2. Failure with a previously disabled month control preserves that disabled state and the selected values while restoring Start and settling loading.

## R12 — TOPONYM LOADING

**Root cause / workflow traced before editing:** Reactive query changes feed `tap(showSpinner = true)` before switchMap. Replacing pending A first sets loading true for B, then cancels A; A's finalizer resets it false before B subscribes. The bug is in this specialized local controller, not shared Table.

**Files changed:** ToponymsList controller and its new loading-ownership spec. AddressService and all query/response contracts remain unchanged.

**Ownership mechanism:** Acquire loading inside the switchMap projection, after the old inner subscription has been cancelled and finalized. Keep the current inner finalizer responsible for completion/error/destruction cleanup. No version field, global counter, or generic loading service was added.

**Cancellation behavior:** Existing switchMap/HttpClient cancellation physically unsubscribes A, preventing its response/error callbacks from committing or notifying. The controlled HTTP test asserts A's cancellation. No speculative stale-callback abstraction was added.

**Current request behavior:** B stays loading while pending, then updates rows/count and releases loading. Existing inner error handling reports a current error, releases loading, and keeps the query stream available for a later successful reload.

**Tests — 2:**

1. Pending A → page B → A cancelled/finalized → B still loading → B success updates rows/count/page and settles loading; existing GET type/page/pageSize/sort values are asserted.
2. Current HTTP failure retains notification/loader completion; force reload issues a new request, loads successfully, and settles normally.

## Validation

Validation order: new focused regressions before production (red) → new regressions after fixes → affected existing component/service specs → full frontend → Auth/Routing/Cypress/production TypeScript → final diff review.

| Check | Result |
| --- | --- |
| Pre-fix new focused specs | **5 failed, 4 passed; 9 total** |
| Post-fix focused specs | **9/9 passed** |
| Affected existing specs | **92/92 passed** |
| Full frontend | **714/714 passed** |
| Remaining failures | **0** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| Cypress permissions | **8/8 passed** |
| Production TypeScript | **Passed** |
| `git diff --check` | **Passed** |

The 92 existing tests cover OrderRecipients, OrderService, SeniorService, AddressService, the bulk parent/changes-table components, ToponymsList's existing controller/upload-lifetime tests, and its four toponym wrappers. Existing assertions were not changed or weakened.

Final total: **705 existing tests + 9 new tests = 714 passed, 0 failed**. Focused tests use real components, existing test providers/harnesses, HttpTestingController, and existing response validators. No arbitrary sleeps, fake production models, broad `any`, focused/skipped tests, or type suppressions were added.

Karma runs use `npm test -- --watch=false --browsers=ChromeHeadless`, with explicit includes for focused runs and none for full frontend. Remaining checks use the established Auth/Routing spec sets, Cypress `permissions.cy.ts` stub runner, `tsc -p tsconfig.app.json --noEmit`, and `git diff --check`. Logs are in `C:\Users\Owner\AppData\Local\Temp\phase7f-recovery-ee76f3c5`.

## Behavior preserved / final review

- OrderDetails no longer retains an old order for a failed replacement and can load a later valid route ID.
- VIEW-only users retain viewing without recipient editing; EDIT_ORDER users retain the original status-limited editing/save flow.
- Bulk comparison failure restores the prior retryable preparation state without clearing valid inputs; successful comparison behavior is unchanged.
- Old toponym cancellation cannot clear replacement loading; the current request alone settles its own loading within this query pipeline.
- Existing notifications, teardown, HTTP endpoints/methods/queries/bodies, schemas, DTOs, permission constants, and backend remain unchanged.
- No route architecture, permission infrastructure, generic recovery/loading service, or shared logging architecture was introduced.
- Phase 7B/7C ownership fixes, 7D diagnostic boundaries, AdvancedDetails, BaseList, shared Table, dynamic host, and Reporting were not changed.
- Accessibility and R14 confirmation text remain for Phase 7G. No translations, CSS, dependencies, configuration, or build budgets were changed.
- No existing spec was modified; no tests were removed, skipped, or weakened. Only the three focused new specs were added.
- Pre-existing documentation, including the Phase 7E reassessment, was preserved.

PHASE 7F — LOCAL RECOVERY / LOADING OWNERSHIP / ORDER EDIT AFFORDANCE COMPLETE
