# PHASE 6L1 — FINAL SHARED-CODE HYGIENE AUDIT

## Baseline and scope

Audit only. No production or existing test file was changed; no tests were added. Full frontend **670/670**, Auth **29/29**, Routing **33/33**, Cypress permissions **8/8**, normal production TypeScript and `git diff --check` all pass.

The review covers 23 production TypeScript files (about 9.4k lines), including every minimum-scope file in the request, plus directly adjacent TableFilter, TableSettings, OutdatedItemMenu, the blocking dialog and owner draft builder. Related templates/styles and the disconnected owner-local resource files were inspected. AdvancedDetails' complete implementation was read, not just searched. The established logger/notification path was inspected only to assess Phase 6 diagnostics.

Evidence combines executable TypeScript AST references, repository searches including tests, uncommented HTML references, component resource metadata, source inspection and optional `--noUnusedLocals` diagnostics. Compiler warnings alone were not treated as proof: Angular hooks and eager `effect()` initializers are important counterexamples. The optional unused-local scan reports existing hygiene warnings; it is not the normal production TypeScript check, which passes without configuration changes.

Paths below are relative to the repository root. Line numbers refer to the audited state. [Detailed evidence appendix](frontend-phase6l1-hygiene-evidence.md) includes the source manifest, all AdvancedDetails comments, all broad `any` sites, cast/non-null inventories and unused imports.

## AdvancedDetails findings

| ID | Finding and evidence | Severity / confidence | Classification |
| --- | --- | --- | --- |
| D1 | `advanced-details.component.ts:200–208`: inherited `service` declaration has no initializer, assignments, reads, subclass override or template/test use. Actual persistence resolves local service variables through `getService()`. | Low / high | Safe delete |
| D2 | `:183`: private injected `cdr` has no reads, writes after initialization, template or test access. Its `ChangeDetectorRef` import becomes orphaned with it. | Low / high | Safe delete |
| D3 | `:444–448`: private `isPartnerContext()` has only its declaration; no executable identifier/bracket reference, template binding or test use. | Low / high | Safe delete |
| D4 | `:621–626`: the control-iteration loop reads `mainForm.controls`, `Object.keys` and each control, but has no effect after its console statement was commented out. Local `c` is unused. No result escapes. | Low / high | Safe delete loop and its locals; preserve the save-disabled calculation |
| D5 | Nine dead helper names listed below have no calls or active template/test references. Five also have dead Volunteer overrides. | Low / high | Safe delete named declarations only |
| C1 | Disabled imports/type aliases, old fields, debug traversal, old save/update-plan and old coordination getter fragments remain in comments. | Low / high | Remove inactive code, not surrounding active methods |
| C2 | Several restoration comments refer to nonexistent `outdatingDataDraft`; the real history field is `outdatedDataDraft`. `changeToViewMode` is labeled as setting history although it resets pending state. | Low / high | Update comments |
| T1 | `any[]` validators, restoration/deletion indexing casts and generic owner assertions remain active. | Low–medium / high | Local typing debt; defer from cleanup |

**Dead helper evidence (D5):** each row has zero executable call/reference, zero active HTML binding and zero test use across `src/app`; only the listed declarations/overrides exist. They are not Angular lifecycle hooks or decorated event handlers.

| Name | AdvancedDetails declaration | Subclass declaration/write | Consumer evidence |
| --- | --- | --- | --- |
| `hasCoordinations` | 1546–1549 | None | Current template uses owner-kind conditions; no call |
| `hasSubscriptions` | 1551–1553 | Volunteer 344–346 | Both declarations only; no call |
| `hasCooperations` | 1554–1556 | Volunteer 347–349 | Both declarations only; no call |
| `setHasOutdatedInstitutes` | 1569 | Volunteer 354–358 | No call; live flags are set elsewhere during initialization/refresh |
| `setHasOutdatedSubs` | 1570 | Volunteer 359–361 | Same; flag itself remains used |
| `setHasOutdatedCoops` | 1571 | Volunteer 362–364 | Same; flag itself remains used |
| `getRowSpanForHomes` | 1584–1586 | None | Declaration only |
| `getRowSpanForPartners` | 1587–1589 | None | Declaration only |
| `isPartnerContext` | 444–448 | Private, none | D3; declaration only |

