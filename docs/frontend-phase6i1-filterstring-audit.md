# PHASE 6I1 — BASELIST FILTERSTRING SIDE-EFFECT AUDIT

## Current implementation

`BaseListComponent.filterString` is a **computed with an external side effect**, not a pure derivation. It builds the human-readable filter summary, then calls `allFilterParametersChange.emit(ap)` before returning the string (`base-list.component.ts:166–393`, emission at line 390).

The separate `allFilterParameters` computed is pure. It contains view and home-view options, search, outdated/exact-match flags, the general filter, address IDs and the three strong-filter flags. `addressStringValue` is presentation state and is deliberately absent from that query snapshot.

## Filter state flow

1. View controls, search actions and exact-match/outdated toggles update BaseList signals. Route query parameters initialize address IDs and the displayed address string.
2. TableFilter outputs update the general filter, address IDs, address label and strong-filter signals through BaseList template bindings. TableFilter also emits `goToFirstPage`, but BaseList does not bind that output.
3. BaseList derives `allFilterParameters` from the query inputs.
4. Reading `filterString()` derives labels from that snapshot, `params()` and `addressStringValue`, then emits the snapshot.
5. Table's template handles that output with `onAllFilterParametersChange`. The handler calls `goToFirstPage()` before assigning `filterParameters`.
6. Table derives its request key from filters, sort, page, page size and reload tick. Its observable applies `distinctUntilChanged` using stable serialization, then fetches through the actual owner service.

TableSettings only passes column selection and badge changes through BaseList; it is not a query publisher. No TableFilter, TableSettings or Table production code was changed.

## Side effect found: YES

The direct effect is an output emission. The indirect effects are Table filter-state replacement and a paginator reset; a changed request key can then cause HTTP work. These effects run when the invalidated summary is evaluated, rather than when a query publisher explicitly observes query inputs.

## Read-count / invalidation behavior

- Repeated reads with unchanged dependencies return the cached summary and do not repeat publication. That control passes.
- Changing a query filter without a summary reader leaves the output unpublished even after fixture stabilization. The regression expects one publication and receives zero.
- Changing only `addressStringValue` leaves the query snapshot unchanged. Reading the newly invalidated summary nevertheless emits that snapshot once. The regression expects no publication and receives one. A second cached read adds no emission.
- Empty, one-filter, multiple-filter and cleared-filter scenarios produce deterministic strings and exact current query snapshots. The default view label remains present even when the general filter is empty.

The reader-isolation fixture removes the template only in the new BaseList spec. It retains lifecycle/change detection and tests public signals and output events, without inspecting Angular computed internals. The separate Table spec retains the real BaseList and Table templates.

## Template dependency

The only production reader of this BaseList computed is the applied-filter label in `base-list.component.html:147`. There is no independent effect or request-construction reader of BaseList's `filterString`. ToponymsList has its own unrelated `filterString` and does not consume this member.

Consequently, normal rendering currently drives query publication. A manual read of an invalidated summary also drives it. Removing or conditionally omitting the summary binding would change publication behavior, even though the underlying query inputs still exist.

## Query / request impact

Tests use the real Table/BaseList templates, HomeService and `HttpTestingController`. Only auxiliary role/partner/toponym lookup data is stubbed. The Home list request is not replaced by a service spy.

At page index zero, replaying the child address-label output with unchanged address IDs/general filters causes an identical query publication, but Table's stable-key deduplication suppresses another list request. **A publication is not automatically a duplicate HTTP request.**

At page index one, the same presentation-only event reaches the unconditional page-reset handler. Both Table and MatPaginator move to index zero, and one additional list request occurs. The filter snapshot remains equal; changing the page makes the request key different, so deduplication cannot suppress it.

This is an executable component-event boundary reproduction, not a claim about how frequently a particular end-user gesture produces that event. No duplicate-request frequency or unrelated UI defect is inferred.

## Pagination impact

Resetting the page for a genuine filter change remains correct. A passing test starts on index one, changes `hasCoordination`, and verifies exactly one page-zero request containing the changed filter. Subsequent cached summary reads produce no additional request.

The regression starts on index one through the actual paginator's `nextPage()`, ensuring both paginator and Table state match. It changes only the displayed address label and expects the page and request count to remain unchanged. Both page assertions fail and an unwanted request is observed. This distinguishes the ownership defect from legitimate filter-change pagination.

