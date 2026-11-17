# PHASE 7H — RESIDUAL WHOLE-FRONTEND HYGIENE AUDIT

Audit date: 2026-11-17. Repository baseline: `6c63aa3`. This phase creates this report only. No cleanup has been applied.

## BASELINE

| Check | Verified result |
| --- | --- |
| Full frontend, run before audit report creation | **722/722 passed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| Cypress permissions | **8/8 passed** |
| Production TypeScript | **Passed**, exit 0 |
| `git diff --check` | **Passed** |

The initial worktree had an existing untracked `docs/` directory and no tracked changes. Existing reports were preserved. Phase 7B–7G behavior, Phase 6 architecture, tests, translations, dependencies, and configuration are unchanged.

## FILES AUDITED

The inventory covers **329 files** under `src/app`: **116 production TypeScript files, 96 HTML/CSS resources, 110 spec files, and 7 test-support TypeScript files**. Test-support files are not counted as production.

| Area | Files inventoried, including local specs/resources |
| --- | ---: |
| App root | 6 |
| Directives / guards / interceptors / interfaces | 3 / 6 / 8 / 7 |
| Audit / forbidden / sign-in / in-progress | 7 / 1 / 4 / 4 |
| Orders list / order card and its children / order details | 6 / 15 / 4 |
| Occasions and its dialogs / recipients and its dialog | 11 / 9 |
| Seniors bulk update and its dialogs/change table | 15 |
| Homes / partners / volunteers / seniors / users lists | 4 / 4 / 5 / 4 / 3 |
| Roles and its dialog | 10 |
| Toponym details / toponym lists and wrappers | 4 / 22 |
| Home / Partner / Volunteer / Senior / User details | 4 / 6 / 4 / 3 / 4 |
| Reports / statistics | 5 / 4 |
| Services / utilities / testing support directory | 45 / 21 / 5 |
| Shared address filter / auth layout / base layout / base list | 4 / 3 / 6 / 5 |
| Shared dialogs / table / table filter / table settings / upload | 24 / 11 / 3 / 3 / 7 |

Method: whole-tree text and TypeScript AST searches; compiler diagnostics with unused-local/parameter checks enabled **in a temporary audit program only**; Angular template analysis of 53 reachable components; resource/import graph checks; and manual verification of candidate declarations, callers, templates, inheritance, tests, and adjacent behavior. The unreachable InProgress component was inspected separately. No repository compiler options were changed.

Shared/details findings were checked against the completed [6L cleanup](frontend-phase6l2-cleanup-report.md) and [6M closure](frontend-phase6m-closure-review.md), rather than reopening their architecture.

**Finding convention:** all source paths below are relative to `src/app/`; line numbers refer to this unchanged baseline. Each row supplies ID, file/category, evidence, classification/risk, dependencies, and recommended 7I action. Risk is the risk of removing the **identified item**, not permission to remove surrounding code. REMOVE is a recommendation for a later approved cleanup, not an action performed here. SAFE/LOW items are eligible for the bounded proposal; MEDIUM/HIGH items are excluded.

## ACTIVE CONSOLE CALLS

There are **five direct active console calls** in production: one `log`, four `error`; no direct active `warn`, `debug`, or `info` calls. Commented calls are listed separately.

| ID | File / category | Evidence | Classification / risk if removed | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| C01 | `pages/audit-table/audit-table.component.ts:241`; development log | Logs “Audit data loaded, total:” after every accepted response. The table state is already committed independently of the call; no test asserts this log. | **REMOVE / LOW** | Remove only this log statement; retain accepted-response updates and request/error ownership. |
| C02 | `utils/validate-response.ts:21,42,96,102`; response diagnostics | Envelope/schema/validator failures emit bounded code/stage/count metadata. They do not print response bodies or Zod issue payloads. Validation/console privacy specs protect this boundary. | **KEEP / MEDIUM** | Retain all four diagnostics and validation/throw behavior. They are intentional diagnostic outputs. |
| C03 | `services/client-logger.service.ts:21–58,68–75`, `services/global-error-handler.ts`; console capture/fallback | Stores original warn/error functions, installs/restores hooks, and uses original output for the deliberate fallback. These are console references and indirect calls, not additional direct `console.*(...)` calls. | **KEEP / HIGH** | Preserve hook ownership, fallback output, sanitization, and recursion prevention. No logger cleanup in 7I. |

Commented console calls occur in OrderCard, both bulk correction dialogs, AutocompleteRow, CustomValidator, and ZodValidator. They are inactive historical/debug code, covered by R04, R16, R17, and R21.

## COMMENTED-OUT EXECUTABLE CODE

These rows cover retired TS paths. HTML and CSS rows follow in their dedicated sections. Removing a comment must never reactivate its contents.