Do not remove the whole hook section. `hasRole()` is bound at `owner-details.component.html:88`, `hasInstitutes()` at `:348`, `getPostalAddress()` at `:257`, and `updateAddressFilter()` at `:214`. `setHasOutdatedNames` and other hooks have live calls/overrides. Empty base implementations are not sufficient evidence of dead code.

## Inherited `service` field finding

Current evidence is stronger than the earlier tentative finding:

- Declaration: AdvancedDetails 200–208; no default value.
- Subclass assignments/overrides: **0**, across Home, Senior, Volunteer, Partner, User and Toponym.
- Reads/writes through `this.service`, instance property access or literal bracket access: **0** for this inherited member.
- Template consumers: **0**. Test/mock consumers: **0**.
- Runtime operations: `checkOwnerData`, `saveOwner`, `saveUpdatedOwner` and other active paths resolve through `getService()`.

There is a second equally unused field in `table.component.ts:169–177`. Its active operations also use `getService()`. Local variables named `service`, the blocking dialog's **data object** member `service`, and injected `homeService`/`partnerService` etc. are different symbols and remain necessary. No service implementation or dispatch rewrite is proposed.

## Dead field, method and helper inventory

| ID | Candidate | Reads/writes/template/subclass evidence | Severity / confidence |
| --- | --- | --- | --- |
| D6 | Table's `protected service` field | Declaration only; no member read, assignment, subclass or template/test consumer. Local resolver variables are live. | Low / high |
| D7 | UploadFile `addressService` (`:42`) | Injected once; its only apparent use is inside commented `saveData` (`:165–184`). No active member/template/test access. AddressService's constructor is empty apart from dependency assignment; UploadFile already injects its own message service. | Low / high |
| D8 | UploadFile `file?: File` (`:47`) | Declaration only. `addFile` uses a different local `const file`; no `this.file`, template or test access. | Low / high |
| D9 | UploadFile `resetRequested` (`:53`) | Output declaration plus one commented emit; no active emit, parent binding, subscription or test use. | Low / high |
| D10 | `BUILD_RESTRICTED` (`owner-draft.builder.ts:228–277`) and its private `BuildRestrictedFn`/`BuildRestrictedMap` types (`:201–209`) | Map is constructed but never indexed, passed or exported. Its former invocation is commented at 290. Type aliases are used only by this dead map. No template/test/subclass consumer is possible for these private module locals. Keep live `getRestParams` at 211 and its invocation in `buildDraft`. | Low / high |
| D11 | `removedTypes` scratch array (`owner-restoration-reconcile.util.ts:301`, pushes at 315/330) | Only declaration and two pushes; never read or returned. Returned restoring/history results do not contain it. No external consumer can access this local. | Low / high |
| D12 | Unused `outdating` binding from `diffSubs` (`AdvancedDetails:1333`) | Destructured but never read. Keep the awaited planner call, changes/deleting results and intent guards. | Low / high |
| D13 | AdvancedDetails create/save-and-stay empty `else` (`:1395–1397`) | Contains only a future-work comment; no executable statement, output or consumer. Removing the empty branch preserves the `saveAndExit` condition. | Low / high |
| D14 | AdvancedDetails `checkOwnerData` error observer's `return of(null)` (`:996`) | An RxJS observer error callback's return value is unused; this does not recover the stream. Keep error notification/spinner handling and do not replace the observer with a new pipeline. | Low / high |
| D15 | BaseList `readonly dialog = inject(MatDialog)` (`:93`) | TypeScript symbol resolution across the spec program finds only the declaration; repository production imports of BaseList are in Table. No BaseList subclass, template binding or test reads it. Keep the unrelated live Table/AdvancedDetails dialog dependencies. Its `MatDialog` import becomes orphaned. | Low / high |

The dead map's `CLOSE`/`GONE` literals are not active restriction policy. Do not resurrect the map or alter the live restriction builder while removing it.

## Comment and commented-code inventory

**REMOVE — inactive implementation/history/debugging (low severity, high confidence).** These ranges are comments, not executable AST statements. They supply no runtime/template/subclass behavior; their live replacements remain in place:

