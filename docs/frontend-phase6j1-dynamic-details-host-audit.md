# PHASE 6J1 — DYNAMIC DETAILS HOST TYPING AUDIT

## Scope and starting point

Audit and characterization only. The provided green frontend baseline was 663 tests. Before adding coverage, the existing host specs passed 12/12. No production file was edited; completed AdvancedDetails and BaseList work is untouched.

Primary files inspected:

- `src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts`
- `src/app/shared/dialogs/details-dialogs/details-dialog/details-component-registry.ts`
- `src/app/interfaces/dialog-props.ts`
- `src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts`
- The six concrete details components, their existing dialog configurations and directly relevant tests.

## Current executable flow

1. Table constructs a `DialogData<OwnerByKind<K>>` for create/view-edit; ToponymsList constructs `DialogData<Toponym>`. They open `DetailsDialogComponent` through MatDialog.
2. The host injects `MAT_DIALOG_DATA` as `DialogData<T>` and its `MatDialogRef`. It selects `componentType` and permissions by registry lookup once, initializes a writable `dataSignal` with the injected object, and chooses the title from the original operation.
3. A child injector supplies that same original dialog-data object and dialog reference, with the host injector as parent.
4. In `ngAfterViewInit`, the host casts the selected class through `unknown` to `Type<BaseDetailsComponent<T>>` and calls `container.createComponent(component, { injector: customInjector })`.
5. The inferred `ComponentRef<BaseDetailsComponent<T>>` is local. Its `instance` is retained in a private field. The host then executes `(this.instance as any).data = this.dataSignal` before child initialization reads its data.
6. Five effects, created in the host's injection context, mirror child signals and handle close requests. Toolbar methods forward directly to the child's four action methods.
7. The dynamic child belongs to the host's `ViewContainerRef`. Host destruction destroys the real child. Existing lifetime tests also protect cancellation of pending checks, confirmations and submitted updates.

No `setInput()`, explicit output subscription, stored `ComponentRef<any>`, `ViewContainerRef.clear()` or manual child-destruction path exists here.

## Component selection map

| Kind | Concrete component | Model family |
| --- | --- | --- |
| `toponym` | `ToponymDetailsComponent` | `Toponym`; country/region/district/locality is carried separately in `toponymType` |
| `user` | `UserDetailsComponent` | `User` |
| `partner` | `PartnerDetailsComponent` | `Partner` |
| `volunteer` | `VolunteerDetailsComponent` | `Volunteer` |
| `home` | `HomeDetailsComponent` | `Home` |
| `senior` | `SeniorDetailsComponent` | `Senior` |

The literal registry preserves all six concrete class types. `DetailsComponentType` is its key union, and the permissions registry is checked against those keys with `satisfies`. Selection is exhaustive for that declared union; there is no fallback branch.

An unchecked runtime value can still index the registry to `undefined`; there is no custom unsupported-kind policy. Normal call sites use typed, internal configurations. An invalid injected/cast payload is not validated at the DI boundary. No test was added to lock down Angular's error text for an unsupported key.

More subtly, a supported key can be paired with the wrong model: `DialogData<T>.componentType` is the full key union, independent of `T`. For example, a `DialogData<Toponym>` can legally specify `componentType: 'home'`. The double cast asserts that the chosen component accepts arbitrary host `T`, concealing that missing correlation. The current tests do not manufacture runtime behavior for such unsupported combinations.

## Required host contract

All six children inherit BaseDetails, directly for Toponym and through AdvancedDetails for the five owners. The host genuinely uses only:

| Member | Host use |
| --- | --- |
| `data` | Currently replaced with the host's signal; logically the required composite Angular input |
| `showSpinner()` | Mirrors loading state |
| `changesSignal()` | Mirrors dirty state, including the currently retained legacy host field |
| `isEditModeSignal()` | Controls toolbar mode |
| `IsSaveDisabledSignal()` | Controls save availability |
| `closeDialogDataSignal()` | `null` means no close; otherwise closes with `{ refresh: !!value }` |
| `onSaveClick('justSave' \| 'saveAndExit')` | Save action forwarding |
| `onEditClick()`, `onViewClick()`, `onCancelClick()` | Toolbar forwarding |

The host does not need forms, address arrays, planner services, history drafts, owner-specific restoration methods, Home coordination rules, Volunteer institute/subscription rules or Senior spouse handling. Those should not appear in a common host contract.