| ID | File / category | Evidence | Classification / risk if removed | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| R01 | `app.component.ts:24`; old initialization | Disabled `hydrateFromSession().subscribe()`; active authenticated-session initialization is owned by existing auth bootstrap. | **REMOVE / SAFE** | Delete the comment only. Do not add another hydration call or change app subscriptions. |
| R02 | `pages/homes-list/homes-list.component.ts:182,193,204,212–222`; disabled form configuration | Three old boolean validators and a disabled editable dateOfLastUpdate control. Current boolean defaults/configuration and the shared displayed update date are active elsewhere. | **REMOVE / SAFE** | Delete disabled text only; preserve empty validator arrays, current controls, and product TODO T01. |
| R03 | `pages/occasions-list/occasions-list.component.ts:213`; old response assignment | Disabled `this.options = res.data.options`; active option subjects are populated just above. | **REMOVE / SAFE** | Comment-only deletion; preserve all live option streams. |
| R04 | `pages/order-card/order-card.component.ts:332,339,607–609,669–670,674`; old alternatives/debug | Old occasionName assignments, response resets, addCheckboxes call, contact log and clear. Current selection/reset/request ownership code is executable independently. | **REMOVE / SAFE** | Delete these comments only. Preserve all 7B selection generations, retry state, and current clear/reset behavior. |
| R05 | `pages/order-details/order-details.component.ts:155,178–184`; old form patcher | Disabled call and method for an old editable status/source/comment form. Current rendering uses the persisted order response. | **REMOVE / SAFE** | Delete disabled patcher only. Associated unused imports/methods/styles have separate IDs. |
| R06 | `pages/orders-list/orders-list.component.ts:136–137,141,196,257–273,348`; old list/create flow | Disabled current-user extraction, query member, scratch expression, dialog implementation, and old finalize. Actual paging/user-route behavior and mutation finalize remain live. | **REMOVE / SAFE** | Delete listed comments only; M03/J01 cover the inert method and injections separately. Never reinstate the commented userId restriction. |
| R07 | `pages/recipients-list/recipients-list.component.ts:70,135–155,225–231`; debug dump/old resets | Disabled FilterService injection, browser-object dump, and copied Occasion reset block refer to unused/absent local state. | **REMOVE / SAFE** | Delete comments only. Preserve actual table reset and recipient selection handling. |
| R08 | `pages/roles-list/roles-list.component.ts:246,267`; obsolete parameters | Two `/* , roleName: string */` fragments remain beside active method signatures that do not accept them. | **REMOVE / SAFE** | Delete fragments, preserving signatures and role permission behavior. |
| R09 | `pages/seniors-bulk-update/seniors-bulk-update.component.ts:25,105`; commented imports | Disabled PrimeNG ButtonModule import/metadata entry. Actual buttons use the active MatButtonModule. | **REMOVE / SAFE** | Delete disabled text only. Keep MatButtonModule. This is not an active unused import. |
| R10 | Same file `:51–73`; obsolete interface | Commented local SeniorRow duplicates the current shared-schema import. | **REMOVE / SAFE** | Remove the old interface comment; retain the shared SeniorRow import and contract. |
| R11 | Same file `:124,156,162,165,188`; retired state | Disabled isStarted field/writes, toggleDisabled write, and commentsMode reset. Neither retired state name is executable; commentsMode already starts true. | **REMOVE / SAFE** | Delete disabled statements only. Preserve current showStart, chosenMonths, and loading state. |
| R12 | Same file `:751–756`; superseded parent mutation helper | Commented onChange wrote an old accepted map. The child now owns onValueSelected and emits accepted changes to active acceptChanges. | **REMOVE / SAFE** | Delete parent helper comment; retain the child input/output contract. |
| R13 | Same file `:975–984`; old expansion helpers | Disabled expandAll/collapseAll reference an inactive expandedRows path; no active template or TS caller exists. | **REMOVE / SAFE** | Delete the block only; do not alter current table behavior. |
| R14 | `pages/seniors-bulk-update/senior-changes-table/senior-changes-table.component.ts:38–42,60`; obsolete output | Disabled valueSelected output and emission; active local accepted map plus acceptChanges output implement the present flow. | **REMOVE / SAFE** | Delete disabled output/emission only; keep onValueSelected, accepted, and acceptChanges. |
| R16 | `pages/seniors-bulk-update/check-date-dialog/check-date-dialog.component.ts:135`, `check-gender-dialog/check-gender-dialog.component.ts:87`; disabled debug | The ngOnInit bodies contain only commented data logs. | **REMOVE / SAFE** for comments | E03 separately covers removing the empty hooks; do not change correction defaults or results. |
| R17 | `shared/dialogs/autocomplete-row/autocomplete-row.component.ts:58,64–67,76,84–87,96–115`; old hint/status implementation | Disabled showHint field/stream, home-status setters/guards, logs and alternate onSelectOption. Active display uses the RelationPick's homeStatus; active selection emits the selected value. | **REMOVE / SAFE** | Delete listed inactive code; retain minLength filtering, display, actual selection emission, and RelationPick status values. F07 covers the old component field. |
| R18 | `shared/base-layout/menu-item.ts:3–13`; obsolete class | Commented MenuItem class has been replaced by the active Item/Menu type shapes below. | **REMOVE / SAFE** | Delete the class comment only; preserve active permission/menu types and data. |
| R19 | `services/diff-confirm.service.ts:12,31,73,84`; retired alternatives | Disabled partner/home kind union entries and duplicate coordinations label entry. Current explicit active kind mappings remain. | **REMOVE / SAFE** | Delete disabled entries only; no new kinds or confirmation semantics. |
| R20 | `services/file.service.ts:208–224`; old spreadsheet options | Disabled frozen-view/autofilter block; current export implementation does not execute it. | **REMOVE / SAFE** | Comment-only deletion is eligible; do not add export options or reopen download behavior. |
| R21 | `utils/custom.validator.ts:63`, `utils/zod-validator.ts:9`; debug comments | Inactive contact/validation issue logs. | **REMOVE / SAFE** | Delete the logs' comments only; preserve validators and error shapes. |
| R22 | `pages/toponyms-lists/countries-list/countries-list.component.ts:40`; superseded validator | Commented Validators.required follows the active schema-based name validator. | **REMOVE / SAFE** | Delete trailing comment only; retain the Zod name validation. |
| R23 | `interfaces/dialog-props.ts:34`; obsolete union fragment | Disabled `Date \| string[]` alternative is outside the actual union. | **REMOVE / SAFE** | Delete comment only. No DialogData generic or form contract redesign. |
| R24 | `shared/table/table.config.ts:169–171,232–234`, `shared/table/table-permissions.registry.ts:43–45`; obsolete alternatives | Disabled contact-flattening paths and mapped registry type sit beside the current executable implementation/types. | **REMOVE / SAFE** | Delete disabled alternatives only; retain active export formatting, row fields, permissions, and registry typing. |

One disabled validator branch is **not** in that removal list:

| ID | File / category | Evidence | Classification / risk if removed | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| R25 | `utils/custom.validator.ts:125–130`; disabled business validation | Tests a min-only house distribution with `max === null`; active validation at 132+ checks the distinct min-and-max case. It is not proven to be a duplicate or obsolete requirement. | **DEFER / MEDIUM** | Retain in 7I. Clarify the intended unbounded-maximum distribution rule separately; do not enable it as cleanup. |

## UNUSED IMPORTS

The temporary unused-local pass reported 75 diagnostics. **30 are unused import bindings**, listed below. Remaining diagnostics include parameters, write-only state, actual unused injections, and intentional effect handles; they are not a deletion list.

For I01–I15, compiler-resolved evidence is no executable reference to the local imported binding, including the component metadata array. Manual template checks found no matching dependency requiring those unused bindings. Imports in a spec belong to a different lexical scope and cannot use these local bindings.

| ID | File and import line(s) | Exact unused bindings | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| I01 | `pages/homes-list/homes-list.component.ts:29` | Validator | **REMOVE / LOW** | Remove binding only. |
| I02 | `pages/occasions-list/check-result-dialog/check-result-dialog.component.ts:4,25` | DestroyRef, Recipient | **REMOVE / LOW** | Keep RecipientsShortList and all actual dialog imports. |
| I03 | `pages/occasions-list/occasions-list.component.ts:38` | Observable | **REMOVE / LOW** | Keep consumed RxJS operators/subjects. |
| I04 | `pages/order-card/order-card.component.ts:17` | AutoCompleteSelectEvent | **REMOVE / LOW** | Do not change event handlers or add event casts. |
| I05 | `pages/order-card/order-filters/order-filters.component.ts:14,19,20,25,26` | AbstractControl, ValidationErrors, Validators, zodValidator, orderFilterSchema | **REMOVE / LOW** | Preserve active form validators, control subscriptions, and policy. |
| I06 | `pages/order-details/order-details.component.ts:5,6,9,29` | FormControl, FormGroup, Validators, zodValidator | **REMOVE / LOW** | Old form code is R05; retain current child recipient editing. |
| I07 | `pages/orders-list/orders-list.component.ts:5,34` | OnInit, switchMap | **REMOVE / LOW** | Keep the executable ngOnInit method; Angular does not require the interface import. |
| I08 | `pages/recipients-list/create-recipient-dialog/create-recipient-dialog.component.ts:21,45,46,51` | FormGroup, EMPTY, switchMap, zodValidator | **REMOVE / LOW** | Keep current real form controls and lookup ownership. |
| I09 | `pages/recipients-list/recipients-list.component.ts:30` | recipientQueryDTOSchema | **REMOVE / LOW** | No request/schema change. |
| I10 | `pages/seniors-bulk-update/check-gender-dialog/check-gender-dialog.component.ts:2,5,6` | ChangeDetectionStrategy, model, signal | **REMOVE / LOW** | Keep Component/inject and the actual form controls. |
| I11 | `pages/seniors-list/seniors-list.component.ts:20,22` | Validator, readonly | **REMOVE / LOW** | Keep schema validators and current readonly behavior. |
| I12 | `pages/toponyms-lists/districts-list/districts-list.component.ts:6` | DefaultAddressParams | **REMOVE / LOW** | Keep active query/address configuration types. |
| I13 | `shared/base-layout/menu-item.ts:1` | MatMenu | **REMOVE / LOW** | Keep actual BaseLayout MatMenuModule; this type file does not use MatMenu. |
| I14 | `shared/dialogs/autocomplete-row/autocomplete-row.component.ts:26` | filter | **REMOVE / LOW** | Keep the active Array.filter and RxJS map; they do not use this imported operator. |
| I15 | `utils/custom.validator.ts:5` | FormGroup | **REMOVE / LOW** | No validator logic change. |
| I16 | J01–J04 and F08 files; conditionally orphaned imports | Only imports actually orphaned by the listed declaration removals | **REMOVE / LOW** | Recheck after the atomic deletion. In particular keep UserService if still required by blocking-dialog data types, and keep inject when other injections remain. |