| File | Representative exact ranges |
| --- | --- |
| AdvancedDetails | 149–151, 301/305/324/346/352, 364–365, 576–605, 609–616, 625, 727/730/745, 769/771/814/816/842, 1182–1185, 1474/1483, 1654–1656 |
| BaseDetails | Commented console calls at 131, 142, 150, 210, 249–251, 288, 294–298, 306–307, 319, 350, 368 |
| BaseList | 185, 192–196, 424, 438, 469–470, 486–487, 514–517; old selection/debounce alternatives, not the live publication effect |
| HomeDetails | 95–97, 124, 241–243, 256–259, 264–268, 291–320, 322–343, 371 |
| PartnerDetails | 111, 244–248, 279, 283–298, 300–313, 314–343 |
| VolunteerDetails | 117–124, 191–196/202, 207–232, 234–257, 258–302, 326–329, 333–335 |
| UserDetails | 28–36, 180, 184–278 old subclass planner/reconciliation alternatives and their orphan introductory comments |
| SeniorDetails | 110, 198–225 old subscribe-based hierarchy lookup; preserve current owned observable path |
| UploadFile | 128–133 disabled validation alternative, 156–157, 165–184 commented persistence path |
| Reconciliation utility | 135–162 old first-match implementation; live all-ID reconciliation starts at 164 |
| Owner draft builder | 55–68, 232/239/261, 290, 310–311 old contact/restriction/return alternatives |
| TableFilter | 406–408, 479–490, 510, 531, 699–705, 751–766, 840–842 |
| OutdatedItemMenu | 8–11 old params type, 20–22 old input declarations |

Unnecessary file-path headers are also present; some are wrong (`Table` claims to be UsersList, AdvancedDetails says `advances-details`, guard header has `.service.service.ts`). Remove path/history labels rather than maintaining a second source of filenames.

**UPDATE — useful but stale intent (low severity, high confidence):**

- BaseDetails 73: `data` is an Angular signal input, not a signal reference supplied by the wrapper after 6J2. BaseDetails 86: `emitted*` are Angular outputs; the host bridges separate state signals.
- Host 145: close result is `{ refresh: !!data }`; it does not map a name to `null`.
- AdvancedDetails 739/797–799/832/1033–1034: correct history/draft terminology. Replace misleading 1417/1534 section descriptions while retaining the lifecycle WHY comment at 1421.
- HomeDetails 194/202 and PartnerDetails 193/201: these enable/disable **coordinations**, not institutes.
- TableFilter 864: outputs are synchronous sequential emissions, not an atomic multi-output transaction. Preserve batching behavior; correct the wording only.
- ToponymDetails 103: notification handling occurs in the existing service/message pipeline; avoid implying the host receives the unused emitted outputs.

**KEEP — invariants and non-obvious behavior (high confidence):** BaseDetails save-intent lifetime comment 49; AdvancedDetails settled-view validation guard 383, view-only non-breaking-space explanation 704, archival schema wrapper explanation 1268, pending-mutation reset invariant 1421; BaseList publication ownership 456; Table initial address gate 258–263, switchMap loading order 366 and latest-live lookup ownership 550; UploadFile selection ownership 64; AddressFilter generation ownership 347; reconciliation missing-history-ID and institute numeric-category explanations. Ordinary section labels may remain where they aid navigation.

## Console inventory and logging/privacy

Executable `console.log/warn/error/debug/info` calls: **0 across all 23 inspected production TypeScript files**. The parser found no active console calls; console-looking source hits are comments. There is consequently no Phase 6 console call to replace with a logger, and no diagnostic should be dropped from an active error path.

| Inactive location/method | Commented payload | Reachability / sensitivity | Classification |
| --- | --- | --- | --- |
| BaseDetails initialization/edit/validation | Control names, values, old persisted values and address selections | Not reachable; values could contain personal data if revived | Remove comments; no logger replacement |
| AdvancedDetails `logInvalid` and save-disabled loop | Form values/errors/status and control errors | Traversal is commented; remaining loop has no output | Remove debug blocks and inert loop |
| Home/Partner comparison helpers | Current relation selections and serialized IDs | Not reachable | Remove commented diagnostics |
| Volunteer initialization | Full subscriptions/owner data | Not reachable; identifiers and relationship data | Remove commented diagnostics |
| Senior old lookup method | Selected Home and spouse lookup stream | Not reachable; location/relationship metadata | Remove old block |

