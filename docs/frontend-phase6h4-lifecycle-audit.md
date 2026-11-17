# PHASE 6H4 — LIFECYCLE / SUBCLASS COUPLING AUDIT

## Baseline and scope

The full frontend baseline passed **649/649 before tests were added**. Production files changed: **0**.

The audit covers BaseDetails, AdvancedDetails, and the Home, Senior, Volunteer, Partner, and User subclasses. H2 reconciliation, H3 comparisons, forms, templates, services, schemas, and backend code remain unchanged. The existing `frontend-phase6-todos.md` was not edited.

Three concrete-owner characterization tests were added in [advanced-details.lifecycle.spec.ts](../src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.lifecycle.spec.ts). They expose one lifecycle defect through two paths. Test expansion stopped after that discovery; no production fix or extraction was attempted.

## Initialization order map

1. BaseDetails instance fields initialize: form, signals, required input signal, outputs, injected dependencies, and save-intent state. Its constructor registers owner destruction.
2. AdvancedDetails fields initialize, including owner services, domain helpers, authentication signal, and display state.
3. Concrete fields initialize. Senior's selected-home subject exists before its spouse-picklist observable is composed. Concrete service overrides are ready before Angular initialization.
4. Angular provides dialog data and invokes the concrete `ngOnInit()`.
5. Every concrete `ngOnInit()` calls `AdvancedDetails.ngOnInit()` first.
6. AdvancedDetails calls `BaseDetails.ngOnInit()` first.
7. BaseDetails sets address parameters and kind, creates configured controls, and records `controlsNames`.
8. If an owner exists, BaseDetails invokes the virtual `setInitialValues('view')` for view/edit dialogs, or `'create'` for an existing object used in creation. Without an owner, it skips owner initialization. The country-specific enablement branch serves ToponymDetails.
9. A concrete `setInitialValues()` override first delegates to AdvancedDetails, which delegates to BaseDetails. Scalar fields initialize first, contact controls second, concrete relation/postal/subscription fields last.
10. BaseDetails returns. AdvancedDetails establishes owner kind, clones persisted history or calls the empty-history hook, and initializes restoring, deleting, changing, and outdating state through concrete hooks.
11. AdvancedDetails attaches form validators and the `valueChanges -> debounceTime(0) -> onChangeValidation()` subscription, loads role names, and initializes common history flags.
12. AdvancedDetails returns. Concrete initialization assigns `mainProps`, picklists where applicable, and owner-specific capabilities/history/status state.
13. Child views initialize and the dynamic AddressFilter query becomes available. Its initial loading completion can release the spinner. User edit/save actions occur after this view exists.

The early virtual initialization is ordering-sensitive but currently coherent: the concrete setters use already-created controls, persisted owner data, and initialized instance dependencies. They do not consume `mainProps` or pending mutation blocks at that point. No current override needs to execute code before its `super` call.

## Subclass override contract

| Hook or override | Owners | Contract and reason |
|---|---|---|
| `ngOnInit` | All five | Must delegate first. Owner code afterward needs the shared form, history, and pending-state shapes. |
| `setInitialValues` | Home, Senior, Volunteer, Partner | Must delegate first. Shared scalar/contact initialization precedes owner relations and postal/subscription values. User inherits this behavior. |
| `onEditClick` | Home, Partner, Volunteer | Must delegate first, then enable relation controls. Super can reconstruct controls; enabling before it could affect obsolete controls. |
| `changeToViewMode` | Home, Partner, Volunteer | Must delegate first, then disable owner relation controls and recalculate Save state. |
| `setEmptyOutdatedDataDraft`, `setRestoringDataDraft`, `setDeletingDataDraft`, `setChangingData`, `setOutdatingData` | All five | Independent replacements for no-op hooks. They assign fresh owner-specific objects and do not require a super call. |
| Official-name/coordination restoration | Home | Independent UI policy; requires initialized forms and history. Mutates inherited pending state and visible history. |
| Coordination restoration | Partner | Independent UI policy with the same initialization preconditions. |
| Institute restoration | Volunteer | Independent; creates an owner-specific form group and updates pending restoration/history. |
| Username restoration | User | Independent; updates the username control and selected history. |
| Person-name and common address/contact restoration | Inherited where applicable | Shared active handlers, not replacement hooks. |
| `additionalValidationHooks` | Home, Partner, Volunteer | Independent overrides explicitly compose common comparisons with owner relation checks. Calling the parent as well would duplicate checks. |
| `additionalValidationHooks` | Senior | Independent spouse comparison; contacts/common-address policy does not apply. |
| History flag setters | Applicable owner subclasses | Independent, mutating hooks; their matching history shape must already exist. |
| `setHomeOpen` / `setPartnerActive` | Home / Partner | Independent status projections; refreshed owner must be assigned first. |
| `correctRestrictedController` | Home | Independent replacement policy using the current form, including closure and coordinations. |
| `checkUserName` | User | Independent asynchronous preflight that resumes the shared save flow under its current-intent guard. |

