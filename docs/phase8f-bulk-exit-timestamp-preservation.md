# PHASE 8F — BULK EXIT TIMESTAMP PRESERVATION

November 22, 2026.

## Original defect and root cause

Choosing the stored exit value for a returning Senior could replace the existing timestamp with midnight. The first precision loss on the actual **keep existing** path was save DTO validation. The bulk accepted-changes schema previously applied a date-only projection to `dateOfExit`.

## Exact value flow

| Boundary | Before the fix | After the fix |
| --- | --- | --- |
| PostgreSQL and Sequelize read | Timestamp read as a JavaScript Date representing `2026-11-21T21:00:00.000Z` | Same |
| Bulk comparison `changeRows[].oldValue` | The existing Date serializes to `2026-11-21T21:00:00.000Z` | Same |
| Angular comparison parser and radio form | `changeRows.oldValue` passes through and the old-value radio binds the full string | Same |
| Accepted object and HTTP serialization | `changes.dateOfExit` is `2026-11-21T21:00:00.000Z` | Same |
| Server save validator | `2026-11-21` | `2026-11-21T21:00:00.000Z` |
| Controller and Sequelize update | Forward the validated date-only string | Forward the full validated timestamp string |
| Persisted PostgreSQL instant, normalized with `toISOString()` | `2026-11-21T00:00:00.000Z` | `2026-11-21T21:00:00.000Z` |
| Calendar day in the regression zone, Europe/Moscow | Changed from November 22 to November 21 | November 22 before and after |

The comparison's summary fields `oldSenior.dateOfExit` and `changes.dateOfExit` have their own calendar-date projections. In the returning-Senior flow the selectable and serialized value comes from `changeRows.oldValue`. The comparison shape, value binding and serialization retain their existing behavior.

## Contract and compatibility

The shared bulk accepted-changes field accepts ISO timestamps with a UTC designator or explicit offset, valid ISO calendar dates, and null. It preserves timestamp and date-only strings verbatim. Existing empty-string-to-null normalization and omission remain. Invalid dates and timestamp suffixes are rejected instead of defaulting to their leading date fragment.

`AcceptedChanges.dateOfExit` retains its optional string/null output type for Angular. Consumers are `SeniorsBulkUpdateComponent` and `SeniorService.updateList`. `SeniorChangesTableComponent` supplies the selected value directly. The backend bulk route consumes the compiled `bulkUpdateSchema` and `updateSeniors` writes its validated fields unchanged to the existing Sequelize DATE column. There are zero frontend production changes and zero controller, model or database-schema changes.

The fix affects only bulk accepted `dateOfExit`. Birth date, consent date, name, gender, notes and unrelated fields retain their validators. Calendar-date entry retains the accepted input shape and existing backend interpretation. An offset-bearing timestamp expresses its existing instant. This phase adds no general date/time policy or historical migration.

## Files changed

- `shared/schemas/senior.schema.ts` and the regenerated `shared/dist/schemas/senior.schema.js` and `senior.schema.d.ts`.
- `server/tests/unit/senior-bulk-exit-timestamp.unit.test.js` adds two tests for preservation, null, omission, legacy empty input, date-only compatibility and malformed input.
- `server/tests/int/seniors-api.int.test.js` adds one real comparison-to-save PostgreSQL test for precise value, representative calendar-day preservation, explicit clearing and the latest Home marker.
- This report. Pre-existing Phase 8 work is preserved.

The shared TypeScript compiler emitted to an isolated output directory. The backend JavaScript matches the fresh output byte-for-byte. Both updated exit-field declarations match the fresh compiler output. The existing order of an unrelated sort enum's declaration members was preserved.

## 8B integrity and test sequence

The unit and PostgreSQL regressions reproduced truncation before the fix. The PostgreSQL test exercises the real create, comparison, DTO, save and reload paths. It selects the comparison's old value, asserts the exact persisted instant and the offset-zone day, then selects the null value and verifies clearing. The same suite retains stale and foreign-Home rejection, affected counts, rollback, reconciliation, an ordinary mixed batch and Home marker ordering. The request envelope, authorization, count names, and error contract remain intact.

## Validation

| Check | Result |
| --- | --- |
| Focused schema unit | **2/2 passed** |
| Focused Senior integration | **24/24 passed** on dedicated loopback PostgreSQL |
| Full backend integration | **217/217 passed** across 19 suites |
| Full backend unit | **400/400 passed** across 45 suites |
| Frontend full | **724/724 passed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| SeniorsBulkUpdate and SeniorChangesTable | **4/4 passed** across three specs |
| Production and shared TypeScript | **Passed** |
| Production build | **Passed** with 4,993,764 initial bytes, 6,236 bytes of headroom and 17 existing warnings |
| `git diff --check` | **Passed** for working and staged diffs, plus whitespace checks for the new test and report |

## Remaining production sign-off items

The release checklist still calls for the existing-schema upgrade rehearsal, real-origin session and SPA deep-link checks, protected download and bounded staging/manual acceptance, and runtime setup documentation. The existing guarded live Cypress prerequisites remain a separate staging concern.

**PHASE 8F — BULK EXIT TIMESTAMP PRESERVATION COMPLETE**