The established path is `MessageWrapperService.handle` → `ClientLoggerService`, with diagnostic-marker deduplication and user-facing notifications. Warn/error notifications log code/context; success/info notifications do not automatically log their interpolation payloads. Intercepted failures are not logged a second time by `handle`.

**P1 — privacy-context review, medium severity / high confidence in the static data path; defer behavioral/policy work.** AdvancedDetails 987–994 and 1401–1409 pass `owner: ownerDraft` to `handle` for duplicate/create failures; Toponym errors pass a name; update/list paths pass owner IDs. `ClientLoggerService.maskCtx` redacts secret-key values and masks phone/email strings, but does not generally anonymize personal names, postal text or arbitrary IDs. For already-marked HTTP failures, `handle` suppresses a second diagnostic; unmarked failures (including response-validation errors) can send the supplied context. This is not an active-console leak and not a claim that every request emits owner data. Review minimal diagnostic metadata/masking using the existing logger in a separately characterized privacy batch. Do not add another logger, silently discard errors, or alter notification behavior in hygiene cleanup.

## TODO / FIXME inventory

All explicit markers and relevant history notes are recorded below. No executable FIXME/HACK/XXX/TEMP marker was found in the 23-file scope.

| Location | Classification and disposition | Confidence |
| --- | --- | --- |
| AdvancedDetails 569 empty TODO; 576/614/745 debug questions | Remove empty/debug comments with their inactive fragments; preserve the active delete-coordination behavior | High |
| AdvancedDetails 910 institute/coordination duplicate preflight | Still-valid product TODO: the local preflight currently checks contact duplicates; do not expand behavior during hygiene | High |
| AdvancedDetails 1451 close token question | Obsolete wording question; preserve the truthy close token/result mapping | High |
| AdvancedDetails 1567 hook question | Mixed status: D5 names are dead, while other hooks have template/subclass users. Replace the vague question only; do not remove the hook group | High |
| Host 72/115 `changes` mirror questions | Existing public state is asserted by host tests. Defer removal of the state/effect; do not weaken the characterized host contract | High |
| AdvancedDetails 569 empty TODO | Obsolete/vague comment; active delete-coordination method is template-bound. Remove marker only. | High |
| AdvancedDetails 576/614 debug-delete notes | Stale TODO; associated debug implementation is commented. Remove with history. | High |
| AdvancedDetails 745 enable-controls question | Obsolete commented alternative; current behavior is protected. Remove the disabled alternative, not active restoration rules. | High |
| AdvancedDetails 910 institutes/coordinations duplicate preflight | Product TODO: current immediate duplicate scan handles contacts. Do not assume planner diffing implements the requested preflight UX. Retain/clarify. | Medium |
| AdvancedDetails 1451 close-token question | Code-quality question; host consumes truthiness. Remove vague marker, keep current token/result semantics. | High |
| AdvancedDetails 1567 “need these funcs?” | Mixed: some hooks are live, named D5 hooks are dead. Replace vague note; never delete the entire hook group. | High |
| Host 72/115 dirty-state mirror delete notes | Code-quality debt, not confirmed dead state: current characterization asserts this public mirror. Preserve field/effect and defer contract removal. | High |
| Table 240 more owner filters | Product TODO with unclear completion scope. Keep/triage against actual product requirements. | Medium |
| Table 634 empty navigation handlers | Valid unfinished product workflows: handlers such as `onShowHomesSeniorsClick` are bound at `table.component.html:546`. Do not delete as unused or claim implemented. | High |
| Senior 61 cannot clear Home during creation | Unverified historical bug note; selection/reset tests are not proof of this exact UX. Retain for triage. | Medium |
| Senior 165 restoration-errors note | Unspecified bug debt; existing passing restoration tests do not prove every historical scenario. Retain/require reproduction. | Medium |
| Volunteer 485 manually created institute category display | Product/data-display issue; 6G2B numeric validator correctness is a different concern. Keep for triage. | Medium |
| Owner template 149 “all list+edit+new” | Product TODO near the Home last-update display; current display is view-edit only. Keep/clarify intent. | Medium |
| TableFilter 695 incompatible coordination filters | Valid product TODO; current mutually exclusive-filter UX is not completed by removing comments. Keep. | High |
| `docs/frontend-phase6-todos.md:3–6` explicit no-street/no-building UX | Valid product decision. Keep; do not add a stricter postal validator during hygiene. | High |
| Same historical document 8–10, old HomeMainService note | Stale after 6K1. Documentation can be updated later; no production reference remains. | High |