No concrete owner overrides `onViewClick`; discard uses the BaseDetails workflow with virtual initialization/view-transition dispatch. None of these classes supplies `ngOnChanges` reinitialization. Replacing input data alone is not an automatic owner-refresh API.

## Save-and-stay refresh map

The authoritative update-response path is [AdvancedDetails.saveUpdatedOwner](../src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts). After a validated HTTP response:

1. Reject an obsolete/destroyed save continuation.
2. Branch for save-and-exit. It releases loading, invalidates the intent, emits `close`, and returns without applying a view refresh.
3. For save-and-stay, correct restriction controls against the submitted form. Home supplies closure-specific policy.
4. Replace `data().object` with the persisted response.
5. Recompute default geographic IDs from the response.
6. Clone the new persisted history.
7. Invoke username/name/official-name/coordination history flags and Home/Partner status hooks.
8. Refresh common contact/address history flags.
9. Synchronize AddressFilter to view mode with the persisted geographic defaults.
10. Release the current spinner before the upcoming view transition invalidates its intent.
11. Invoke virtual `changeToViewMode(null)`: AdvancedDetails resets all four mutation blocks; BaseDetails invalidates the intent, clears dirty/deletion signals, enters view mode, disables configured controls, recalculates Save availability, and synchronizes the child again. AdvancedDetails reclones persisted history; concrete wrappers disable relation controls.
12. Invoke virtual `setInitialValues('view')`: shared scalar/contact display values and owner-specific relations/postal/subscription state are populated from the new owner. Volunteer also refreshes its institute/subscription/cooperation history flags here.
13. Form emissions scheduled by those writes reach the already-active debounced validation subscription.

The request finalizer is intent-guarded. The explicit spinner release before view transition matters because that transition invalidates the save intent.

### Response refresh contract

There is one authoritative HTTP-success location, but no separately named persisted-owner application method. Refresh state is distributed across that callback, Base/Advanced view transitions, concrete setters, and flag hooks. The final debounced validation step makes this an **ordering-sensitive distributed sequence**, with a confirmed clean-view defect below.

A named refresh method alone would not fix the defect: discard uses a different path and reproduces it too. No such method was created.

## Initial load versus refresh

| Initial load | Save-and-stay / discard |
|---|---|
| Creates controls and capabilities. | Reuses existing controls and callbacks. |
| Writes initial view values before the parent form subscription is attached. | Writes view values while that subscription is active. |
| Initializes pending blocks once and then assigns `mainProps`. | Resets existing pending blocks and keeps `mainProps`. |
| AddressFilter initializes through its own child lifecycle/default inputs. | Parent explicitly synchronizes the existing child. |
| Concrete `ngOnInit` establishes status and initial flags. | Shared success logic invokes selected flag/status hooks; concrete setters supply remaining policy. |

Their differences include necessary creation/view and child-availability distinctions. They should not be unified indiscriminately. The active-subscription difference is the confirmed problem; it should be handled as owner lifecycle policy rather than by changing display normalization.

## State rehydration risks by owner

| Owner | Evidence and classification |
|---|---|
| Home | New test confirms refreshed geographic defaults, parent selection, real child form, postal fields, formatted postal label, relation label, history membership/flags, pending blocks, disabled controls, and released loading. Only the clean-view dirty flag fails. Closure/restriction policy remains subclass-specific and was code-reviewed, not exhaustively newly tested. |
| Partner | Existing tests protect removal of coordinations and clearing history/contact state. New discard test confirms relation reconstruction, edit/view enablement, history return, pending reset, and clean subsequent edit. Dirty state is incorrectly true while in view after discard. |
| Volunteer | New positive refresh test confirms two institutes, disabled view groups, current-user subscription, institute/history flags, pending reset, and a clean subsequent edit. Existing tests cover empty lists, subscription removal/other subscribers, and empty history flags. The new test does not claim that every view-mode dirty-state variant is protected. |
| Senior | Existing tests cover persisted null-spouse reset and subsequent request behavior, plus Home edit restrictions. The setter refreshes Home/spouse labels from the current owner. Home selection is deliberately read-only during editing; no unsupported Home reassignment scenario was invented. |
| User | H1 tests cover username availability, correction/retry, persistence, and refreshed username/view state. Shared name/username flags read refreshed history. No duplicate username-preflight test was added. |