There is no separate `mode` input, save/update callback or saved output in this path. Operation is inside `DialogData`; successful save-and-exit reaches the host through the close signal. Save-and-stay refreshes are child responsibilities.

## Input application and actual semantics

The only direct child-property assignment is `data`. It replaces an actual `input.required<DialogData<T>>()` inherited from BaseDetails with a normal writable signal. This bypasses the Angular signal-input node and normal input update bookkeeping; it is not assignment to an intentionally ordinary non-input field.

The entire dialog configuration travels together:

- `object`: the existing entity or `null`.
- `operation` and `controlsDisable`: initialization mode and initial control state.
- `controls`, validators and `checkingName`: form configuration.
- `addressFilterParams`, `defaultAddressParams`, `addressFilterControls`: geography configuration.
- `componentType` and optional `toponymType`: owner/detail context.
- Titles and optional extra title: dialog presentation; the host also reads them directly.

These are values inside the replaced signal, not separate Angular `setInput()` calls. No other owner-specific instance field is patched by the host.

The replacement currently has an observable result: initial data is available before BaseDetails builds the form, and later `dataSignal.set(...)` makes the new configuration and `object` readable through the child. The new Toponym characterization protects both results without checking signal identity or assignment counts.

This does **not** imply automatic form reconstruction, title recomputation, new component selection or replacement of injected `MAT_DIALOG_DATA` after `dataSignal` changes. Those are separate initialization-time values. No production caller updating `dataSignal` was found outside its host initialization; replacement behavior is nevertheless now characterized.

## Output/event wiring and cleanup

BaseDetails declares `emittedIsEditMode`, `emittedChanges`, `emittedIsSaveDisabled`, `emittedCloseDialogData` and `emittedShowSpinner` Angular outputs. The host does not subscribe to them. It reads the corresponding state signals in five effects instead.

Those effects are owned by the host's injection context and cleaned up with the host. The container owns the child view; the existing real-child destruction test confirms teardown with the host. There are no child-output subscriptions requiring a new cleanup mechanism.

Do not conflate these lifetimes: destroying a child independently would not itself destroy host-owned effects. Independent replacement/removal is not the current workflow, and this audit does not introduce it.

Existing tests already protect save/close propagation, mirrored signals and action forwarding. They also protect real-child destruction and pending async ownership, so those scenarios were not duplicated.

## Unsafe typing inventory

| Location | Finding | Classification |
| --- | --- | --- |
| Host `ngAfterViewInit` | `as unknown as Type<BaseDetailsComponent<T>>` | Avoidable for common host operations: the generic base class exposes far more than the host needs and asserts an unproved kind/model match |
| Host input assignment | `(this.instance as any).data = this.dataSignal` | Avoidable input/lifecycle bypass; replaces a declared signal input |
| Host `inject<DialogData<T>>(MAT_DIALOG_DATA)` | Generic annotation on externally supplied DI value | Necessary framework boundary; does not perform runtime validation or establish kind/model correlation |
| Registry | `as const` | Safe literal preservation, not an unsafe dynamic-component cast |
| Dialog configuration interfaces | Two `AbstractControl<any, any>` callback signatures | Existing untyped-form boundary; not a reason to widen the dynamic child or start a typed-form overhaul |
| Existing fake-host spec | `any` in fixture/input/ref types, artificial `spec` registry entries and cleanup | Test-only legacy scaffolding; not a production-supported kind; left unchanged |

There is no production `Type<any>`, `ComponentRef<any>` or additional instance cast in the inspected host path. Permission `mode: 'any'` values are domain strings, not TypeScript `any`. The new spec adds no broad `any` or registry mutation.

## Angular input API assessment

The installed Angular core is **19.2.3**, checked locally. Its `ComponentRef.setInput(name: string, value: unknown)` implementation supports declared inputs, updates the signal-input node, skips the same previous value and marks the child view dirty. Its API documentation also specifies `OnChanges` handling for components that implement that hook.

`data` is a declared inherited signal input on every child, so `setInput('data', value)` is appropriate. None of the inspected concrete/base/advanced details classes currently implements `ngOnChanges`.

