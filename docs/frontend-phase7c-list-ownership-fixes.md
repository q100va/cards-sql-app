# PHASE 7C — LIST OWNERSHIP / RECIPIENT LOOKUP / AUDIT RECOVERY

## Root causes

- OrdersList started independent page subscriptions without request identity. Any response could replace rows, counts, and filter options; any finalizer could clear newer loading.
- CreateRecipientDialog likewise allowed independent home lookups to commit without checking the current selection intent. Clearing a home did not invalidate pending results.
- AuditTable handled HTTP errors only in the outer subscription. An error finalized the current loader but permanently terminated the paging/filter subscription. No stuck boolean or request lock caused this failure.

No shared infrastructure redesign was necessary.

## Files changed

Production, limited to the three requested components:

- `src/app/pages/orders-list/orders-list.component.ts`
- `src/app/pages/recipients-list/create-recipient-dialog/create-recipient-dialog.component.ts`
- `src/app/pages/audit-table/audit-table.component.ts`

Six new tests in three new specs:

- `src/app/pages/orders-list/orders-list.request-controls.spec.ts`
- `src/app/pages/recipients-list/create-recipient-dialog/create-recipient-dialog.request-controls.spec.ts`
- `src/app/pages/audit-table/audit-table.recovery-controls.spec.ts`

Report: `docs/frontend-phase7c-list-ownership-fixes.md`.

All previously existing specs, including the five Phase 7A regression expectations, remain unchanged.

## Workflow map

| Component | Trigger and request | State updates | Error/finalize and teardown |
| --- | --- | --- | --- |
| OrdersList | PrimeNG lazy-load/search event → normalized filters and existing query → `OrderService.getOrders` | PrimeNG owns the requested page; `event.first` is the offset and `event.rows` is the limit. Current success replaces rows, total, users, statuses, sources, and occasion nodes. | Current errors keep the existing MessageWrapper context; only the current page finalizer releases page loading. Existing `takeUntilDestroyed` remains. |
| CreateRecipientDialog | MatSelect updates `nursingHomeControl` → `onHomeSelected` → clear seniors → existing occasion/home eligible-seniors request | Current success supplies the senior options. The existing template renders those options; removing them removes the previous dependent list choices. Existing Create disabling remains. | Current errors retain occasion/home notification context. Current lookup completion releases lookup loading. Clearing invalidates the lookup, clears options, and releases loading immediately. Existing teardown remains. |
| AuditTable | Filter/page subjects → existing debounce, reduction, equality checks → `switchMap` → `AuditService.getAuditPage` | Existing page index/size, filter reset to page zero, UTC date handling, offset calculation, response rows, and count remain. | HTTP error reports inside the inner request, which completes without emitting replacement data. Outer triggers stay subscribed; existing soft loader finalizes and destruction cleanup remains. |

OrdersList is a separate PrimeNG controller and does not reuse shared Table. OrdersList and home lookups remain physically concurrent; local intent versions control authority. Audit retains its existing `switchMap` cancellation.

## ORDERSLIST

**Ownership mechanism:** Increment a private page-request version for every load, including repeated page numbers. Capture it in the request callbacks.

**Stale success:** Return before changing rows, total count, or any derived options. An older response cannot change the current page or its displayed data.

**Stale error:** Return before notifying; do not disturb current rows or loading. Current errors retain the existing notification context.

**Loading ownership:** Only the current page request may clear page loading in `finalize`, whether it succeeds, fails, or is unsubscribed.

**Pagination behavior:** Query construction, offsets, page sizes, sort values, normalized filters, search values, and pagination UI remain unchanged. A→B→A is three distinct requests.

## CREATE RECIPIENT DIALOG

**Home intent mechanism:** Increment a private lookup version on every selection or clear, rather than comparing home IDs.

**Dependent state behavior:** Preserve the existing immediate `seniors = []` reset and template selection behavior. No new selection model or business setup was introduced.

**Stale success:** Return before assigning eligible seniors. Older A cannot replace B or the newest A in A→B→A.

**Loading ownership:** Only the current home lookup may release lookup loading. Stale errors neither release that loading nor notify; current errors keep their existing handler and context.