No stale persisted data, leaked mutation request, or incorrect Save enablement was observed in the new scenarios. The confirmed stale state is `changesSignal` in view mode.

## AddressFilter lifecycle

BaseDetails owns the child query and mode API. Initial scalar/contact/relation initialization does not require the child query. Edit, discard, and save response transitions do require an initialized child view.

Senior's `updateAddressFilter(home)` is invoked by the Home autocomplete selection event; it enables spouse selection, changes the spouse-picklist source, and synchronizes geography. Generic save refresh instead uses persisted response defaults directly.

The new Home test reads the real child's public form and readonly parameter after save. Both geographic synchronization calls leave the persisted selection intact in that scenario. No private AddressFilter methods were asserted and no hierarchy internals were changed. Existing dialog lifetime tests protect owner destruction while a save/check/confirmation is outstanding.

## Pending mutation initialization

`resetPendingEditState()` calls the concrete restoring, deleting, changing, and outdating initialization hooks. Those hooks assign fresh objects with the owner's exact null/array/object shape. They run after initial form population, before owner interaction, and again before the shared view transition.

This is a recognizable hook model. Its weaker point is the lack of an abstract compile-time requirement: fields use definite assignment and default hooks do nothing. Existing owners implement the contract and tests protect resets. No executable missing-hook defect was found, and the hooks were not redesigned.

Restoration/deletion actions deliberately mutate inherited pending/history objects during editing. Their safety relies on the shared reset boundary; existing rollback tests and the new Partner discard test confirm that boundary.

## mainProps lifecycle

Each concrete `ngOnInit` assigns `mainProps` after shared initialization. Its active consumer is the final scalar merge in `checkAllChanges()`.

Initial setters, pending-state hooks, and dirty validation do not consume it. Current normal user save paths run after initialization; role/address loading callbacks do not invoke planning. No realistic supported pre-assignment save path was found. A test forcing a save halfway through `ngOnInit` would test an artificial invocation rather than a current application contract.

The declaration still relies on lifecycle convention rather than a constructor/API guarantee. Record that constraint for future owner additions; do not broaden this phase into typed inheritance redesign.

## Service selection finding

The declared inherited `service` field has no executable assignment/read. Active duplicate checking, creation, and updates use `getService()`, which selects the concrete injected service from owner kind. The field is **dead legacy state**. It was reported and left unchanged.

## Subclass duplication and hook quality

- Home/Partner coordination reconstruction is similar, but the target IDs and labels differ; Volunteer has structured institute groups and numeric validators. Preserve those explicit policies.
- The three edit/view wrappers intentionally enable or disable owner relation controls after shared transitions. Their small size does not justify a callback-based lifecycle helper.
- Boolean capability/status/history hooks have narrow purposes. Flag setters require initialized history; status setters require the current persisted owner. Their mutation-oriented names are recognizable, though their valid calling phase is a convention.
- `setInitialValues` mixes shared presentation initialization with owner values; Volunteer also refreshes history flags. Its early-call preconditions are now documented and behavior is characterized.
- The mutation initialization hooks would be clearer as explicitly named reset operations in a future contract redesign, but current semantics do not justify renaming or changing all subclasses.
- `additionalValidationHooks` returns a boolean and keeps owner dirty policy explicit. It should receive an appropriate create/edit lifecycle context; running it on view presentation data is the confirmed error.

No override currently needs a before-super action. The important obligations are super-first delegation and after-super relation enable/disable work.

## Existing test coverage

Existing protection was reused for Partner rollback, failed-save retry, obsolete confirmation/save-intent handling, save-and-exit persistence ordering, Home history restoration/recovery, owner empty/null resets, Senior read-only Home behavior, User preflight/refresh, Volunteer category/save validity, H2 reconciliation, and H3 dirty comparison contracts.

The gaps selected here were relation discard enablement, aggregate Home persisted-response synchronization, and positive Volunteer relation/history rehydration. No giant fake subclass, private call-order spy, or literal super-call assertion was added.

## Characterization tests added