## Unused imports and constructor/service dependencies

The appendix lists all 36 currently unused import bindings in the 23-file scope by file/line and executable identifier count. Two more imports become orphaned only when D2/D7 are removed. Confirmed examples:

- AdvancedDetails: `NonTelegram`, `OptionalContacts`, `UserContacts`, `normalize`, `BehaviorSubject`, `shareReplay`; remove `ChangeDetectorRef` only together with dead `cdr`. Keep helpers imported by active H2/H3 calls. There are 36 currently unused import bindings across the reviewed scope, plus three imports orphaned by the proposed injection deletions (`ChangeDetectorRef`, UploadFile's `AddressService`, BaseList's `MatDialog`).
- BaseDetails: `startWith`.
- BaseList: `typedKeys`, `ContactType`, `RelationPick`, `debounceTime`, `distinctUntilChanged`.
- AddressFilter: `AddressKey`.
- HomeDetails: `DateUtilsService`, `combineLatest`. Partner/Senior: `DateUtilsService`.
- UserDetails: `DestroyRef`, `signal`, `DateUtilsService`.
- VolunteerDetails: `Institute`, `RelationPick`, `DateUtilsService`, the two reconciliation imports used only by disabled old hooks.
- UploadFile: `finalize`, `takeUntilDestroyed`; `AddressService` becomes orphaned after D7. Preserve `DestroyRef`, which owns live file-read lifetime.
- Owner draft builder: unused model/type imports listed in the appendix; D10 creates the additional private type cleanup.
- TableFilter: `distinctUntilChanged`; **keep the three `effect(...)` initializers**, despite warnings about unread handles.
- OutdatedItemMenu: `EventEmitter`; current outputs use `output()`.
- CauseOfBlockingDialog: `OwnerMainService`; keep the real dialog-data `service` value and its calls.

Proof for deleting an unused import is zero executable TypeScript identifier uses outside imports; component decorator `imports` arrays count as real uses. Angular templates cannot access a bare module import that is not exposed by the component. Subclasses cannot refer to an unexported import local from another module. Comments do not keep imports alive. The optional compiler diagnostic corroborates these findings but is not the sole basis.

No extra dead HomeMainService contract is confirmed: `getHomesPickList` is used by TableFilter, active/potential lists by Senior/Partner, and `getHomeGroups` by the recipient flow. `blockOwner` is called through the real blocking-dialog service value. The two 6K1 targets have zero exact executable/declaration references. Keep the remaining service/API surface.

## Cast / `any` inventory

The 23-file AST inventory contains **20 `any` type nodes, 86 assertion nodes and 114 non-null expressions**. Nested `as unknown as` contributes two assertion nodes; definite-assignment declarations are not included in the non-null count. Full locations/snippets are in the appendix.

| Group | Classification | Severity / confidence |
| --- | --- | --- |
| Advanced validators `any[]` at 539 | Avoidable local typing debt (`ValidatorFn[]` is a possible later shape); not an extraction remnant | Low / high |
| Advanced restored/deleted collection casts at 813/854/856; double cast at 741 | Dynamic heterogeneous history indexing/generic narrowing limitation; locally improvable, not dead logic | Medium / high |
| Table normalization `any` input/return at 278; `fetchList` filter at 404 | Broad recursive/query typing debt; keep serialization/query behavior intact | Medium / high |
| Upload result rows at 54 | Spreadsheet schema/output boundary spanning multiple row kinds | Low / high |
| Upload error-message cast at 79 | Avoidable local error typing; replacing coercion needs its own behavior check | Low / high |
| AddressFilter's six `Observable<any>` contracts | Heterogeneous async lookup typing debt; preserve generation/loading ownership | Low–medium / high |
| Toponym `Record<string, any>` at 69 | Avoidable local property lookup typing | Low / high |
| Planner restoration-address cast at 177 | Weak domain contract: signature only declares `{ id }`, implementation also reads geography | Medium / high |
| Planner `draft as any` at 372 | Generic draft enumeration limitation | Low / high |
| TableFilter date callback at 706, form reset cast at 916 | Dynamic-form typing limitation | Low / high |
| DOM event casts, form-array casts, generic builder merge and reconciliation entry casts | Framework/dynamic-form boundary; retain current narrowed behavior | Low / high |
| Existing-owner/form-control non-null assertions | Context/lifecycle/config assumptions; some could improve later, but no new runtime failure was shown | Low–medium / medium |