### Standalone/module imports verified against templates

Angular's unused-standalone diagnostic does not identify every unused NgModule. These are manually verified candidates, supported by actual template directive/pipe usage. A child component supplies its own template imports; its needs do not justify unused imports in the parent. For each AM row, remove only the listed metadata entries and then any import bindings made unused.

| ID | File / category | Evidence: listed dependency has no current template consumer | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| AM01 | `pages/audit-table/audit-table.component.ts:24,95` | TagModule; no p-tag or Tag directive in Audit template. | **REMOVE / LOW** | Retain DatePipe/CommonModule, TranslateModule, real filter/button modules. |
| AM02 | `pages/occasions-list/occasions-list.component.ts:46–66` | MatCheckboxModule, SelectModule, ToolbarModule, ConfirmDialogModule; no corresponding Material checkbox, p-select, toolbar or confirm-dialog node. Confirmation UI is hosted by BaseLayout, not by importing a module here. | **REMOVE / LOW** | Keep ConfirmationService and all confirmation calls; keep Table/MultiSelect/Menu/AsyncPipe/HasOp imports. |
| AM03 | `pages/occasions-list/create-occasion-dialog/create-occasion-dialog.component.ts`; imports array | MatInputModule; form uses mat-select and radios, no matInput. | **REMOVE / LOW** | Keep MatFormField, Select, Radio, Forms and ReactiveForms modules. |
| AM04 | `pages/order-card/order-card.component.ts`; imports array | MatRadioModule and MatCheckboxModule; controls using them belong to OrderFilters' own template. | **REMOVE / LOW** | Keep OrderFiltersComponent and its own radio/checkbox imports. |
| AM05 | `pages/order-card/order-recipients/order-recipients.component.ts`; imports array | MatGridListModule; no mat-grid-list/tile in this template. | **REMOVE / LOW** | Preserve instruction form, toggles, NgClass, buttons and editing. |
| AM06 | `pages/order-details/order-details.component.ts:35–48` | CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule; current template has built-in control flow, cards, spinner, buttons and the recipient child, with no corresponding directives/pipes from these modules. | **REMOVE / LOW** | Keep OrderRecipientsComponent and its own imports, AuthService permission binding, TranslateModule, card/icon/button/spinner modules. |
| AM07 | `pages/orders-list/orders-list.component.ts:45–66` | MatCheckboxModule, SelectModule, DropdownModule; active table uses MultiSelect/TreeSelect, not these controls. | **REMOVE / LOW** | Retain TableModule checkbox infrastructure, live menu/HasOp, FormsModule and AsyncPipe. |
| AM08 | `pages/recipients-list/create-recipient-dialog/create-recipient-dialog.component.ts:89–110` | MatInputModule and MatRadioModule; current controls are a select and selection list. | **REMOVE / LOW** | Keep FormField, Select, List and real lookup/create behavior. |
| AM09 | `pages/recipients-list/recipients-list.component.ts:40–59` | MatCheckboxModule, MultiSelectModule, DropdownModule; actual checkbox nodes are TableHeaderCheckbox/TableCheckbox from TableModule, and the active select is from SelectModule. | **REMOVE / LOW** | Keep TableModule, SelectModule, selection state, and current filter callbacks. |
| AM10 | `pages/seniors-bulk-update/check-gender-dialog/check-gender-dialog.component.ts:16,44` | MatDatepickerModule; gender/name template has no datepicker. | **REMOVE / LOW** | Do not remove DatepickerModule from CheckDateDialog or the bulk parent, where it is used. |
| AM11 | `pages/seniors-bulk-update/seniors-bulk-update.component.ts`; imports array | MatRadioModule and CommonModule; radio controls belong to the child; parent template has no CommonModule directive/pipe use. | **REMOVE / LOW** | Keep child SeniorChangesTable's own RadioModule and all parent date/form imports. |
| AM12 | `pages/toponyms-lists/toponyms-list/toponyms-list.component.ts:77–100` | MatListModule, MatBadgeModule, MatButtonToggleModule, MatSelectModule, ReactiveFormsModule; current template uses Material table/paginator/sort, ngModel, checkbox and AddressFilter. | **REMOVE / LOW** | Keep FormsModule and the imported child's dependencies in the child's own metadata. |
| AM13 | `pages/{homes-list,partners-list,volunteers-list,seniors-list,users-list}/*.component.ts`; wrapper imports | TranslateModule; each wrapper template only renders app-table, whose own imports provide translation. No translation pipe in wrapper templates. | **REMOVE / LOW** | Keep TranslateService references used in TS/configuration and the Table component's TranslateModule. No BaseList inheritance change. |

These are metadata cleanup candidates, not dependency/package removals. FormsModule in the correction/creation dialogs is **not** classified unused merely because reactive controls exist: Angular still matches NgForm/control directives there. Broad “remove every import not called from TS” cleanup would be wrong.

## UNUSED FIELDS

| ID | File / category | Exact usage evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| F01 | `directives/has-op.directive.ts:33,67,71,74`; write-only flag | viewCreated has one declaration, three assignments, no reads in TS, template, or tests. Rendering uses vcr/ctx directly. | **REMOVE / LOW** | Remove this field and its three writes atomically. Preserve vcr.clear/createEmbeddedView, ctx, effect and permission checks. |
| F02 | `pages/order-card/order-card.component.ts:215` | orderDate has only its declaration/Date initializer; no current handler, template, test or inheritance use. | **REMOVE / LOW** | Remove field only; do not change order date semantics elsewhere. |
| F03 | `pages/order-card/order-filters/order-filters.component.ts:103` | actualYear has only its declaration; no template or test consumer. | **REMOVE / LOW** | Remove only declaration. |
| F04 | `pages/occasions-list/create-occasion-dialog/create-occasion-dialog.component.ts:127` | occasionName is initialized to an empty string and never read/written; the real form/draft supplies the name. | **REMOVE / LOW** | Remove field only, preserving form-derived payload. |
| F05 | `pages/recipients-list/recipients-list.component.ts:83–86` | categories, statuses, selectedCategories, selectedStatuses have no active TS/template consumer. selectedStatuses' apparent reset is inside R07's disabled copy. Active filters use options/callback values directly. | **REMOVE / LOW** | Remove these four fields only. Keep statusOptions, acceptableForSchoolOptions, filters and selectedRecipients. |
| F06 | `pages/orders-list/orders-list.component.ts:89–90` | occasionId and occasion have no executable read/write; occasion appears only in the disabled create flow. | **REMOVE / LOW** | Remove both with R06/M03. Retain actual userId routing and current orders payload. |
| F07 | `shared/dialogs/autocomplete-row/autocomplete-row.component.ts:61` | Component homeStatus is never read/written outside disabled R17 code. Template `c.homeStatus` and display `v.homeStatus` belong to RelationPick records, not this field. | **REMOVE / LOW** | Remove only the component field. Preserve both record-property displays. |
| F08 | `pages/order-details/order-details.component.ts:61,69–74` | sources and statusOptions are read only by uncalled sourceLabel/statusLabel. Current template renders response source/status keys. | **REMOVE / LOW** | Remove only with M02, then remove orphaned ORDER_SOURCE_OPTIONS import. |
| F09 | `pages/occasions-list/occasions-list.component.ts:97–152`, `pages/orders-list/orders-list.component.ts:106–127`; false positive | The option observables/subjects are populated in TS and consumed by async pipes in their own HTML. Dollar-suffixed names must be searched literally. | **KEEP / HIGH** | Preserve streams and AsyncPipe; do not classify declaration-only TS access as dead. |
| F10 | `shared/table-filter/table-filter.component.ts:194,208,221`; false positive | strongAddressFilterControl, strongContactFilterControl, strongDetailFilterControl initialize Angular effects. Unread EffectRef fields still create live control enable/reset behavior. | **KEEP / HIGH** | Keep effects and initializer execution; no removal based on unused-private diagnostics. |