1. Partner relation edit/discard: confirms editable relation controls, restoration of persisted relation values, disabled view controls, shared mutation reset, and a clean next edit. Fails only at the view-mode dirty flag.
2. Home save-and-stay: confirms authoritative response rehydration across geography, postal fields, relation labels, history, pending state, mode, Save, and loading. Fails only at the view-mode dirty flag.
3. Volunteer save-and-stay: confirms institute/subscription/history rehydration, view/edit control states, pending reset, and a clean next edit. Passes.

## Bugs exposed

### H4-1: debounced validation marks a completed view transition dirty again

**Two reproductions:** Partner discard and Home save-and-stay. The expected clean view has `changesSignal === false`; after `tick()` it is `true`.

The source chain is:

1. AdvancedDetails keeps its debounced form subscription active across modes (`ngOnInit`, lines 380–382).
2. View initialization intentionally renders empty contact slots as `\u00A0` (`setInitialValues`, line 698).
3. View transition explicitly clears dirty state, but form enable/disable/value writes also schedule validation.
4. BaseDetails `onChangeValidation()` checks the dialog operation (`view-edit`), without restricting dirty comparison to edit mode.
5. The contact comparator correctly preserves the existing truthy-value rule, so `\u00A0` is a present contact value when compared with an empty persisted contact list.
6. The delayed comparison overwrites the clean-state reset and propagates that flag to the dialog's mirrored state.

**Observed limits:** Save remains disabled, view mode is correct, pending mutation blocks are reset, persisted data and AddressFilter are correct, and a subsequent Partner edit becomes clean again. The tests demonstrate inconsistent lifecycle state; they do not demonstrate data corruption or unauthorized persistence.

This is not a request to change H3 normalization or H2 reconciliation. The existing comparisons are being applied to view presentation values at the wrong lifecycle boundary. Both failing expectations remain unchanged and enabled. No production correction was made.

## Update-plan assembly reassessment

Moving `checkAllChanges()` wholesale into OwnerChangesPlannerService is not the justified next step. It would still require owner kind, draft/current data, pending selections, actor state, scalar-field policy, and ownership checks around awaited planner decisions. Much of the same orchestration would move behind a larger service API rather than disappearing.

The existing domain diff methods already own their planning rules. The new evidence points to validation across view transitions, not update-plan assembly. Keep that candidate deferred.

## Architecture decision: OPTION B

Most inheritance hooks are healthy owner-policy boundaries. One small lifecycle boundary needs correction: active owner dirty validation must not reinterpret the view representation after a completed discard/refresh.

### Recommended next step — one bounded Phase 6H5 batch

Treat **H4-1 as a standalone lifecycle bug fix**, without combining it with structural extraction.

- **Current fragile responsibility:** the long-lived owner form subscription applies shared dirty validation after both edit writes and view reinitialization writes.
- **Proposed boundary:** make create/edit validation versus settled-view behavior explicit in AdvancedDetails' owner validation lifecycle. Preserve create/edit validation, deletion-only edits, and all current save-intent guards.
- **Expected production file:** AdvancedDetails only. Keep BaseDetails unchanged because it also serves ToponymDetails. Keep subclasses, H2, H3, planner APIs, and templates unchanged.
- **Test files:** the new lifecycle spec, with the two red expectations preserved; add only a focused lifecycle case if needed to protect create/edit validation while correcting view behavior.
- **Tests protecting it:** the three new characterizations, H1 pipelines, H2/H3 pure contracts, existing rollback/reset/save-intent/lifetime tests, and complete frontend checks.
- **Why it reduces coupling:** settled view state would no longer depend on whether a rendering write arrives before or after the reset through the debounced stream.
- **Risk:** low-to-medium because validation must continue in creation/editing and async ownership must remain intact.

Do not bundle a persisted-owner application method, inheritance replacement, or update-plan extraction into that batch. The current red characterizations must be resolved before further structural refactoring.

## Validation

| Check | Result |
|---|---|
| Full baseline before additions | 649 passed, 0 failed |
| New focused characterizations | 1 passed, 2 failed |
| Affected owner/shared/H2/H3 group | 106 passed, 2 failed |
| Full frontend | 650 passed, 2 failed; all 649 existing tests pass |
| Auth | 29/29 passed |
| Routing | 33/33 passed |
| Cypress permissions | 8/8 passed |
| Production TypeScript | Passed |
| git diff --check | Passed |

All reported failures are the two new H4-1 assertions. Existing tests and production code are unchanged.

PHASE 6H4 — LIFECYCLE / SUBCLASS COUPLING AUDIT COMPLETE

Production files changed: 0
