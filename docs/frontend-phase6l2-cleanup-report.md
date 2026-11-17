# PHASE 6L2 — FINAL SHARED-CODE HYGIENE CLEANUP

## Baseline

The verified Phase 6L1 baseline was 670 frontend tests, 29 Auth tests, 33 Routing tests, and 8 Cypress permission tests, all passing. Production TypeScript and `git diff --check` passed. No existing tracked modifications were present when cleanup began; the existing untracked `docs/` content was preserved.

Authority: `frontend-phase6l1-shared-hygiene-audit.md` and `frontend-phase6l1-hygiene-evidence.md`. Usage and resource-reference evidence was rechecked before each deletion. No architecture work was performed.

## Files changed

28 existing production files modified:

```text
src/app/pages/home-details/home-details.component.ts
src/app/pages/partner-details/partner-details.component.ts
src/app/pages/senior-details/senior-details.component.ts
src/app/pages/toponym-details/toponym-details.component.ts
src/app/pages/user-details/user-details.component.ts
src/app/pages/volunteer-details/volunteer-details.component.ts
src/app/services/owner-restoration-guard.service.ts
src/app/shared/address-filter/address-filter.component.css
src/app/shared/address-filter/address-filter.component.ts
src/app/shared/base-list/base-list.component.css
src/app/shared/base-list/base-list.component.html
src/app/shared/base-list/base-list.component.ts
src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts
src/app/shared/dialogs/details-dialogs/advanced-details/owner-details.component.css
src/app/shared/dialogs/details-dialogs/advanced-details/owner-details.component.html
src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts
src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.css
src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts
src/app/shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component.ts
src/app/shared/table-filter/table-filter.component.html
src/app/shared/table-filter/table-filter.component.ts
src/app/shared/table-settings/table-settings.component.ts
src/app/shared/table/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts
src/app/shared/table/table.component.ts
src/app/shared/upload-file/upload-file.component.ts
src/app/utils/owner-ctrls.ts
src/app/utils/owner-draft.builder.ts
src/app/utils/owner-restoration-reconcile.util.ts
```

This report is the only new Phase 6L2 document. Historical audit documents were not edited.

## Files deleted / disconnected resources removed

10 disconnected production resources deleted: the `.component.html` and `.component.css` files under each of `pages/home-details`, `pages/senior-details`, `pages/volunteer-details`, `pages/partner-details`, and `pages/user-details`, with the corresponding owner name as the filename prefix.

All five components reference the shared owner template/style. The deleted local resources had no metadata, import, dynamic-loader, test, or build references. Shared resources and metadata-referenced BaseDetails/AdvancedDetails scaffold resources remain.

## Dead declarations removed

- AdvancedDetails and Table: unused inherited `protected service` declarations. Both active `getService()` paths remain unchanged.
- UploadFile: unused `file` field and `resetRequested` output.
- Owner draft builder: dead `BUILD_RESTRICTED` map and its private `BuildRestrictedFn` / `BuildRestrictedMap` aliases.

## Dead helpers / overrides removed

All nine audited helper names were rechecked against executable source, subclasses, templates, and tests. Removed four: `isPartnerContext`, `hasCoordinations`, `getRowSpanForHomes`, and `getRowSpanForPartners`. Final searches under `src/` found no remaining references.

**Retained five base declarations and all five Volunteer overrides:** `hasSubscriptions`, `hasCooperations`, `setHasOutdatedInstitutes`, `setHasOutdatedSubs`, and `setHasOutdatedCoops`. Although uncalled, the Volunteer methods are not behavior-identical to their base implementations: the first two return `true` instead of `false`, and the remaining three write history flags instead of doing nothing. No override meeting the request's identity condition was removed. Their executable syntax is unchanged.

## Dead injections removed

AdvancedDetails `cdr` / `ChangeDetectorRef`, UploadFile `addressService` / `AddressService`, and BaseList `dialog` / `MatDialog`. Active domain services and the other live dialog injections remain.

## Debug / development leftovers removed

Removed the inert controls traversal from `checkIsSaveDisabled`, the unread `outdating` binding from subscription planning, the empty create/save-and-stay `else`, and the unused `of(null)` return from an observer error callback. The awaited planner call, save conditions, notifications, spinner handling, and observer error behavior remain.

## UploadFile cleanup

Removed only the audited unused members, injection/imports, and approved historical persistence/debug comments. File-selection generation, destroy guards, array-buffer ownership, loading/error ownership, input reset, and active result emission are unchanged.

## Restriction / reconciliation cleanup

The live `getRestParams()` implementation and `buildDraft()` call remain. Removed the unread reconciliation `removedTypes` array and its two pushes; all returned restoration/history state remains unchanged. Removed identifiers have no surviving references under `src/`.

## Imports removed