A later fix must remove the signal-replacement assignment before using this API. It should set the initial **DialogData value**, not pass the writable signal itself as the input value. It must preserve initial input availability before the child's first lifecycle check and preserve later data replacements through a host-owned reactive forwarding path.

This is not a syntax-only swap: input-signal identity and Angular notification scheduling change, and a one-time `setInput` would lose current later-replacement behavior. The new tests protect the observable boundary after change detection, not immediate function identity or an unimplemented form-refresh policy.

## Type-level recommendation — C

Use **Angular `setInput()` plus a narrow typed common signal/action contract**. This is option C adapted to the actual signal-based bridge, rather than introducing output subscriptions that the host does not currently use.

Keep the existing literal registry and dynamic rendering. Inside the host, define a small structural child type containing the five readable signals and four toolbar actions. Type the selected component and retained instance against that contract, removing the broad generic BaseDetails assertion. Apply data through `ComponentRef.setInput`, preserving initialization and reactive replacement. Keep the current five host-owned mirror effects and close-result semantics.

The registry already provides a narrow class union. A new registry service or generic dispatch framework would add no useful boundary. Different input model types mean that treating all children as `BaseDetailsComponent<T>` for arbitrary `T` is misleading; the common behavioral surface need not include that generic input member.

This first batch would not make `DialogData<T>` a discriminated kind/model union. That remains a compile-time limitation of the caller configuration, not something the common host interface should pretend to solve. The framework's string/unknown `setInput` API also does not itself statically check input names and values; typed caller data and all-six-child characterizations remain important.

## Recommended Phase 6J2

- **Expected production file:** `details-dialog.component.ts`, with a local narrow child contract. No child, inheritance or registry redesign is needed for this first batch.
- **Expected test files:** the new host-contract spec and existing host/lifetime specs for validation. Preserve their behavior assertions.
- **Behavior preserved:** all six dispatches; data and injector context before initialization; current data replacement readability; form mode; spinner/dirty/edit/save mirroring; toolbar forwarding; truthy/false close mapping; container/effect teardown.
- **Risk level:** low to medium, concentrated in input initialization order and later-update scheduling.

Explicitly reject a large conditional generic framework, registry service, DI tokens per child, state manager, wrapper components and an interface exposing every subclass field. Do not change BaseDetails/AdvancedDetails inheritance or move owner-specific policies. Do not switch to the unused emitted outputs as part of this typing fix.

## Characterization tests added

`details-dialog.host-contract.spec.ts` adds seven tests:

1–6. Independently specify each real expected class, create it through the actual host and templates, and verify one selected child, initialized context/form value/control mode, full data, and inherited dialog injector values. Production registries are not mutated. Existing domain dialog configurations and lookup fixtures are reused.

7. Initialize an existing real Toponym in view mode, verify its object/name/disabled form, then replace host data and verify the child reads the replacement.

These tests would catch incorrect dispatch, missed or late input application, loss of later data forwarding, or injector-context changes during the proposed boundary fix. They do not test private casts or duplicate the existing event/lifetime tests. No new runtime defect was exposed.

## Validation

| Run | Existing tests | New tests | Passed | Failed |
| --- | ---: | ---: | ---: | ---: |
| Existing host/lifetime baseline | 12 | 0 | 12 | 0 |
| New real-child characterizations | 0 | 7 | 7 | 0 |
| Combined host/lifetime | 12 | 7 | 19 | 0 |
| Full frontend | 663 | 7 | 670 | 0 |

All 663 previous frontend tests remain green. Auth: **29/29 passed**. Routing: **33/33 passed**. Cypress permissions: **8/8 passed**, using the existing `USE_STUBS=1` permissions setup. Production TypeScript (`tsc -p tsconfig.app.json --noEmit`): **passed**. `git diff --check` and checks of both new files report no whitespace errors.

Frontend command: `npm test -- --watch=false --browsers=ChromeHeadless`; focused host run uses `--include=src/app/shared/dialogs/details-dialogs/details-dialog/*.spec.ts`. Logs: `C:\Users\Owner\AppData\Local\Temp\details-host-6j1-ee290c39`.

Files added: this audit and `src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.host-contract.spec.ts`. Existing tests and pre-existing documentation were not edited. No production architecture, component, template, CSS, backend, schema, dependency or configuration changes.

PHASE 6J1 — DYNAMIC DETAILS HOST TYPING AUDIT COMPLETE

Production files changed: 0