## UNUSED METHODS

| ID | File / category | Exact usage evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| M01 | `pages/audit-table/audit-table.component.ts:269–272` | blur has no component TS/template/test caller, decorator, interface or subclass contract. Native input.blur calls elsewhere are unrelated. | **REMOVE / LOW** | Remove method and attached description only. Retain all real apply/clear controls. |
| M02 | `pages/order-details/order-details.component.ts:133–141` | sourceLabel/statusLabel have no TS, template or spec caller; class has no base/override contract. | **REMOVE / LOW** | Remove methods with F08; preserve translated response-key rendering. |
| M03 | `pages/orders-list/orders-list.component.ts:256–274` | onAddOrderClick body contains only R06's comment. No executable caller exists. Disabled HTML even names the old differently cased onAddORDERClick. | **REMOVE / LOW** | Remove inert method and retired create comments; do not implement/re-enable an order-create UI. |
| M04 | `pages/in-progress/in-progress.component.{ts,html,css,spec.ts}` | Component is absent from the production import/route/template graph; only its creation spec imports it. Placeholder template says the page is not created. | **DEFER / MEDIUM** | Removal would include a test-supported component/fixture decision. Exclude all four files from 7I; no test deletion as hygiene. |
| M05 | `shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1445–1464`, `pages/volunteer-details/volunteer-details.component.ts:217–235` | hasSubscriptions, hasCooperations, setHasOutdatedInstitutes, setHasOutdatedSubs, setHasOutdatedCoops have no live callers, but Volunteer overrides differ from base behavior. This is the previously retained ten-declaration group. | **DEFER / MEDIUM** | Preserve the 6L disposition. No base/override API contraction without its own bounded review. |
| M06 | `directives/blur-on-click.directive.ts:9,14`, interceptor/pipe implementations, owner service/hook methods | HostListener methods are invoked by Angular; intercept/transform implement framework APIs; owner methods are used through typed service maps/inheritance. Plain identifier counts miss those paths. | **KEEP / HIGH** | Keep framework callbacks and interface/subclass contracts, including BaseDetails addressService and owner hooks. |
| M07 | `pages/recipients-list/recipients-list.component.ts:325–326`, `shared/table/table.component.ts:625–636` | Empty Send/show-orders/navigation methods have live template bindings and represent unfinished product behavior. | **DEFER / HIGH** | Do not delete handlers or controls. Keep the previously deferred Phase 7 R16 Send finding and navigation work outside hygiene. |

## DEAD INJECTIONS

For J01–J04, current TS/template/test searches show no execution using the identified injected field. The named services' existing constructors do not provide feature-specific startup work that this component relies on. Removing only these unnecessary resolutions is LOW risk, not removal of providers or service APIs.

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| J01 | `pages/orders-list/orders-list.component.ts:73,75,81` | occasionService is unused; authService is mentioned only in disabled current-user code; dialog only in the disabled R06 implementation. All three are private; neither HTML nor specs access these component fields. | **REMOVE / LOW** | Remove these three injections and only truly orphaned imports. Preserve live route/router/order service and permission directives. |
| J02 | `pages/recipients-list/create-recipient-dialog/create-recipient-dialog.component.ts:118` | occasionService is private, declaration-only; current setup uses passed occasion data, HomeService and RecipientService. | **REMOVE / LOW** | Remove injection and orphaned OccasionService import only. |
| J03 | `shared/table/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts:47` | private userService is never read. Active blocking calls `this.data.service.blockOwner(...)`. | **REMOVE / LOW** | Remove unused injection only; UserService remains part of the data service union and may still require a type import. Preserve real blocking request. |
| J04 | `pages/roles-list/create-role-dialog/create-role-dialog.component.ts:75`, `pages/occasions-list/create-occasion-dialog/create-occasion-dialog.component.ts:119` | Both data fields resolve MAT_DIALOG_DATA but never use it in active TS/HTML. Current specs do not inspect these fields. A `data-cy` attribute is not a reference to a component data field. | **REMOVE / LOW** | Remove these two unused injections and orphaned MAT_DIALOG_DATA imports only. Callers may continue passing dialog data; do not reorganize their dialog contracts. |

No other constructor-injected dependency was proven dead. In particular, empty constructor **bodies** are not evidence that their parameter-property injections are unused.

## EMPTY LIFECYCLE / CONSTRUCTORS

The AST inventory found **23 empty bodies**: the six removable bodies below and **17 parameterized DI constructors to retain**.

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| E01 | `pages/recipients-list/recipients-list.component.ts:108` | Empty zero-argument constructor in a class without inheritance. Its real ngOnInit is separate and nonempty. | **REMOVE / LOW** | Delete constructor only; keep OnInit interface/import and actual hook. |
| E02 | `pages/seniors-bulk-update/seniors-bulk-update.component.ts:154–157` | Empty zero-argument constructor and ngOnInit containing only R11's disabled assignment. No implements OnInit, inheritance or test hook call. | **REMOVE / LOW** | Remove both bodies; preserve all field initialization and actual onStart flow. |
| E03 | `pages/seniors-bulk-update/check-date-dialog/check-date-dialog.component.ts:134–136`, `check-gender-dialog/check-gender-dialog.component.ts:86–88` | Hooks contain only disabled logs; neither class implements OnInit or has inheritance, and no test calls them. | **REMOVE / LOW** | Remove hooks with their log comments. Keep field/form initialization. |
| E04 | `pages/sign-in/sign-in.component.ts:54–56` | Zero-argument constructor contains only a disabled resetAuthState call; no inheritance. | **REMOVE / LOW** | Delete constructor/comment; no new auth reset or startup behavior. |
| E05 | `directives/blur-on-click.directive.ts:7`; constructors in Address, DateUtils, Home, Message, Occasion, Order, OwnerChangesPlanner, OwnerRestorationGuard, Partner, Recipient, Role, Senior, User, Volunteer services; `shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts:98`; `utils/public-translate-loader.ts:6` | These 17 bodies are empty but their parameter properties supply dependencies used by live methods. | **KEEP / HIGH** | Keep constructor parameters and initialization. No inject-style migration. |
| E06 | BaseDetails/AdvancedDetails empty default hooks | Subclasses override/call hooks through the existing lifecycle. M05 is a separate deferred group, not evidence that all empty hooks are removable. | **KEEP / HIGH** | Preserve contracts and super/lifecycle ordering. |

## TODO / FIXME / HACK / XXX

**21 marker occurrences, represented by 20 rows** below; T14 has two occurrences. All are TODOs; no production FIXME/HACK/XXX marker was found. Each was read in context. A business TODO is not dead code, and none is being implemented here.