## Tests added

`src/app/shared/base-list/base-list.component.spec.ts` — four tests:

1. Cached summary reads do not repeat query publication — passes.
2. Changed query state publishes once without a summary read — fails.
3. Reading an invalidated display-only summary does not publish a query — fails.
4. Empty/single/multiple/cleared summaries and snapshots remain deterministic — passes.

`src/app/shared/table/table.filter-string.spec.ts` — three tests:

1. Unchanged query at index zero is deduplicated after display-label invalidation — passes.
2. Display-only label changes preserve a later page and avoid HTTP work — fails.
3. A real filter change resets pagination once; cached summary reads do not repeat HTTP work — passes.

All seven are new tests. Existing specs, assertions, production templates and configuration are unchanged. Unexpected requests are asserted as failures before being flushed for clean teardown.

## Confirmed regressions

| New failing test | Classification | Observed result |
| --- | --- | --- |
| Publish changed filter without summary read | Render/read-dependent behavior | Zero output events after stabilization; one expected |
| Read invalidated display-only summary | Computed read triggers external side effect; duplicate query update | One unchanged query snapshot emitted; zero expected |
| Preserve page on display-only label change | Pagination ownership issue; unnecessary request | Index one becomes zero and another list request occurs |

There is no evidence of repeated emissions from cached reads or a stale derived DTO. Without a summary read, downstream publication is absent; the second regression isolates the read as the trigger.

## Architecture decision: OPTION C

A concrete pagination/request bug is reproduced through the existing component output binding. The side-effect ownership problem is also independently demonstrated. Cached reads and page-zero request deduplication limit the problem but do not eliminate it.

## Recommended Phase 6I2

Make `filterString` a pure formatter and move its query-output emission into **one lifecycle-owned reactive publisher of `allFilterParameters`** in BaseList. The publisher must depend only on query inputs, not the summary, labels or incidental readers. Do not add a second publication path.

Preserve the current snapshot shape, search normalization, endpoint behavior, Table request serialization/deduplication and legitimate pagination reset. Preserve route-default initialization and Table's address gate so the initial request still contains the predefined address filter. Keep this as a BaseList boundary fix; no Table rewrite, new service, template redesign or general RxJS migration is warranted.

This is the smallest useful change because it gives query publication an explicit owner while retaining all existing formatting and downstream request machinery. The new tests define both the intended separation and the correct reset/dedup controls. Implementation is deferred to Phase 6I2.

## Validation

Before editing, full frontend baseline: **654/654 passed**.

| Check | Existing tests | New tests | Passed | Failed |
| --- | ---: | ---: | ---: | ---: |
| New BaseList/Table boundary specs | 0 | 7 | 4 | 3 |
| Focused BaseList and Table specs | 10 | 7 | 14 | 3 |
| Full frontend | 654 | 7 | 658 | 3 |

All 654 previous frontend tests passed. Only the three named new regression tests failed in both the focused and full runs; they remain enabled and unfixed in this tests-only phase.

Additional checks:

- Auth: **29/29 passed**.
- Routing: **33/33 passed**.
- Cypress permissions: **8/8 passed**, using the existing `USE_STUBS=1` permission-spec setup.
- Production TypeScript (`tsc -p tsconfig.app.json --noEmit`): **passed**.
- `git diff --check`: **passed**. The three new files were also checked with `git diff --no-index --check`; no whitespace errors were reported.

Commands: `npm test -- --watch=false --browsers=ChromeHeadless`, with focused `--include=src/app/shared/base-list/*.spec.ts` and `--include=src/app/shared/table/*.spec.ts` before the full run. Validation logs are in `C:\Users\Owner\AppData\Local\Temp\baselist-filter-6i1-95a7a376`.

Files added in this phase: the two specs listed above and this audit. Pre-existing untracked documentation was left untouched. No tracked file was modified.

Production files changed: **0**. AdvancedDetails/Phase 6H2, 6H3 and 6H5 are untouched. No backend, schema, dependency, configuration, production template or CSS changes; no existing tests skipped, removed or weakened.

PHASE 6I1 — BASELIST FILTERSTRING SIDE-EFFECT AUDIT COMPLETE

Production files changed: 0