The dynamic host now has **zero** `any`/assertion nodes. Its local contract and Angular input forwarding remain untouched. `DialogData<T>.componentType ↔ T` correlation stays explicitly deferred. No typed-form, query-normalizer or owner-model redesign belongs in 6L2.

## Unreachable / legacy branches and H2/H3 duplication

No new impossible executable owner branch was established. Five owner kinds still reach AdvancedDetails; Toponym legitimately uses BaseDetails separately. Address/person/contact/coordination/Volunteer guards select different active policies. Keep them.

The obsolete `isQualified` owner list is commented, as are old subclass save/reconciliation implementations. They are removable historical alternatives, not missing runtime dispatch. D3/D5 are uncalled helpers. Framework lifecycle hooks with no explicit callers remain necessary.

No literal duplicate active H2/H3 implementation was found that warrants a new extraction. AdvancedDetails delegates restored-state reconciliation and contact/address dirty comparison to the existing utilities. Home postal-field and owner-specific relation/institute comparison checks are additional scenario work, not copies to delete. Planner/guard comparisons decide persistence/restoration; they serve different boundaries from display dirty checks.

## Debug/test leftovers and template/CSS findings

| Finding | Evidence / disposition | Severity / confidence |
| --- | --- | --- |
| Old owner-local resources | Five owner components use shared `owner-details.component.html/.css`. Their local `home/senior/volunteer/partner/user-details.component.html/.css` files (10 files) have no component/resource-path reference; build assets copy `public`, not `src/app`. Four local HTML files contain scaffold “works!” text; most other local files are empty, and User's CSS is an unused old copy. Safe disconnected-asset candidates. | Low / high |
| Base/Advanced scaffold templates | Still referenced by their component metadata; BaseDetails is also instantiated by tests. Do not call them unreferenced files or redesign inheritance to remove them. | Low / high |
| Disabled markup | BaseList HTML 118–121; owner template 125–126/394–395; TableFilter HTML 174/183/227–251/292–307. These are HTML comments; no Angular binding runs. Remove historical markup only. | Low / high |
| Commented styles | AddressFilter CSS 15–21; owner CSS multiple alternatives at 5–8/52–61/67–77/95–118; minor commented declarations in host/BaseList CSS. Remove disabled declarations; preserve explanatory comments. | Low / high |
| Duplicate selector | BaseList `mat-card-header` blocks at 28 and 85 currently contribute different properties. They are not duplicated behavior to delete; consolidation is optional, excluded from cleanup. | Low / high |
| Material deep rules | View-mode disabled field/checkbox/select styles and PrimeNG overlay/spinner customization have real component usage. Do not remove merely for `::ng-deep`. | Low / high |
| Unmatched custom selectors | `.custom-confirm-dialog` and `.example-option` have no matching class use found in executable TS/HTML. Potential stale styling, but overlay/dynamic DOM visual validation is required before removing active rules. | Low / medium |
| Unsupported utility | TableFilter has 18 active `items-center` uses and one commented use. Global styles import PrimeFlex; installed PrimeFlex provides `align-items-center`, not `items-center`, and no local/global CSS defines the latter. Flag as styling debt; verify visual intent before renaming. Other PrimeFlex utilities are provided and must not be blanket-removed. | Low / high for source mismatch, medium for visual impact |