**Clear behavior:** Null/undefined clears create a new intent, leave options empty, and release loading. Old completions cannot repopulate a cleared selection. The handler's type now explicitly permits its existing null/undefined clear cases.

Initial home-group loading, recipient creation, validation, template, and lifecycle cleanup were preserved.

## AUDIT TABLE

**Failure root cause:** An unhandled inner HTTP error terminated the outer subscription, so later page events had no active consumer.

**Stream/request recovery:** Inner `catchError` invokes the existing MessageWrapper and returns `EMPTY`. It settles only that request, preserving the outer page/filter pipeline. No fake successful response or global error suppression was added.

**Loading recovery:** Existing `finalize` clears the soft loader after failure; the next request can use the existing 180 ms delayed loader normally.

**Retry behavior:** A later page event causes a real HTTP request, which can update rows and count successfully without recreating the component. Existing equality/deduplication and filter semantics remain.

**Error behavior:** The failed HTTP request still notifies once. Existing rows/count are not replaced on failure, and existing successful-load diagnostics remain. The outer error handler remains for errors outside the inner request.

## Tests and validation

Starting verified full-suite state supplied for this phase: **689 passed, 5 failed, 694 total**. Before editing production, the three Phase 7A specs reproduced exactly **5 failures and 3 passing controls**.

After the fixes, validation ran in the requested order:

| Check | Result |
| --- | --- |
| Five unchanged Phase 7A regressions | **5/5 passed** |
| Three original controls in those specs | **3/3 passed** |
| New Phase 7C controls | **6/6 passed** |
| Directly affected existing specs | **52/52 passed** |
| Full frontend | **700/700 passed, 0 failed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| Cypress permissions | **8/8 passed** |
| Production TypeScript | **Passed** |
| `git diff --check` | **Passed** |

The six new controls protect:

1. OrdersList A→B→A authority, rows/count/derived options, and unchanged pagination/sort/filter query.
2. Stale OrdersList errors versus current loading and current error notification.
3. Home A→B→A authority and immediate clearing of old senior options.
4. Home clearing while a lookup is pending.
5. Stale home errors versus current loading and current error notification.
6. Audit failure notification, released loading, real next-page HTTP, delayed loading, and successful rows/count update.

These use deterministic `HttpTestingController` completions. The Audit control advances the fake clock past the existing loader delay; no arbitrary sleeps were added.

The 52 affected existing tests cover OrdersList's component spec, AuditTable's component spec, and Order/Senior/Recipient/Audit service specs. Karma runs used `npm test -- --watch=false --browsers=ChromeHeadless` with explicit `--include` paths for focused runs; the full run omitted includes. Production TypeScript used `tsc -p tsconfig.app.json --noEmit`. Cypress ran the existing `permissions.cy.ts` with its established stub mode against the frontend dev server; backend code was not changed or started for this check.

Exact total: **694 existing tests + 6 new controls = 700 tests**. All 694 existing tests now pass. No tests were removed, skipped, focused, or weakened. Remaining failures: **0**.

## Final review / behavior preserved

- Latest page and latest home intent win, including repeated A→B→A selections.
- Older page/home responses cannot overwrite current rows/options/counts or release newer lookup/page loading.
- A cleared home stays cleared after old work completes.
- Audit HTTP failure leaves future paging active; its next request and loading recover normally.
- Current errors retain established notifications; obsolete page/home errors do not notify.
- Existing lifecycle teardown remains; no duplicate lifetime infrastructure or generic ownership service was added.
- Backend, schemas, DTOs, endpoints, API/query contracts, dependencies, and configuration are unchanged.
- No broad `any` or type suppressions were introduced.
- OrderCard Phase 7B, shared Table, AdvancedDetails, BaseList, dynamic host, Reporting, UploadFile, and AddressFilter were not modified.
- No privacy/logging, accessibility, localization, visual, budget, or unrelated cleanup work was included.
- The diff contains only three production component fixes, three new control specs, and this report. Pre-existing untracked documentation was preserved.

PHASE 7C — LIST OWNERSHIP / RECIPIENT LOOKUP / AUDIT RECOVERY COMPLETE