| ID | File / line | Marker category and current evidence | Classification / risk if removed | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| T01 | `pages/homes-list/homes-list.component.ts:451` | **PRODUCT TODO** — partners setup in Home dialog configuration; not proven completed by current coordinations alone. | **DEFER / MEDIUM** | Keep requirement; separate product decision. |
| T02 | `pages/order-card/order-filters/order-filters.component.ts:273` | **PRODUCT TODO** — mutually constrain address-place option when maxNoAddress is set. Current gender/amount adjustments are a different rule. | **DEFER / MEDIUM** | Keep; no filter policy changes. |
| T03 | `pages/order-card/order-recipients/order-recipients.component.ts:128` | **STALE TODO** — replace 1800 comparison with null handling. Both current display branches already use `birthYear !== null`; old `/* > 1800 */` fragments remain at 129/131. | **REMOVE / SAFE** | Delete TODO and two disabled comparison fragments only. Preserve null checks, output format and year/date policy. |
| T04 | `pages/order-details/order-details.component.ts:124` | **STALE TODO** — “userId” immediately before back navigation. Route userId is now read, stored, and used to choose the scoped return URL. | **REMOVE / SAFE** | Delete vague obsolete note only; retain route parameter, diagnostics, and scoped navigation. |
| T05 | `pages/recipients-list/recipients-list.component.ts:284` | **PRODUCT TODO** — unfinished confirmation label: count concatenates the literal PRIME_CONFIRM.DELETE_RECIPIENTS key. Not resolved in this source. | **DEFER / MEDIUM** | Keep localization requirement; no translation/message change in hygiene. |
| T06 | Same file `:329` | **CORRECTNESS TODO** — refresh open-occasion recipient snapshots when Senior/Home data changes. Frontend audit cannot establish server reconciliation completeness. | **DEFER / HIGH** | Keep; separate cross-entity/backend contract review, not a deletion. |
| T07 | `pages/senior-details/senior-details.component.ts:60` | **CORRECTNESS TODO** — Home not clearing during creation. Recent reset tests protect specific null/spouse state; they do not establish every creation-home scenario resolved. | **DEFER / MEDIUM** | Keep pending precise reproduction; no speculative fix or stale classification. |
| T08 | Same file `:164` | **CORRECTNESS TODO** — Senior restoration errors. Shared restoration fixes/coverage do not prove every Senior historical workflow covered. | **DEFER / MEDIUM** | Keep separate from hygiene. |
| T09 | `pages/seniors-bulk-update/seniors-bulk-update.component.ts:639` | **CORRECTNESS TODO** — prevent Save when Home is not found. Phase 7F handles failed-start recovery; it is not evidence of this entire business guard. | **DEFER / HIGH** | Keep; inspect contract/test in a correctness phase. |
| T10 | Same file `:987` | **CORRECTNESS TODO** — persist changed full names. Accepted changes now enter updated and are sent to updateList, so a request path exists; complete persistence semantics were not established by this audit. | **DEFER / MEDIUM** | Keep, potentially stale but unproven; no endpoint or payload work in 7I. |
| T11 | `pages/statistic/statistic.component.ts:56` | **PRODUCT TODO** — birthday statistics in five-day buckets. Current general statistics do not provide that breakdown. | **DEFER / MEDIUM** | Keep feature requirement; do not alter Reporting. |
| T12 | `pages/volunteer-details/volunteer-details.component.ts:358` | **CORRECTNESS TODO** — organization category display when opening a record created under Russian. Category validator work does not prove this localized display case resolved. | **DEFER / MEDIUM** | Keep; no DTO/subscription/institute cleanup. |
| T13 | `shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:823` | **PRODUCT TODO** — institute/coordination duplicate preflight; current loop detects contacts. | **DEFER / MEDIUM** | Preserve previous 6L disposition and existing duplicate behavior. |
| T14 | `shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts:72,115` | **DEFER** — two “delete?” notes on mirrored changes state/effect. Host characterization protects this bridge; removal is an architecture decision. | **DEFER / MEDIUM** | Retain state/effect and notes in 7I. |
| T15 | `shared/table/table.component.ts:230` | **PRODUCT TODO** — additional entity filter/sort parameters. Existing owner-specific filters do not prove all requested entities complete. | **DEFER / MEDIUM** | Keep; no query changes. |
| T16 | Same file `:624` | **PRODUCT TODO** — empty but template-bound related-entity navigation methods at 625–636. | **DEFER / HIGH** | Keep both note and handlers; no UI deletion. |
| T17 | `shared/table-filter/table-filter.component.ts:676` | **PRODUCT TODO** — mutually exclusive coordinator / without-coordination selections. | **DEFER / MEDIUM** | Keep business/UX requirement. |
| T18 | `pages/seniors-bulk-update/senior-changes-table/senior-changes-table.component.html:49` | **PRODUCT TODO** — i18n; “Name”, “Old Value”, “New Value” remain hard-coded. | **DEFER / MEDIUM** | Keep; do not change translations/template text as hygiene. |
| T19 | `shared/dialogs/details-dialogs/advanced-details/owner-details.component.html:146` | **PRODUCT TODO** — show last update date for all list/edit/new contexts; current block is Home view-edit only. | **DEFER / MEDIUM** | Keep the unresolved display requirement. |
| T20 | `pages/seniors-bulk-update/check-date-dialog/check-date-dialog.component.css:12–19` | **DEFER** — TODO wraps a disabled Material subscript-height override. It may represent unfinished validation-layout work, not merely an old color/style choice. | **DEFER / MEDIUM** | Retain block in 7I; do not enable, remove or replace it without layout intent. |

No RELEASE TODO was identified. No TODO is removed merely for being Russian or vague; T03/T04 have concrete current implementation evidence supporting their narrower stale classification.

## STALE COMMENTS

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| S01 | `utils/contact-url.pipe.ts:1`; stale file header | Header points to the old pages/users-list/pipes location; actual pipe lives in utils. | **REMOVE / SAFE** | Delete misleading path comment; no rename/move. Correct path headers elsewhere need not be swept. |
| S02 | `pages/occasions-list/check-result-dialog/check-result-dialog.component.ts:40`; stale section label | “Angular forms” precedes TranslateModule; this dialog has no forms import/control. | **REMOVE / SAFE** | Delete misleading label only. Keep translation support. |
| S03 | `pages/audit-table/audit-table.component.ts:274`; misattached description | “Called from date range picker” is immediately attached to private toISOStart; actual template handler is onRangeSelect. | **REMOVE / SAFE** | Remove only the misattached comment. Keep helper, UTC boundary logic and actual handler. |
| S04 | Bulk invariant comments at `seniors-bulk-update.component.ts:396–457`; shared async/security comments | Month/day dependency, all-empty date allowance, real month day counts, stale-intent/destroy guards, diagnostic privacy and no-recursive-log transport explain non-obvious rules. | **KEEP / HIGH** | Preserve useful Russian/English WHY comments. Do not delete explanatory prose because it resembles code vocabulary. |

T03/T04 and the superseded paths in R01–R24 also contain stale comments; their classifications are not duplicated or contradicted here.

## DISCONNECTED TEMPLATE CODE