No active fixed debug user, test ID, fake UUID or manual sleep was found in this scope. Selection/load/save counters are real ownership state. The `password123` value in BaseDetails 365 is an active view placeholder, not evidence of a configured credential: user update `mainProps` excludes password and a separate change-password workflow exists. Do not remove it as dead/debug data or change authentication behavior during hygiene. Any placeholder UX review is separate product work.

## Recommended Phase 6L2 — one bounded hygiene batch

**SAFE DELETE:** D1–D15 as precisely scoped above; D5 removes only the named base/Volunteer declarations. Delete commented executable alternatives and their now-orphaned imports, the dead restriction map/type chain, the unobserved reconciliation scratch array, and the 10 disconnected owner-local resource files. Preserve all active hooks, validators, persistence calls and metadata-referenced resources.

**SAFE UPDATE:** only the specifically stale comments listed above; retain lifecycle/save-intent/privacy invariants and valid product TODOs. Remove filename/history/debug comments rather than rewriting unrelated prose.

**LOGGER CLEANUP:** no active console calls require replacement. Delete inactive console text with historical blocks. Do not alter MessageWrapper/ClientLogger, diagnostic markers, masking, notifications or error handlers in this batch. P1 needs separately characterized review.

**TYPE CLEANUP:** remove unused imports/private type aliases made dead by these deletions. No active-form cast changes, owner correlation changes, service-map redesign or new abstraction.

**Expected production files (finite manifest):** AdvancedDetails, BaseDetails, DetailsDialog, BaseList, Table, UploadFile, AddressFilter, the five concrete owner TS files, owner draft builder, reconciliation utility, owner-ctrls/guard headers if removing filename labels, TableFilter, OutdatedItemMenu and the blocking-dialog unused import; disabled-markup changes only in BaseList/owner/TableFilter HTML; disabled-style changes only in AddressFilter/owner/DetailsDialog/BaseList CSS; and the 10 explicitly disconnected owner-local HTML/CSS files. HomeService, planner behavior, active CSS rules and all current tests remain unchanged. TableSettings requires no behavioral cleanup.

**Expected deletions:** two `service` fields; one unused change-detector field and one unused BaseList dialog injection; nine uncalled helper names (plus five Volunteer overrides); one inert loop; three obsolete UploadFile members; one dead map and its two private types; one scratch array and its pushes; one unused destructured binding; one empty branch and one unused observer return value; listed unused imports and inactive code/markup/style blocks; disconnected owner-local resources.

**Expected comment updates:** input/output terminology, close-result truthiness, history-field names, pending-state transition descriptions, coordination-control copy errors and the sequential filter-emission description.

**Expected logger changes:** none. **Expected active type/contract changes:** only removal of the unused Upload output and private unused declarations; no replacement aliases or optional members. **Risk:** low, provided declaration-only evidence is rechecked at implementation time and active lifecycle/hooks/effects/CSS are retained.

**KEEP WITH JUSTIFICATION:** framework hooks, effect initializer calls, host dirty-state mirror and emitted outputs covered by tests, template-bound empty product handlers, all owner dispatch policy, H2/H3 utilities, H5 validation guard, BaseList publication effect, dynamic-host input path, active HomeMainService methods and product postal/TODO work.

**DEFER:** unmarked-error context privacy review P1; precise Senior/Volunteer historical bug reproduction; incomplete navigation/filter/postal UX; owner/type correlation and dynamic-form/query typing; active CSS rule removal/utility changes requiring visual verification. Do not combine these with high-confidence deletion work or reopen completed architecture decisions.

## Validation and integrity

| Check | Result |
| --- | --- |
| Full frontend | 670/670 passed |
| Auth | 29/29 passed |
| Routing | 33/33 passed |
| Cypress permissions | 8/8 passed, existing stub setup |
| Production TypeScript (`tsc -p tsconfig.app.json --noEmit`) | Passed |
| `git diff --check` | Passed |
| New/modified tests | 0 |
| Production files changed | 0 |

Only audit documents were added. Pre-existing documentation was left intact. Temporary scripts/results are in `C:\Users\Owner\AppData\Local\Temp\phase6l1-hygiene-c7537101`. No existing test was weakened, skipped or modified.

PHASE 6L1 — FINAL SHARED-CODE HYGIENE AUDIT COMPLETE

Production files changed: 0
