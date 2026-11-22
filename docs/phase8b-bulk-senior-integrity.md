# PHASE 8B — BULK SENIOR UPDATE INTEGRITY

## Original defect and root cause

A bulk save could return success and record a completed Home update for a Senior deleted after comparison. The request schema validates shapes, but the save previously trusted submitted identifiers and never verified that existing Seniors belonged to the selected Home. It reported the number of submitted edits even when the database affected fewer rows.

The changes are limited to the [bulk controller](../server/controllers/ctrl-update-seniors-list.js), [Seniors route](../server/routes/seniors-api.js), and their [integration](../server/tests/int/seniors-api.int.test.js) and [unit](../server/tests/unit/ctrl-update-seniors-list.unit.test.js) tests. The pre-existing Phase 8A report and admin bootstrap script were preserved.

## Transaction map

POST `/api/seniors/update-seniors-list` still runs auth, the `UPLOAD_LIST_OF_SENIORS` permission check and the shared `bulkUpdateSchema` before entering `withTransaction`. The complete write sequence inside that transaction is:

1. Validate admission Home IDs. Collect the existing IDs from the removal and edit sections, then verify and lock the matching rows.
2. Run `addNewSeniors` to insert admission rows, reload them, and write their search rows. It already checks the lengths returned by the creation, reload, and search insertion operations. Before 8B it trusted admitted Home IDs.
3. Run `removeSeniors` to set exit dates and `updateSeniors` to apply edit fields. Removal already compared the database count with the submitted count; previously it matched by ID alone. The edit helper previously discarded each affected count and returned the input length.
4. Run `refreshSeniorSearch` once per validated existing Senior. It rebuilds current/outdated content with `createSearchStringFor` and `createOutdatedSearchStringFor`. It previously returned silently if the Senior was absent. For this bulk caller it now requires the Senior and still creates a missing search row when appropriate. The default behavior for ordinary Senior routes is preserved.
5. Reconcile active occasions through `addRecipients` and `markAbsentRecipients`, which select eligible Seniors via `getSeniors` and generate rows where needed via `generateRecipients`. Apply relevant snapshot changes via `syncRecipientsAfterSeniorUpdate`, which already rejected a missing Senior. These helpers use the same transaction; recipient rules and their inputs are preserved.
6. Clear the previous latest flag and create the completed `HomeUpdateDate` marker. The response is sent after the managed transaction commits.

## Existence, Home ownership and concurrency

`removed[].id` and `updated[].seniorId` are the two existing-row references. Admitted rows are inserts. The validator deduplicates references across sections for the ownership query. A removal without an ID or a repeated ID within one operation section is rejected so the response cannot overstate the number of rows affected.

PostgreSQL's default read-committed isolation can allow a concurrent delete or Home reassignment after a plain read. The validation query therefore filters on both IDs and selected Home and locks the matching rows using `FOR UPDATE` in ascending ID order until commit or rollback. The mutation predicates also include Home ID, and their affected counts are checked independently. This protects existence and Home ownership through save; it does not introduce field-version checks or serialize unrelated Homes.

Each admitted row must have the same Home ID as the request. A conflicting ID results in rejection before writes. Ordinary single-Senior creation does not use this policy.

## Counts, rollback and error contract

An edit must affect exactly one row, and a removal must affect exactly the requested number. The success response retains `createdCount`, `removedCount`, and `updatedCount`, derived from successful writes. Unexpected failures roll back through the managed transaction, including earlier data and search writes. Reconciliation and the Home marker share that transaction; the marker is written only after required work completes.

Stale, foreign-Home, malformed-reference and affected-count conflicts use the existing HTTP 409 `ERRORS.CONFLICT` envelope. RU/EN already translate that code. Angular's existing error path shows the message, clears the busy indicator and leaves the selection available. The request and success-response shapes are unchanged.

## Tests

- The original 8A stale-edit test was preserved verbatim. Before the fix, that test and four new regressions failed in the focused run (18 passed, 5 failed).
- Six new PostgreSQL cases cover a removed row deleted after comparison, foreign-Home edits, foreign-Home removals even when the payload claims the selected Home, conflicting admission, mid-transaction rollback after PostgreSQL rejects a later write, and a valid mixed batch.
- The rollback fixture checks restoration of an earlier edit and rollback of the admission and its search row. The mixed batch checks the three counts, Senior writes, search refresh, recipient creation/absence/snapshot refresh and the completed Home marker.
- A helper unit test verifies that a zero affected-row result is rejected even when the edit was submitted.

## Behavior preserved

Single-Senior create, edit, delete, block/unblock, spouse logic and ordinary Home immutability are outside the bulk change. Route permission, body shape, response properties, recipient rules and transaction boundaries retain their existing behavior. There are zero frontend production changes. Cypress and live browser runs were outside this backend-only validation.

## Validation

| Check | Result |
| --- | --- |
| Original 8A stale-edit test | **Passed**, unchanged |
| Focused Senior integration | **23/23 passed** against dedicated loopback PostgreSQL |
| Full backend integration | **19/19 suites, 205/205 tests passed** against dedicated loopback PostgreSQL |
| Backend unit | **44/44 suites, 398/398 tests passed** |
| Frontend full | **722/722 passed** |
| Frontend Auth | **29/29 passed** |
| Frontend Routing | **33/33 passed** |
| Production TypeScript | **Passed** |
| Production build | **Passed**, 4,993,670 bytes initial, 6,330 bytes below the error budget, 17 existing warnings |
| `git diff --check` | **Passed** for working and staged diffs. The new report also passed a trailing-whitespace check. |

## Remaining Phase 8 P1 findings

The limited/full order list scope, workbook authorization and template packaging, and contact search terms in backend logs remain open.

**PHASE 8B — BULK SENIOR UPDATE INTEGRITY COMPLETE**