No proven active binding to a removed member was found. Angular template semantic analysis found no errors. Built-in control flow, PrimeNG named templates (header/body/filter/caption/item), Material refs and dynamic detail-host containers are live contracts, even without an explicit TS caller.

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| H01 | `pages/occasions-list/occasions-list.component.html:51–53,61–64,207–209`; disabled markup | Old selection cells and ID filter. Live table renders independently; disabled body references old customer name. | **REMOVE / SAFE** | Delete comments only, no column/selection behavior change. |
| H02 | `pages/order-card/order-filters/order-filters.component.html:139,161`; disabled options | Empty mat-option alternatives inside existing region/home selects. | **REMOVE / SAFE** | Delete comments only; keep current selections/options. |
| H03 | `pages/order-card/order-recipients/order-recipients.component.html:67–70,86`; old display path | Disabled info-note condition and plain noAddressNote rendering, superseded by active school/institute-specific branches. | **REMOVE / SAFE** | Delete inactive alternatives only; preserve active instructions and business notes. |
| H04 | `pages/order-details/order-details.component.html:20`; debug branch | Commented `@if (false)` beside the real isLoading branch. | **REMOVE / SAFE** | Delete comment only. |
| H05 | `pages/orders-list/orders-list.component.html:15–26,301–353`; old actions | Disabled create grid tile and retired cancel/delete/restore cells. Active row menu at 264–298 remains used. | **REMOVE / SAFE** | Delete disabled blocks only. Keep MatMenuModule, HasOpDirective and every active menu action. |
| H06 | `pages/recipients-list/recipients-list.component.html:163`; old filter | Disabled text isAbsent filter; current status select remains. | **REMOVE / SAFE** | Delete comment only. |
| H07 | `pages/seniors-bulk-update/check-gender-dialog/check-gender-dialog.component.html:17–20`; disabled error block | Commented gender error markup, alongside existing active controls. | **REMOVE / SAFE** | Remove inactive markup only; do not add/change validation UX. |
| R15 | `pages/seniors-bulk-update/senior-changes-table/senior-changes-table.component.html:11,35–38,81–85`, parent HTML `:166–167`; old alternatives | Disabled row color, duplicate action buttons and retired parent move button. Current mini-fab actions emit the same present outputs independently. | **REMOVE / SAFE** | Delete commented markup only. Keep moveToAdmitted/acceptChanges bindings and T18. |
| H08 | `shared/dialogs/autocomplete-row/autocomplete-row.component.html:15–17` | Disabled hint depends on disabled showHint stream in R17. | **REMOVE / SAFE** | Delete with R17; current error display and actual async result list remain. |
| H09 | `shared/dialogs/details-dialogs/advanced-details/owner-details.component.html:441` | Disabled inline background style note. No executable style binding. | **REMOVE / SAFE** | Comment deletion only; preserve active styling. |
| H10 | Same owner template `:214`, `shared/table/table.component.html:104`; disabled fallback category | WITH_ADDRESS else fragments touch the intentionally deferred address-category/product display area. | **DEFER / MEDIUM** | Leave both in 7I. Do not confuse no-address product UX with a proven dead implementation. |
| H11 | `pages/audit-table/audit-table.component.html:10`; template ref | dt2 is unreferenced by TS/other expressions, but belongs to a live table and is not a removed-member binding. PrimeNG refs elsewhere have special names consumed by the library. | **DEFER / LOW** | Unused-ref cosmetics are excluded from the first cleanup batch; no blanket template-ref removal. |

Dependency chains worth preserving: disabled Orders create markup → inert onAddOrderClick/commented MatDialog flow → J01; retired OrderDetails form → R05/I06/AM06/F08/M02 and unused local form styles; disabled Autocomplete hint → H08/R17, while AsyncPipe is still required by filtered$. No component module is considered used solely because it appears in a comment.

## DISCONNECTED CSS

Only explicit absent custom selectors and detached resources are candidates. No PrimeFlex utility migration, generated library selector pruning, overlay redesign or visual diagnosis was performed.

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| CSS01 | `pages/audit-table/audit-table.component.css:12–16` | .copy-button has no class/styleClass/ngClass/TS assignment in the current template or application source. Copy uses the active PrimeNG button path. | **REMOVE / LOW** | Remove this rule only; preserve .audit-filter-action added by 7G. |
| CSS02 | `pages/order-card/order-card.component.css:51–54` | .contact-autocomplete ancestor is absent from current template/TS; the nested library input selector cannot match without that custom ancestor. | **REMOVE / LOW** | Remove only this disconnected rule. No autocomplete size/color replacement. |
| CSS03 | `pages/order-details/order-details.component.css:20–62,80–87`; old form/summary rules | .toolbar, .summary-grid, .summary-item and its span/strong rules, .order-form and .comment-field have no owner-template class use or dynamic assignment. The recipient child's .toolbar is scoped to that child's template. | **REMOVE / LOW** | Remove only these unused selectors, including their media-query occurrences. Keep card, header-row, loading, recipients-section, and responsive card sizing. |
| CSS04 | `pages/orders-list/orders-list.component.css:17`, `pages/recipients-list/recipients-list.component.css:17` | .table-header has no app-owned matching markup, but appears inside deep library styling. Runtime-generated DOM was not visually inspected. | **DEFER / MEDIUM** | Leave active deep rules in 7I. Absence in source alone is insufficient for library-generated content. |
| CSS05 | `pages/toponyms-lists/toponyms-list/toponyms-list.component.css:88`; `shared/{base-list,table,upload-file}/*.component.css`; owner details CSS | Unmatched icon-cursor, example-option, line-through/custom-confirm-dialog selectors survive. Shared cases were already deferred in 6L for dynamic/overlay/visual evidence. | **DEFER / MEDIUM** | Preserve previous visual/deep-selector disposition; no blanket class deletion. |
| CSS06 | `app.component.html`, `app.component.css`; detached empty resources | Both files are zero bytes. AppComponent uses inline template/styles and neither file is referenced by production or test resource metadata. | **REMOVE / LOW** | Delete only these two detached empty files. Do not delete referenced empty component styles. |
| CSS07 | `pages/seniors-bulk-update/senior-changes-table/senior-changes-table.component.css` | Contains .move, but the component has no styleUrl/styleUrls. The file is unreferenced; the template's move class does not load it automatically. | **REMOVE / LOW** | Delete detached stylesheet only. Do not connect it as cleanup, since that would change rendering. |
| CSS08 | `shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component.css` | Zero-byte resource; component metadata has no style reference and no other consumer exists. | **REMOVE / LOW** | Delete this detached empty file only. |
| CSS09 | `pages/order-card/order-filters/order-filters.component.css:8`; `pages/order-card/order-recipients/order-recipients.component.css:8,15,38–39,50–51,62–80`; `shared/base-layout/base-layout.component.css:2,4,125–126,129–133` | Disabled declarations, old list-row grid alternatives, and old logo/countdown appearance. Current active rules are independent. | **REMOVE / SAFE** | Delete only the listed comments. Preserve active rules and useful layout/idle comments. Exclude T20's TODO override. |
| CSS10 | `pages/order-card/order-card.component.css:28–34`, `shared/base-layout/base-layout.component.css`; active duplicate rules | Repeated .start rule and .spacer declaration are active styles, not disabled code. No correctness need requires changing them here. | **DEFER / LOW** | Exclude active-style consolidation from the proposed first cleanup. |

Other zero-byte styles still referenced by component metadata are **KEEP**, not disconnected. Removing them would add needless metadata churn.

## DEBUG / TEST LEFTOVERS

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| D01 | All 110 `src/app/**/*.spec.ts` files; test runner modifiers | AST/search found no focused fit/fdescribe/it.only/describe.only/test.only or disabled xit/xdescribe/.skip test calls. | **KEEP / HIGH** | Preserve test files and counts. No general test cleanup. |
| D02 | `services/client-logger.service.spec.ts:157–158,164`; intentional console exercises | Three real console calls verify logger teardown/recreation against spies. These are test inputs, not debug output. | **KEEP / HIGH** | Keep calls and assertions unchanged. No other direct test debug console call was found. |
| D03 | OrderCard `:368`, AuditTable `:352`, FileService `:262`; timers | Delayed confirmation continuation has create-attempt ownership, Audit owns a soft-loader timer, FileService defers object URL revocation. They are actual UI/resource behavior, not synthetic latency. | **KEEP / HIGH** | No timer/delay cleanup. Preserve destroy/stale guards and download behavior. |
| D04 | Bulk CheckDateDialog correction defaults, topographic/default controls | Values such as the explicit 1800 correction option are active domain defaults, not proven fixture/debug data. | **KEEP / HIGH** | No date policy or payload normalization change. |
| D05 | Whole production scan; debug/test branches | No active debugger statement, forced-false debug branch or obviously injected test/mock row was found. H04 is commented, not active. | **KEEP / LOW** | No extra debug-branch deletion is proposed. Test-only InProgress fixture is M04, deferred. |