39 bindings: the exact 36 unused bindings in Appendix D plus the three imports orphaned by the approved injection removals. No repository-wide import formatting or active typing redesign was performed.

## Commented code removed / comments updated

Removed the agreed REMOVE entries for old save/reconciliation/comparison alternatives, disabled console diagnostics, filename headers, markup, and style declarations. Corrected the audited input/output, close-result, history-selection, coordination-control, filter-emission, and Toponym-notification comments. Preserved WHY/lifetime invariants.

Comment-only edits were checked for unchanged executable TypeScript syntax. Active template/style content was compared against HEAD with comments and formatting excluded; active content is unchanged. No active selector was removed or rewritten.

## Approved follow-up: conflicting comment classifications

Five disabled blocks had conflicting classifications: the main audit explicitly listed them as removable, but Appendix C labeled them KEEP. Following explicit user approval, only these five blocks were removed:

| Location before approved deletion | Block |
| --- | --- |
| BaseList TS:178 | Old translated `FROM_LABEL` expression |
| BaseList TS:493 | Old `onChangeViewSelection` implementation |
| UploadFile TS:122 | Old row-length validation alternative |
| VolunteerDetails TS:176 | Old institute conditional alternative |
| TableFilter TS:474 | Old form-value subscription alternative |

Automatic approval review initially rejected deleting these blocks because of the conflicting KEEP labels and the exact-manifest constraint. They were retained until the user explicitly approved these five deletions. The approved follow-up removed comments only; the executable TypeScript syntax printed without comments is identical before and after in all four files. No adjacent live code or other assertions/comments were changed.

## Items deliberately kept

Also retained: framework hooks, TableFilter effect initializer calls, the characterized dynamic-host dirty-state mirror, unfinished template-bound handlers, live owner dispatch, active Home service methods, and all completed Phase 6 ownership/lifecycle behavior.

## Deferred items unchanged / final searches

Final searches covered removed identifiers and `console.`, TODO/FIXME/HACK/XXX, `as any`, `as unknown as`, and disabled executable patterns in the audited scope.

- **KEEP:** lifecycle/save-intent/selection ownership comments, framework/form boundary casts, and explanatory sections. No active console calls were found; active logging calls and their contexts are unchanged.
- **DEFER:** contact-vs-institute/coordination duplicate preflight, missing Table filters/navigation handlers, Senior Home/reset/restoration notes, Volunteer institute-category display, owner-template display TODO, mutually exclusive filter UX, and host state-mirror questions. The postal no-street/no-building product TODO remains intact.
- **DEFER:** dynamic form/owner/query typing and `DialogData<T>` correlation; no active cast redesign occurred. PrimeFlex `items-center`, deep selectors, overlay/style concerns, and owner-draft privacy contexts remain unchanged.
- No FIXME/HACK/XXX markers were found in the audited TypeScript scope. The five previously retained disabled implementations were removed only after explicit approval; none was revived.

## Validation

| Check | Result |
| --- | --- |
| Batch 1: production TypeScript / focused specs | Passed / 153 of 153 passed |
| Batch 2: production TypeScript / focused specs | Passed / 172 of 172 passed |
| Batch 3: production TypeScript / focused specs | Passed / 73 of 73 passed |
| Batch 4: production TypeScript / focused specs | Passed / 172 of 172 passed |
| Full frontend | 670 of 670 passed |
| Auth | 29 of 29 passed |
| Routing | 33 of 33 passed |
| Cypress permissions, existing stub setup | 8 of 8 passed; no skipped/pending tests |
| Final production TypeScript | Passed |
| `git diff --check` | Passed |
| Tests added / removed / modified | 0 / 0 / 0 |

After the five explicitly approved comment deletions, the full frontend suite was rerun: 670 of 670 passed. Production TypeScript, executable-syntax integrity checks, and `git diff --check` passed again. Auth, Routing, and Cypress results above are from the preceding validated cleanup state; these five deletions changed no executable syntax.

Validation logs, source snapshots, exact import manifest, comment proof, and final integrity checks are in `C:\Users\Owner\AppData\Local\Temp\phase6l2-cleanup-31de5c37`.

## Net production cleanup

- Existing production files modified: 28
- Production files deleted: 10
- Lines removed: 1,060
- Lines added: 23
- Net reduction: 1,037 lines

Counts come from `git diff --numstat` for tracked production changes; documentation is excluded.

## Behavior preserved

No tests were added, removed, skipped, weakened, or edited. No backend, schema, dependency, configuration, API contract, inheritance, or service architecture changes were made. Active logging, forms, validation, dirty state, requests/payloads, save behavior, restoration/history, async lifetime, filtering/pagination, routing, and permissions are preserved. All 670 existing frontend tests still pass.

PHASE 6L2 — FINAL SHARED-CODE HYGIENE CLEANUP COMPLETE