## TYPE SUPPRESSIONS / BROAD ANY

There are **48 actual TypeScript any nodes across 22 production files**, including nested generic arguments. No production `@ts-ignore`, `@ts-expect-error`, `eslint-disable` or template `$any` escape was found. String literals such as permission mode 'any' are not type escapes.

No NEW/UNJUSTIFIED typing regression was established by this phase. Existing broad typing is classified below; none is a 7I typing refactor. Library-boundary classification describes the boundary, not a claim that any is the only possible type.

| ID | File / line(s), number of any nodes | Type category / evidence | Classification / risk if removed | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| Y01 | `directives/has-op.directive.ts:32,51` (2) | **LIBRARY BOUNDARY** — alternative Angular TemplateRef context. | **KEEP / MEDIUM** | Preserve directive microsyntax/template behavior; no context redesign. |
| Y02 | `interfaces/advanced-model.ts:611` (1) | **KNOWN/DEFERRED** — shared list filter shape. | **DEFER / MEDIUM** | Separate query typing work. |
| Y03 | `interfaces/dialog-props.ts:18,37` (4) | **LIBRARY BOUNDARY** — heterogeneous AbstractControl generics. | **KEEP / MEDIUM** | Preserve dynamic forms and deferred DialogData correlation. |
| Y04 | `pages/audit-table/audit-table.component.ts:301,313,317,329,367` (5) | **KNOWN/DEFERRED** — range event/diff/metadata shapes. | **DEFER / MEDIUM** | No renderer/query contract rewrite. |
| Y05 | `pages/occasions-list/occasions-list.component.ts:249` (2) | **KNOWN/DEFERRED** — custom filter comparator inputs. | **DEFER / MEDIUM** | Preserve registered comparator and matching. |
| Y06 | `pages/order-card/order-card.component.ts:327,334` (2) | **LIBRARY BOUNDARY** — control/selection event values. | **KEEP / MEDIUM** | Keep 7B selection semantics; typing belongs to separate work. |
| Y07 | `pages/orders-list/orders-list.component.ts:212` (1) | **LIBRARY BOUNDARY** — PrimeNG filter metadata adapter. | **KEEP / MEDIUM** | Preserve exact normalized request filters. |
| Y08 | `pages/recipients-list/recipients-list.component.ts:198` (1) | **LIBRARY BOUNDARY** — PrimeNG filter adapter. | **KEEP / MEDIUM** | Same adapter contract; no normalization changes. |
| Y09 | `pages/sign-in/sign-in.component.ts:75` (1) | **KNOWN/DEFERRED** — notification translation parameters. | **DEFER / MEDIUM** | Preserve uniform authentication error UX. |
| Y10 | `pages/toponym-details/toponym-details.component.ts:66` (1) | **KNOWN/DEFERRED** — dynamic form-data record. | **DEFER / MEDIUM** | No typed-form overhaul. |
| Y11 | `pages/toponyms-lists/toponyms-list/toponyms-list.component.ts:289,492` (2) | **LIBRARY BOUNDARY** — sort/control/list data adapter. | **KEEP / MEDIUM** | Preserve sort and lookup behavior. |
| Y12 | `services/address.service.ts:260` (1) | **LIBRARY BOUNDARY** — uploaded heterogeneous row input. | **KEEP / MEDIUM** | Do not alter schemas/API payload construction. |
| Y13 | `services/file.service.ts:39` (1) | **KNOWN/DEFERRED** — decoded error JSON. | **DEFER / MEDIUM** | Keep 7D Blob/error diagnostic identity behavior. |
| Y14 | `services/owner-changes-planner.service.ts:177,372` (2) | **KNOWN/DEFERRED** — owner/address/contact narrowing. | **DEFER / MEDIUM** | Preserve planner contracts and confirmations. |
| Y15 | `shared/address-filter/address-filter.component.ts:287,301,315,329,400,432` (6) | **KNOWN/DEFERRED** — heterogeneous observable hierarchy results. | **DEFER / MEDIUM** | Preserve 6D request ownership and current form boundary. |
| Y16 | `shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:505,729,767,769` (4) | **KNOWN/DEFERRED** — dynamic relation/history dispatch. | **DEFER / MEDIUM** | No owner-correlation or history redesign. |
| Y17 | `shared/table/table.component.ts:268,394` (3) | **KNOWN/DEFERRED** — recursive filter normalization and dynamic filter handling. | **DEFER / MEDIUM** | Preserve Table request/loading ownership. |
| Y18 | `shared/table/table.config.ts:129`, Home-name formatter (1) | **KNOWN/DEFERRED** — dynamic row formatter. | **DEFER / MEDIUM** | No export/data formatting change. |
| Y19 | `shared/table-filter/table-filter.component.ts:685,876` (2) | **KNOWN/DEFERRED** — dynamic form/reset shapes. | **DEFER / MEDIUM** | No filter reset or policy change. |
| Y20 | `shared/upload-file/custom-error.ts:3,7` (2) | **KNOWN/DEFERRED** — attached validation data. | **DEFER / MEDIUM** | Preserve error information/notification contract. |
| Y21 | `shared/upload-file/upload-file.component.ts:48,73` (2) | **LIBRARY BOUNDARY** — spreadsheet rows/error bridge. | **KEEP / MEDIUM** | Preserve file-read ownership and output types. |
| Y22 | `utils/public-translate-loader.ts:7,8` (2) | **LIBRARY BOUNDARY** — nested translation dictionary JSON. | **KEEP / MEDIUM** | No translation/loading contract change. |
| Y23 | `pages/orders-list/orders-list.component.html:70,98,106,115,124,132,141,173,196,214`; `pages/recipients-list/recipients-list.component.html:21` | **KNOWN/DEFERRED** — Angular reports 10 redundant-nullish and one optional-chain warning. Orders' Record annotation does not represent missing keys in its initially empty filters object. Compiler redundancy is not proof that runtime fallbacks are dead. | **DEFER / MEDIUM** | Keep fallback expressions. Resolve sparse-record typing separately, not by deleting guards. |

## SENIORS BULK UPDATE FINDINGS

| Requested item | Evidence / decision |
| --- | --- |
| Commented ButtonModule | R09: **REMOVE / SAFE**; keep actual Material button import. |
| Old local SeniorRow interface | R10: **REMOVE / SAFE**; shared schema type is canonical. |
| isStarted/toggleDisabled | R11: **REMOVE / SAFE**; only inactive legacy declarations/assignments. |
| Empty constructor/ngOnInit | E02: **REMOVE / LOW**, with no inheritance/interface/test dependency. |
| Commented onChange | R12: **REMOVE / SAFE**; active child acceptance flow remains. |
| compareData mainFields exclusions | B01 below: **KEEP**, not an instruction to re-enable them. |
| compareData dateOfConsent exclusion | B02 below: **DEFER**; distinct unknown business choice. |
| expandAll/collapseAll | R13: **REMOVE / SAFE**, inactive old expansion path. |
| Missing-home/save TODO | T09: **DEFER / HIGH**; failed-start recovery is not proof this requirement disappeared. |
| Changed-name persistence TODO | T10: **DEFER / MEDIUM**; frontend update path exists, complete persistence not proven here. |
| Child output/button/color alternatives | R14/R15: **REMOVE / SAFE**; current accepted values and emitted payload unchanged. |
| Child i18n / date-dialog CSS TODO | T18/T20: **DEFER / MEDIUM**, not disposable historical implementation. |

| ID | File / category | Evidence | Classification / risk | Dependencies and Phase 7I action |
| --- | --- | --- | --- | --- |
| B01 | `pages/seniors-bulk-update/seniors-bulk-update.component.ts:782–822`; excluded-field documentation | firstName, gender, birthDate, dateOfExit are commented out of the generic nullable-field loop **and each has a separate active comparison immediately below**. | **KEEP / LOW** for comments | Preserve these exclusions/explicit comparisons. Re-enabling generic entries could duplicate or alter comparison policy. Do not “complete” the array. |
| B02 | Same file `:825`; excluded business field | dateOfConsent is disabled in otherFields and has no matching explicit comparison here. That is different from B01; inclusion/exclusion intent is unresolved. | **DEFER / MEDIUM** | Keep disabled entry; clarify policy separately. Neither enable it nor erase the only local note as cleanup. |

## KEEP ITEMS

KEEP is authoritative for C02/C03, F09/F10, M06, E05/E06, S04, D01–D05, B01 and the library boundaries in Y01/Y03/Y06–Y08/Y11/Y12/Y21/Y22.

Specifically retain:

- AsyncPipe/translation imports used by real templates, permission directives/menus, Angular lifecycle callbacks, HostListener methods and dynamic host containers.
- Constructor parameter-property injection, effect initialization, owner service-map methods, subclass overrides and required super/lifecycle ordering.
- Current business invariant comments, Russian date-validation explanations, security/privacy comments and stale-result/request ownership explanations.
- Real status/filter/response behavior, all current tests, and referenced empty stylesheet resources.

## DEFER ITEMS

DEFER includes R25, M04/M05/M07, H10/H11, CSS04/CSS05/CSS10, B02, all unresolved T rows, the known typing rows and Y23.

The following previously separated work remains outside 7I as well:

| ID | File / category | Evidence and dependency | Classification / risk | Phase 7I action |
| --- | --- | --- | --- | --- |
| X01 | Home postalAddressPart/shared owner form | Existing no-street/no-building UX is a product decision, not an unused DTO field. | **DEFER / HIGH** | Preserve contract, controls and product requirement. |
| X02 | `interfaces/dialog-props.ts` / dynamic details host | Generic owner correlation is known deferred type design; successful host typing work did not authorize a redesign. | **DEFER / MEDIUM** | Only R23 comment deletion is eligible; keep active contracts. |
| X03 | PrimeFlex/deep/overlay styles across frontend | Utility names and generated overlays need visual/runtime verification. | **DEFER / MEDIUM** | No visual migration or library selector sweep. |
| X04 | Rendered controls across frontend | Manual keyboard/screen-reader behavior requires a separate manual accessibility pass; 7G code-proven fixes remain protected. | **DEFER / MEDIUM** | No new a11y redesign or claim of manual verification. |
| X05 | Recipient Send/navigation controls | R16 Send and live empty handlers are unfinished requirements, not dead markup. | **DEFER / HIGH** | Preserve M07 and product scope. |
| X06 | Build budgets, report/statistic downloads, date policy | These are previously separated build/product/correctness workstreams; this audit supplies no new acceptance criteria. | **DEFER / MEDIUM** | No budgets/config, download behavior or date-policy edits. R20 is comment-only. |
| X07 | HomeMainService interface-only members | Prior contract review retained unused interface signatures; they are not obsolete implementation bodies. | **DEFER / MEDIUM** | No service interface contraction. |

## SAFE REMOVE ITEMS

The exact SAFE whitelist is:

- R01–R14, R16–R24: listed commented TS alternatives/debug text only.
- R15 and H01–H09: listed disabled HTML alternatives only.
- S01–S03: misleading path/section/handler comments only.
- CSS09: listed disabled style comments only.
- T03/T04: confirmed stale notes, including T03's old threshold fragments.

This whitelist excludes R25, H10 and T20. It also excludes explanatory comments and unlisted formatting. R15 is located in the template section, not missing from the inventory.

## LOW-RISK REMOVE ITEMS

The exact LOW whitelist is C01, I01–I16, AM01–AM13, F01–F08, M01–M03, J01–J04, E01–E04 and CSS01–CSS03/CSS06–CSS08.

Conditions:

- I16 permits only imports actually made unused by the listed deletions.
- F08/M02 and F06/M03/J01 are related deletions; keep the surviving response/route logic intact.
- Deleting an unused injection is not permission to change a provider, API, token, fixture or test setup.
- CSS03 means only named disconnected selectors, not its entire stylesheet or responsive card rules.
- CSS06–CSS08 mean exactly **four detached resource files**, not every empty file.

## MEDIUM/HIGH ITEMS NOT TO REMOVE

No MEDIUM/HIGH item is in the 7I removal proposal. In particular, do not remove unresolved business TODOs, compareData's dateOfConsent exclusion, disabled min-only distribution policy, active empty product handlers, inherited hooks, live effect initializers, diagnostic fallback architecture, type escapes/contracts, runtime filter guards, or deep/overlay styles.

The test-only InProgress component is also excluded: deleting its spec would change the current test inventory. This audit has not authorized that tradeoff.

## PROPOSED PHASE 7I CLEANUP SCOPE

Proceed only after approval, in small reviewable batches:

1. **Comment-only pass:** exact SAFE whitelist above. Preserve every executable token, useful WHY comment and retained/deferred marker. This is the smallest useful first batch.
2. **Unused declarations/imports:** I01–I16, AM01–AM13, F01–F08, M01–M03, J01–J04, E01–E04 and C01. Remove the unused flag writes atomically; retain all actual UI effects, constructors with DI, framework callbacks and subclass contracts.
3. **Disconnected assets:** CSS01–CSS03 and four resource files in CSS06–CSS08. No active style consolidation, PrimeFlex migration or generated-selector deletion.

For each batch, inspect the finite diff and run affected feature specs. For standalone metadata pruning, compile the relevant templates and run production TypeScript as well. Preserve all tests/assertions. At completion rerun full frontend, Auth, Routing, Cypress permissions, production TypeScript and diff checks.

No service extraction, class renaming, import-architecture reorganization, dependency/config change, behavior fix or new test is part of that proposal. Do not expand cleanup to every compiler warning. Findings are evidence-bounded, not a guarantee that every unused public API can be discovered statically.

## VALIDATION

| Command / scope | Result |
| --- | --- |
| `npm test -- --watch=false --browsers=ChromeHeadless` | **722 passed, 0 failed** |
| Auth includes: auth.service, auth.interceptor, auth-flow.integration, auth-ready.guard, auth.guard specs | **29 passed, 0 failed** |
| Routing includes: app.routes, route-perms.guard, base-layout.component specs | **33 passed, 0 failed** |
| `cypress run --spec cypress/e2e/permissions.cy.ts --env USE_STUBS=1,API_URL=http://localhost:8080` | **8 passed, 0 failed**, Electron headless |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | **Passed**, exit 0 |
| Temporary Angular template audit, no emit | No semantic errors; 11 existing warnings recorded in Y23. No config changed. |
| `git diff --check` | **Passed** |

Cypress used the existing stub permission flow and the project frontend dev server. The audit runner stopped the server it started. No backend modification or backend test run was needed. Audit scripts/logs were stored outside the repository in the OS temporary directory.

Files changed by this phase: **this new report only**.

Production files changed: **0**. Tests added/removed/changed: **0**. Templates/styles/translations/configuration changed: **0**.

PHASE 7H — RESIDUAL WHOLE-FRONTEND HYGIENE AUDIT COMPLETE
Production files changed: 0
