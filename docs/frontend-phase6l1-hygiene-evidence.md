# Phase 6L1 — hygiene evidence appendix

Read with [the audit and bounded cleanup proposal](frontend-phase6l1-shared-hygiene-audit.md). This is evidence, not an instruction to delete every compiler warning or cast. Production/test sources remain unchanged. Paths are relative to the repository root; source counts include a possible trailing empty logical line.

## A. Source manifest

| File | Logical lines | Comments | Active console calls | any nodes | Assertion nodes | Non-null expressions |
| --- | --- | --- | --- | --- | --- | --- |
| src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts | 376 | 37 | 0 | 0 | 1 | 6 |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts | 1714 | 75 | 0 | 4 | 34 | 42 |
| src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts | 150 | 10 | 0 | 0 | 0 | 0 |
| src/app/shared/base-list/base-list.component.ts | 541 | 29 | 0 | 0 | 1 | 0 |
| src/app/shared/table/table.component.ts | 810 | 16 | 0 | 3 | 15 | 0 |
| src/app/shared/upload-file/upload-file.component.ts | 186 | 6 | 0 | 2 | 2 | 0 |
| src/app/shared/address-filter/address-filter.component.ts | 558 | 28 | 0 | 6 | 5 | 0 |
| src/app/pages/home-details/home-details.component.ts | 423 | 14 | 0 | 0 | 4 | 13 |
| src/app/pages/senior-details/senior-details.component.ts | 227 | 6 | 0 | 0 | 2 | 12 |
| src/app/pages/volunteer-details/volunteer-details.component.ts | 486 | 16 | 0 | 0 | 4 | 7 |
| src/app/pages/partner-details/partner-details.component.ts | 345 | 11 | 0 | 0 | 4 | 9 |
| src/app/pages/user-details/user-details.component.ts | 306 | 13 | 0 | 0 | 1 | 3 |
| src/app/pages/toponym-details/toponym-details.component.ts | 162 | 7 | 0 | 1 | 1 | 12 |
| src/app/services/home.service.ts | 306 | 0 | 0 | 0 | 0 | 0 |
| src/app/services/owner-changes-planner.service.ts | 572 | 43 | 0 | 2 | 2 | 1 |
| src/app/services/owner-restoration-guard.service.ts | 246 | 7 | 0 | 0 | 0 | 4 |
| src/app/utils/owner-restoration-reconcile.util.ts | 384 | 9 | 0 | 0 | 1 | 0 |
| src/app/utils/owner-ctrls.ts | 101 | 3 | 0 | 0 | 0 | 0 |
| src/app/utils/owner-draft.builder.ts | 313 | 10 | 0 | 0 | 6 | 3 |
| src/app/shared/table-filter/table-filter.component.ts | 943 | 24 | 0 | 2 | 2 | 2 |
| src/app/shared/table-settings/table-settings.component.ts | 82 | 8 | 0 | 0 | 1 | 0 |
| src/app/shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component.ts | 74 | 2 | 0 | 0 | 0 | 0 |
| src/app/shared/table/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts | 83 | 2 | 0 | 0 | 0 | 0 |

## B. Complete AdvancedDetails comment inventory

Each of the 75 comment tokens is classified. Duplicated line 601 contains two separate comment tokens. REMOVE means only the comment/disabled code; active surrounding behavior stays. UPDATE/KEEP decisions are explained in the main report.

| Source lines | Classification | Comment summary |
| --- | --- | --- |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1 | REMOVE | // src/app/shared/dialogs/details-dialogs/advances-details/advanced-details.component.ts |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:149–151 | REMOVE | /* type PersonKind = Exclude&lt;Kind, 'home'&gt;; type ContactsOwner = Exclude&lt;Kind, 'senior'&gt;; type CoordinationsOwner = Extract&lt;Kind, 'partner' &#124; 'home'&gt;; */ |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:184 | KEEP — invariant, hook explanation or navigation | // DI |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:194 | KEEP — invariant, hook explanation or navigation | // Текущий пользователь |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:296 | KEEP — invariant, hook explanation or navigation | // View helpers |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:299 | KEEP — invariant, hook explanation or navigation | // Data |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:301 | REMOVE | // existingOwner!: OwnerByKind&lt;K&gt; &#124; null; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:305 | REMOVE | //deletingData!: DeletingByKind&lt;K&gt;; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:324 | REMOVE | //  genders = ['TABLE.NOTES.MALE', 'TABLE.NOTES.FEMALE']; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:346 | REMOVE | // getOwner() {} |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:352 | REMOVE | //hasOutdatedHomes = signal&lt;boolean&gt;(false); |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:364–365 | REMOVE | /*   spousePickListSubject = new BehaviorSubject&lt;RelationPick[]&gt;([]);   spousePickList$ = this.spousePickListSubject.asObservable(); */ |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:383 | KEEP — invariant, hook explanation or navigation | // Debounced form events can outlive Edit; settled View must stay clean. |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:391 | KEEP — invariant, hook explanation or navigation | // Load roles (with auto-unsubscribe) |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:465 | KEEP — invariant, hook explanation or navigation | // bridge spinner to parent |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:472 | KEEP — invariant, hook explanation or navigation | // --- UI bits |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:569 | REMOVE | //TODO: |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:576 | REMOVE | //TODO: delete //////////////////////////////// |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:577–601 | REMOVE | /*   logInvalid(ctrl: AbstractControl, path: string = ''): void {     const here = path &#124;&#124; '(root)';     if (       ctrl.invalid &&       (ctrl.touched &#124;&#124; ctrl.dirty &#124;&#124; ctrl.updateOn === 'submit')     ) {       console.g… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:601–604 | REMOVE | /*     console.groupEnd();     console.log('form.errors =', this.mainForm.errors);     console.log('form.status =', this.mainForm.status);        // INVALID &#124; PENDING &#124; VALID console.log('form.pending =', this.mainForm.p… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:605 | REMOVE | ///////////////////////////////////////////////// |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:607 | KEEP — invariant, hook explanation or navigation | // Enable/disable Save button |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:609–613 | REMOVE | /*     const isQualified =       this.kind === 'user' &#124;&#124;       this.kind === 'partner' &#124;&#124;       this.kind === 'volunteer' &#124;&#124;       this.kind === 'home'; */ |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:614 | REMOVE | // this.logInvalid(this.mainForm); //TODO: delete |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:616 | REMOVE | //isQualified && |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:625 | REMOVE | // console.log('CONTROL', name, 'status:', c.status, 'errors:', c.errors); |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:631 | KEEP — invariant, hook explanation or navigation | // Optional extra validation gates (true =&gt; changes detected) |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:636 | KEEP — invariant, hook explanation or navigation | // Compare contacts between form and original orderedContacts |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:652 | KEEP — invariant, hook explanation or navigation | // Compare address selection against original address (country/region/district/locality) |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:662 | KEEP — invariant, hook explanation or navigation | // Seed form with initial values; transform contacts for view-mode |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:704 | KEEP — invariant, hook explanation or navigation | // show non-breaking space in view mode, null in edit/create |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:711 | KEEP — invariant, hook explanation or navigation | // --- Outdated data actions |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:727 | REMOVE | //  this.restoringDataDraft.names = []; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:730 | REMOVE | //  } |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:739 | UPDATE | //восстанавливаемые значения удаляем из outdatingDataDraft |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:745 | REMOVE | // this.updateControlsValidity(this.controlsNames, true);//TODO: точно ли надо? |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:769 | REMOVE | //keyof RestoringByKind&lt;K&gt;, |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:771 | REMOVE | //  &#124; OutdatedHome, |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:774 | KEEP — invariant, hook explanation or navigation | //восстанавливаемое значение присваиваем соответветствующему form.control, |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:775 | KEEP — invariant, hook explanation or navigation | //если он пустой, или добавляем новый form.control с этим значением |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:797 | UPDATE | //для этих типов восстановить можно только одно значение, |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:798 | UPDATE | //поэтому проверяем, были ли уже восстановленные значения, |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:799 | UPDATE | //если были, то удаляем их их restoringDataDraft и помещаем в outdatingDataDraft |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:814 | REMOVE | //this.restoringDataDraft.addresses = []; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:816 | REMOVE | //  } |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:832 | UPDATE | //восстанавливаемые значения удаляем из outdatingDataDraft |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:842 | REMOVE | // &#124; keyof DeletingByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:883 | KEEP — invariant, hook explanation or navigation | // --- Save flows |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:910 | KEEP — product TODO | //TODO: institutes, coordinations |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1033 | UPDATE | //если введенные данные совпадают с outdatingDataDraft данными, |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1034 | UPDATE | //то добавляем их с согласия пользователя в restoringDataDraft |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1037 | KEEP — invariant, hook explanation or navigation | // Addresses |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1068 | KEEP — invariant, hook explanation or navigation | // Names |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1115 | KEEP — invariant, hook explanation or navigation | //Institutes |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1133 | KEEP — invariant, hook explanation or navigation | //Coordinations |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1153 | KEEP — invariant, hook explanation or navigation | //Contacts |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1179 | KEEP — invariant, hook explanation or navigation | //формируем окончательные варианты измененных, восстановленных, удаляемых и неактуальных значений |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1182–1185 | REMOVE | /*  this.deletingData = structuredClone(this.deletingDataDraft); //clone deleting data in case saving cancellation         const restoringData: RestoringByKind&lt;K&gt; = structuredClone(       this.restoringDataDraft,     ); … |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1187 | KEEP — invariant, hook explanation or navigation | // Addresses |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1225 | KEEP — invariant, hook explanation or navigation | // Names |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1268 | KEEP — invariant, hook explanation or navigation | // The planner keeps a form string; archival requests use the schema's object wrapper. |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1272 | KEEP — invariant, hook explanation or navigation | // Contacts |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1292 | KEEP — invariant, hook explanation or navigation | // Coordinations |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1314 | KEEP — invariant, hook explanation or navigation | // Institutes |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1347 | KEEP — invariant, hook explanation or navigation | //Main props |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1396 | REMOVE | // keep dialog open, could re-load owner data if needed |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1417 | UPDATE | // View-mode: set outdated data |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1421 | KEEP — invariant, hook explanation or navigation | // Pending mutations must not survive the edit session that produced them. |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1451 | REMOVE | //TODO: change? |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1456 | KEEP — invariant, hook explanation or navigation | // inline update to view state |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1474 | REMOVE | // this.existingOwner = this.data().object; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1483 | REMOVE | //this.setHasOutdatedHomes(); |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1534 | UPDATE | // badges (for template) |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1567 | UPDATE | //TODO: doI need these funcs? |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1654–1656 | REMOVE | /*  get coordinationsArray(): FormArray&lt;FormControl&lt;RelationPick &#124; string&gt;&gt; {     return new FormArray&lt;FormControl&lt;RelationPick &#124; string&gt;&gt;([]);   } */ |

## C. Other scoped TypeScript comments

Historical executable blocks are inactive. Product TODOs and contract-removal questions are retained/deferred rather than assumed solved. Section labels are low-priority navigation, not a mandate for mass comment deletion.

### src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 52–52 | KEEP — explanatory/navigation comment | // Confirmations can outlive their owner or be superseded by another save/edit context. |
| 73–73 | UPDATE | // Input data (as a signal from parent wrapper) |
| 76–76 | KEEP — explanatory/navigation comment | // Address filter state |
| 86–86 | UPDATE | // Outputs as signals (parent bridges them) |
| 93–93 | KEEP — explanatory/navigation comment | // Local UI state signals |
| 101–101 | KEEP — explanatory/navigation comment | // Reactive form |
| 105–105 | KEEP — explanatory/navigation comment | // Supported contact fields |
| 126–126 | KEEP — explanatory/navigation comment | // build form from config |
| 129–129 | KEEP — explanatory/navigation comment | // cache control names for quick loops |
| 131–131 | REMOVE — disabled implementation/debugging | //console.log('controlsNames ', this.controlsNames); |
| 133–133 | KEEP — explanatory/navigation comment | // init values by mode |
| 139–139 | KEEP — explanatory/navigation comment | // country form starts enabled |
| 142–142 | REMOVE — disabled implementation/debugging | // console.log('ngOnInit ', this.addressFilter()); |
| 145–145 | KEEP — explanatory/navigation comment | // Hook for specific components to implement |
| 148–148 | KEEP — explanatory/navigation comment | // Build reactive form from declarative controls config |
| 150–150 | REMOVE — disabled implementation/debugging | // console.log('controls', controls); |
| 176–176 | KEEP — explanatory/navigation comment | // To be implemented by concrete details |
| 179–179 | KEEP — explanatory/navigation comment | // Address changes from child filter |
| 184–184 | KEEP — explanatory/navigation comment | // validate minimal address depth by toponym type |
| 198–198 | KEEP — explanatory/navigation comment | // Switch to edit mode |
| 210–210 | REMOVE — disabled implementation/debugging | //console.log('onEditClick ', this.addressFilter()); |
| 213–213 | KEEP — explanatory/navigation comment | // Switch to view mode (with confirm if there are changes) |
| 245–245 | KEEP — explanatory/navigation comment | // Cancel dialog (with confirm if dirty or create mode) |
| 249–251 | REMOVE — disabled implementation/debugging | /*     console.log('this.changesSignal()', this.changesSignal());     console.log('this.deletingSignal()', this.deletingSignal());     console.log('this.data().operation'… |
| 286–286 | KEEP — explanatory/navigation comment | // Recalculate 'changes' + save-disabled |
| 288–288 | REMOVE — disabled implementation/debugging | // console.log('onChangeValidation'); |
| 294–298 | REMOVE — disabled implementation/debugging | /*  console.log(           'onChangeValidation',           controlName,           controlName in this.object!,         ); */ |
| 306–306 | REMOVE — disabled implementation/debugging | // console.log('newVal', controlName, newVal); |
| 307–307 | REMOVE — disabled implementation/debugging | // console.log('oldVal', controlName, oldVal); |
| 317–317 | REMOVE — disabled implementation/debugging | // let specific component add extra dirty rules (address filter, etc.) |
| 319–319 | REMOVE — disabled implementation/debugging | //   console.log('this.changesSignal()', this.changesSignal()); |
| 328–328 | KEEP — explanatory/navigation comment | // Extension point for domain-specific dirty checks |
| 333–333 | KEEP — explanatory/navigation comment | // View-mode: disable controls and sync address-filter child |
| 344–344 | KEEP — explanatory/navigation comment | // Enable/disable a set of controls; also flip address-filter validity flag |
| 350–350 | REMOVE — disabled implementation/debugging | // console.log('control', control); |
| 360–360 | KEEP — explanatory/navigation comment | // Fill controls from current object (special casing for password/nbsp) |
| 368–368 | REMOVE — disabled implementation/debugging | //console.log(controlName, this.object![controlName]); |

### src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 70–70 | KEEP — explanatory/navigation comment | // UI state signals (mirrored from child) |
| 72–72 | DEFER / retain product or contract question — see main report | //TODO: delete? |
| 76–76 | KEEP — explanatory/navigation comment | // pick component class from registry by type |
| 80–80 | KEEP — explanatory/navigation comment | // child injector so the nested component sees MAT_DIALOG_DATA / MatDialogRef |
| 92–92 | KEEP — explanatory/navigation comment | // choose title once (create/view) |
| 101–101 | KEEP — explanatory/navigation comment | // create details component dynamically into &lt;ng-template #container&gt; |
| 113–113 | KEEP — explanatory/navigation comment | // Bridge child signals → dialog signals |
| 115–115 | DEFER / retain product or contract question — see main report | //TODO: delete? |
| 131–131 | KEEP — explanatory/navigation comment | // Toolbar actions simply proxy to child |
| 145–145 | UPDATE | // Close dialog; map true → null name per current semantics |

### src/app/shared/base-list/base-list.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | // src/app/shared/base-list/base-list.component.ts |
| 88–88 | KEEP — explanatory/navigation comment | // DI |
| 97–97 | KEEP — explanatory/navigation comment | // Inputs |
| 106–106 | KEEP — explanatory/navigation comment | // Outputs |
| 123–123 | KEEP — explanatory/navigation comment | // UI state |
| 127–127 | KEEP — explanatory/navigation comment | // Permissions |
| 130–130 | KEEP — explanatory/navigation comment | // Filters state (signals) |
| 152–152 | KEEP — explanatory/navigation comment | // Derived DTO for API |
| 166–166 | KEEP — explanatory/navigation comment | // Human-readable summary for UI |
| 172–172 | KEEP — explanatory/navigation comment | // View option label |
| 185–185 | KEEP — explanatory/navigation comment | /* this.translate.instant('BASE_LIST.FROM_LABEL') + */ |
| 192–196 | REMOVE — disabled implementation/debugging | /*     const vo = ap.viewOption.map((v) =&gt;       this.translate.instant(         this.params().viewOptions.find((i) =&gt; i.id === v)!.name,       ),     ); */ |
| 200–200 | KEEP — explanatory/navigation comment | // GeneralFilter |
| 387–387 | KEEP — explanatory/navigation comment | // Address as a single string |
| 424–424 | REMOVE — disabled implementation/debugging | //prevViewOptionsValue: string[] = ['active']; |
| 427–427 | KEEP — explanatory/navigation comment | // Init address defaults from query params |
| 438–438 | REMOVE — disabled implementation/debugging | // this.showSpinner = (qp['countryId'] ? true : false); |
| 456–456 | KEEP — explanatory/navigation comment | // Query publication must not depend on reading the display summary. |
| 461–461 | KEEP — explanatory/navigation comment | // Pick permission set for the component type |
| 469–469 | REMOVE — disabled implementation/debugging | //debounceTime(250), // ← задержка (подбери 200–300мс) |
| 470–470 | REMOVE — disabled implementation/debugging | //distinctUntilChanged((a, b) =&gt; JSON.stringify(a) === JSON.stringify(b)), |
| 486–486 | REMOVE — disabled implementation/debugging | //debounceTime(250), // ← задержка (подбери 200–300мс) |
| 487–487 | REMOVE — disabled implementation/debugging | //distinctUntilChanged((a, b) =&gt; JSON.stringify(a) === JSON.stringify(b)), |
| 496–496 | KEEP — explanatory/navigation comment | // Columns selection passthrough |
| 505–505 | KEEP — explanatory/navigation comment | // Badges |
| 513–513 | KEEP — explanatory/navigation comment | // View option |
| 514–517 | KEEP — explanatory/navigation comment | /*   onChangeViewSelection(option: string): void {     this.selectedViewOptionId.set(option);   } */ |
| 519–519 | KEEP — explanatory/navigation comment | // Search |
| 532–532 | KEEP — explanatory/navigation comment | // Filter reset |

### src/app/shared/table/table.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | // src/app/pages/users-list/users-list.component.ts |
| 234–234 | KEEP — explanatory/navigation comment | // pagination |
| 240–240 | DEFER / retain product or contract question — see main report | // filters/sort TODO: добавить параметры фильтра для остальных сущностей |
| 258–263 | KEEP — explanatory/navigation comment | /*   If the BaseList provides an address filter → setDefaultAddrFilter first stores it in the signal,   then opens the addrGate. The first request will be sent with the p… |
| 274–274 | KEEP — explanatory/navigation comment | // keep copy to avoid accidental mutations |
| 354–354 | KEEP — explanatory/navigation comment | // React on any filter/sort param change |
| 366–366 | KEEP — explanatory/navigation comment | // switchMap finalizes the previous request before starting this one's loading. |
| 422–422 | KEEP — explanatory/navigation comment | // Safer template helpers (used in HTML) |
| 491–491 | KEEP — explanatory/navigation comment | // ========== child → parent bridge ========== |
| 497–497 | KEEP — explanatory/navigation comment | // ========== sort / page ========== |
| 502–502 | KEEP — explanatory/navigation comment | /** MatPaginator change handler: updates page index/size. */ |
| 505–505 | KEEP — explanatory/navigation comment | // when page size changes, return to first page |
| 517–517 | KEEP — explanatory/navigation comment | // ========== columns ========== |
| 522–522 | KEEP — explanatory/navigation comment | // ========== dialogs / CRUD ========== |
| 550–550 | KEEP — explanatory/navigation comment | // Late lookups may open UI only while they are the newest live card intent. |
| 634–634 | DEFER / retain product or contract question — see main report | //TODO: |

### src/app/shared/upload-file/upload-file.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 63–63 | KEEP — explanatory/navigation comment | // --- utils --- |
| 64–64 | KEEP — explanatory/navigation comment | // File reads may finish late; only the current live selection owns UI side effects. |
| 128–133 | KEEP — explanatory/navigation comment | /*         if (           schema &&           Object.keys(rows[0]).length &lt; Object.keys(schema).length         ) {           throw new CustomError('ERRORS.FILE.INVALID_ST… |
| 156–156 | REMOVE — disabled implementation/debugging | //this.fileName=''; |
| 157–157 | REMOVE — disabled implementation/debugging | //this.showSpinner.emit(false); |
| 165–184 | REMOVE — disabled implementation/debugging | /*   private saveData(rows: any[]) {     return this.addressService       .createListOfToponyms(rows, this.typeOfData())       .pipe(         finalize(() =&gt; this.showSpin… |

### src/app/shared/address-filter/address-filter.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 88–88 | KEEP — explanatory/navigation comment | // null for single-select, [] for multi-select |
| 92–92 | KEEP — explanatory/navigation comment | // --- lifecycle --- |
| 94–94 | KEEP — explanatory/navigation comment | // decide empty value by 'multiple' |
| 97–97 | KEEP — explanatory/navigation comment | // build controls |
| 106–106 | KEEP — explanatory/navigation comment | // initial load of countries |
| 115–115 | KEEP — explanatory/navigation comment | // preselect chain from defaults (if any) |
| 154–154 | KEEP — explanatory/navigation comment | // --- API for parent (card/list) --- |
| 165–165 | KEEP — explanatory/navigation comment | // enable all controls if not userCard |
| 231–231 | KEEP — explanatory/navigation comment | // view mode |
| 274–274 | KEEP — explanatory/navigation comment | // --- selection change handlers (public) --- |
| 338–338 | KEEP — explanatory/navigation comment | // map UI handlers for template indirection |
| 346–346 | KEEP — explanatory/navigation comment | // --- helpers --- |
| 347–347 | KEEP — explanatory/navigation comment | // One generation owns the whole chain; newer intent invalidates its responses and continuations. |
| 352–352 | KEEP — explanatory/navigation comment | /** Add form control with optional required and initial disabled state */ |
| 363–363 | KEEP — explanatory/navigation comment | /** Enable a chain of controls */ |
| 368–368 | KEEP — explanatory/navigation comment | /** Disable a chain of controls */ |
| 373–373 | KEEP — explanatory/navigation comment | /** Reset controls to empty value  */ |
| 380–380 | KEEP — explanatory/navigation comment | /** Set default value (single or multiple) by 'ToponymType' */ |
| 396–396 | KEEP — explanatory/navigation comment | /** Load next-level list based on current selection; enable/disable next control */ |
| 412–412 | KEEP — explanatory/navigation comment | // normalize selected ids to array |
| 461–461 | KEEP — explanatory/navigation comment | //only for ToponymsListComponent to reset table after creating, editing, deleting, uploading |
| 489–489 | KEEP — explanatory/navigation comment | /* fetchAndApplyToponyms */ |
| 495–495 | KEEP — explanatory/navigation comment | /** Build readable string from selected IDs */ |
| 512–512 | KEEP — explanatory/navigation comment | /** Emit full filter payload + decorations (badge, string, page reset) */ |
| 522–522 | KEEP — explanatory/navigation comment | // Emit main filter |
| 525–525 | KEEP — explanatory/navigation comment | // In lists we also emit badge/string + ask parent to reset page |
| 537–537 | KEEP — explanatory/navigation comment | // --- public API from template --- |
| 546–546 | KEEP — explanatory/navigation comment | // reload chain from empty country state |

### src/app/pages/home-details/home-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 95–97 | REMOVE — disabled implementation/debugging | /*   'postalAddressPart',       'postalName',       'postalCode', */ |
| 115–115 | KEEP — explanatory/navigation comment | //coordinations |
| 124–124 | REMOVE — disabled implementation/debugging | // nonNullable: true, |
| 144–144 | KEEP — explanatory/navigation comment | //postal address |
| 194–194 | UPDATE | // View-mode: disable institutes controls |
| 202–202 | UPDATE | // Edit-mode: enable institutes controls |
| 241–243 | REMOVE — disabled implementation/debugging | /*    protected override onChangeValidation() {     super.onChangeValidation();    } */ |
| 256–259 | REMOVE — disabled implementation/debugging | /*     let current = this.mainForm.get('coordinations')!.getRawValue() ?? [];     console.log('CURRENT',current)     if (current.length && current[0]) current = current.m… |
| 260–260 | KEEP — explanatory/navigation comment | // lengths differ -&gt; changed |
| 263–263 | KEEP — explanatory/navigation comment | // content differs -&gt; changed |
| 264–268 | REMOVE — disabled implementation/debugging | /*      console.log(           'JSON.stringify((original)) === JSON.stringify((current))',           JSON.stringify((original)),JSON.stringify((current)),           JSON.… |
| 291–320 | REMOVE — disabled implementation/debugging | /*   override async correctRestoringData() {     super.correctRestoringData();      // Addresses     if (this.restoringDataDraft.addresses?.length) {       const addresse… |
| 322–343 | REMOVE — disabled implementation/debugging | /*   override async checkOutdatedDataDuplicates() {     const address = await this.ownerDiffService.checkHomeAddress(       this.outdatedDataDraft.addresses,       this.o… |
| 371–371 | REMOVE — disabled implementation/debugging | // this.updateControlsValidity(this.controlsNames, true); |

### src/app/pages/senior-details/senior-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 61–61 | DEFER / retain product or contract question — see main report | //TODO: не удаляется интернат при создании |
| 110–110 | REMOVE — disabled implementation/debugging | //hasOutdatedNames.set(this.outdatedDataDraft.names.length &gt; 0); |
| 116–116 | KEEP — explanatory/navigation comment | //home |
| 128–128 | KEEP — explanatory/navigation comment | //spouse |
| 165–165 | DEFER / retain product or contract question — see main report | // TODO: проверить восстановление, есть ошибки |
| 198–225 | REMOVE — disabled implementation/debugging | /*   override updateAddressFilter(home: RelationPick &#124; null) {     this.mainForm.get('spouse')?.enable();     console.log('home', home);     if (home === null) {       //… |

### src/app/pages/volunteer-details/volunteer-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 97–97 | KEEP — explanatory/navigation comment | //institutes |
| 117–124 | REMOVE — disabled implementation/debugging | /*    const SUB = structuredClone(this.existingOwner!.subscriptions);     const SUBOWNER = structuredClone(this.existingOwner!.subscriptions);     console.log('mode', mod… |
| 125–125 | KEEP — explanatory/navigation comment | //subscription |
| 191–196 | KEEP — explanatory/navigation comment | /*     if (fa.length === 0) {       fa.at(0)?.patchValue({         instituteName: data.instituteName,         category: data.category,       });     } else { */ |
| 197–197 | KEEP — explanatory/navigation comment | //add new insts |
| 202–202 | REMOVE — orphan disabled syntax | /*     } */ |
| 207–232 | REMOVE — disabled implementation/debugging | /*   override async correctRestoringData() {     super.correctRestoringData();      // Addresses     if (this.restoringDataDraft.addresses?.length) {       const addresse… |
| 234–257 | REMOVE — disabled implementation/debugging | /*   override async checkOutdatedDataDuplicates() {     const address = await this.ownerService.checkAddress(       this.outdatedDataDraft.addresses,       this.ownerDraf… |
| 258–302 | REMOVE — disabled implementation/debugging | /*   override async checkAllChanges() {     const address = await this.ownerService.diffAddress(       this.existingOwner!,       this.ownerDraft,       this.restoringDat… |
| 326–329 | REMOVE — disabled implementation/debugging | /*   override get institutes(): Institute[] {     const list = this.existingOwner!.institutes;     return Array.isArray(list) ? list : [];   } */ |
| 333–335 | REMOVE — disabled implementation/debugging | /*     const idx = list.findIndex((s) =&gt; s.userId === this.user()!.id);     if (idx !== -1) list.splice(idx, 1);     return list;*/ |
| 401–401 | KEEP — explanatory/navigation comment | // View-mode: disable institutes controls |
| 409–409 | KEEP — explanatory/navigation comment | // Edit-mode: enable institutes controls |
| 442–442 | KEEP — explanatory/navigation comment | // lengths differ -&gt; changed |
| 445–445 | KEEP — explanatory/navigation comment | // content differs -&gt; changed |
| 485–485 | DEFER / retain product or contract question — see main report | //TODO: при открытии карточки созданной на руччком у орг-й не показывается категория |

### src/app/pages/partner-details/partner-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 102–102 | KEEP — explanatory/navigation comment | //coordinations |
| 111–111 | REMOVE — disabled implementation/debugging | //  nonNullable: true, |
| 193–193 | UPDATE | // View-mode: disable institutes controls |
| 201–201 | UPDATE | // Edit-mode: enable institutes controls |
| 240–240 | KEEP — explanatory/navigation comment | // lengths differ -&gt; changed |
| 243–243 | KEEP — explanatory/navigation comment | // content differs -&gt; changed |
| 244–248 | REMOVE — disabled implementation/debugging | /*      console.log(         'JSON.stringify((original)) === JSON.stringify((current))',         JSON.stringify((original)),JSON.stringify((current)),         JSON.string… |
| 279–279 | REMOVE — disabled implementation/debugging | //this.updateControlsValidity(this.controlsNames, true); |
| 283–298 | REMOVE — disabled implementation/debugging | /*     override async correctRestoringData() {     super.correctRestoringData();      // Addresses     if (this.restoringDataDraft.addresses?.length) {       const addres… |
| 300–313 | REMOVE — disabled implementation/debugging | /*     override async checkOutdatedDataDuplicates() {     const address = await this.ownerService.checkAddress(       this.outdatedDataDraft.addresses,       this.ownerDr… |
| 314–343 | REMOVE — disabled implementation/debugging | /*   override async checkAllChanges() {     const address = await this.ownerService.diffAddress(       this.existingOwner!,       this.ownerDraft,       this.restoringDat… |

### src/app/pages/user-details/user-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | // src/app/pages/user-details/user-details.component.ts |
| 28–36 | REMOVE — disabled implementation/debugging | /* import {   ContactType,   UserRestoringData,   UserOutdatedData,   UserDeletingData,   UserDraft,   UserChangingData,   UserOutdatingData, } from '../../interfaces/adv… |
| 180–180 | REMOVE — disabled implementation/debugging | // this.updateControlsValidity(this.controlsNames, true); |
| 184–184 | REMOVE — orphan history | // --- Compare draft vs restoring/outdated |
| 185–185 | REMOVE — orphan history | //проверяем не изменил ли пользователь восстановленные данные |
| 186–186 | REMOVE — orphan history | //если изменил, |
| 187–187 | REMOVE — orphan history | // то помещаем их в outdatingDataDraft и удаляем из restoringDataDraft |
| 189–213 | REMOVE — orphan history | /*   override async correctRestoringData() {     super.correctRestoringData();     // Addresses     if (this.restoringDataDraft.addresses?.length) {       const addresses… |
| 215–215 | REMOVE — orphan history | //если введенные данные совпадают с outdatingDataDraft данными, |
| 216–216 | REMOVE — orphan history | //то добавляем их с согласия пользователя в restoringDataDraft |
| 217–239 | REMOVE — orphan history | /*   override async checkOutdatedDataDuplicates() {     const address = await this.ownerService.checkAddress(       this.outdatedDataDraft.addresses,       this.ownerDraf… |
| 240–274 | REMOVE — orphan history | /*   override async checkAllChanges() {     const address = await this.ownerService.diffAddress(       this.existingOwner!,       this.ownerDraft,       this.restoringDat… |
| 276–278 | REMOVE — orphan history | /*   override hasOutdatedUserNames(): boolean {     return this.outdatedDataDraft.userNames.length &gt; 0;   } */ |

### src/app/pages/toponym-details/toponym-details.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 50–50 | KEEP — explanatory/navigation comment | // evaluate save button disabled state |
| 61–61 | KEEP — explanatory/navigation comment | // bridge spinner to parent |
| 67–67 | KEEP — explanatory/navigation comment | // extra "dirty" rules for this card (address filter diff vs defaults) |
| 83–83 | KEEP — explanatory/navigation comment | // pre-save: check uniqueness, then save |
| 99–99 | KEEP — explanatory/navigation comment | // if not duplicate → proceed to save |
| 103–103 | UPDATE | // duplicate: stop spinner; message is shown by msgWrapper in interceptor/elsewhere |
| 140–140 | KEEP — explanatory/navigation comment | // update local object and switch to view |

### src/app/services/owner-changes-planner.service.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 28–28 | KEEP — explanatory/navigation comment | // ----------------------------------------------------------------------------- |
| 29–29 | KEEP — explanatory/navigation comment | // Common contracts |
| 30–30 | KEEP — explanatory/navigation comment | // ----------------------------------------------------------------------------- |
| 63–63 | KEEP — explanatory/navigation comment | // ----------------------------------------------------------------------------- |
| 64–64 | KEEP — explanatory/navigation comment | // Helpers |
| 65–65 | KEEP — explanatory/navigation comment | // ----------------------------------------------------------------------------- |
| 139–139 | KEEP — explanatory/navigation comment | // ----------------------------------------------------------------------------- |
| 140–140 | KEEP — explanatory/navigation comment | // Service |
| 141–141 | KEEP — explanatory/navigation comment | // ----------------------------------------------------------------------------- |
| 147–147 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 148–148 | KEEP — explanatory/navigation comment | // Address (user/partner/volunteer) |
| 149–149 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 151–151 | KEEP — explanatory/navigation comment | /** Compare address; return changes + id to move into outdated (if any) */ |
| 213–213 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 214–214 | KEEP — explanatory/navigation comment | // Home address |
| 215–215 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 266–266 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 267–267 | KEEP — explanatory/navigation comment | // Names (Person) |
| 268–268 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 302–302 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 303–303 | KEEP — explanatory/navigation comment | // UserName / OfficialName |
| 304–304 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 351–351 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 352–352 | KEEP — explanatory/navigation comment | // Contacts (User/Partner/Volunteer) |
| 353–353 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 375–375 | KEEP — explanatory/navigation comment | // added |
| 388–388 | KEEP — explanatory/navigation comment | // removed |
| 416–416 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 417–417 | KEEP — explanatory/navigation comment | // Coordinations (Home/Partner) |
| 418–418 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 438–438 | KEEP — explanatory/navigation comment | // removals from current |
| 455–455 | KEEP — explanatory/navigation comment | // additions (draft -&gt; current/restoring) |
| 475–475 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 476–476 | KEEP — explanatory/navigation comment | // Institutes (Volunteer) |
| 477–477 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 498–498 | KEEP — explanatory/navigation comment | // removals from current |
| 515–515 | KEEP — explanatory/navigation comment | // additions from draft |
| 541–541 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 542–542 | KEEP — explanatory/navigation comment | // Subscriptions (Volunteer) — твоя модель: draftSubscriptions либо [userId], либо [] |
| 543–543 | KEEP — explanatory/navigation comment | // --------------------------------------------------------------------------- |
| 555–555 | KEEP — explanatory/navigation comment | // add |
| 560–560 | KEEP — explanatory/navigation comment | // remove |
| 567–567 | KEEP — explanatory/navigation comment | // subscriptions не outdate’им (по твоей логике) |

### src/app/services/owner-restoration-guard.service.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | // src/app/services/owner-restoration-guard.service.service.ts |
| 33–33 | KEEP — explanatory/navigation comment | // continue |
| 34–34 | KEEP — explanatory/navigation comment | // stop |
| 42–42 | KEEP — explanatory/navigation comment | // ========== Address ========== |
| 105–105 | KEEP — explanatory/navigation comment | // ========== Names ========== |
| 165–165 | KEEP — explanatory/navigation comment | // ========== Relations ========== |
| 215–215 | KEEP — explanatory/navigation comment | // ========== Contacts ========== |

### src/app/utils/owner-restoration-reconcile.util.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | KEEP — explanatory/navigation comment | /** Check if user changed restored values and correct them*/ |
| 135–162 | REMOVE — disabled implementation/debugging | /* function reconcileRestoringIds&lt;TOutdated extends { id: number }&gt;(   restoringIds: readonly number[],   outdating: readonly TOutdated[],   outdatedAll: readonly TOutdat… |
| 181–181 | KEEP — explanatory/navigation comment | // если запись пропала — просто выкинули id |
| 195–195 | KEEP — explanatory/navigation comment | // ========== Address ========== |
| 243–243 | KEEP — explanatory/navigation comment | // ========== Names ========== |
| 289–289 | KEEP — explanatory/navigation comment | // ========== Contacts ========== |
| 311–311 | KEEP — explanatory/navigation comment | // если у владельца вообще нет контактов этого типа — всё уходит в outdating |
| 337–337 | KEEP — explanatory/navigation comment | // ========== Relations ========== |
| 378–378 | KEEP — explanatory/navigation comment | // Match the candidate by its normalized name and numeric category ID. |

### src/app/utils/owner-ctrls.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | //src\app\utils\owner-ctrls.ts |
| 64–64 | KEEP — explanatory/navigation comment | // Pass a translator function instead of using TranslateService directly |
| 67–67 | KEEP — explanatory/navigation comment | /** Build HTML (string) for duplicates using provided translator */ |

### src/app/utils/owner-draft.builder.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 20–20 | KEEP — explanatory/navigation comment | // --- Helpers ----------------------------------------------------------------- |
| 55–68 | REMOVE — disabled implementation/debugging | /* function getContacts(form: FormGroup, contactTypes: NonTelegram[]) {   const draftContacts: Record&lt;NonTelegram, string[]&gt; = {} as Record&lt;     NonTelegram,     string[]… |
| 93–93 | KEEP — explanatory/navigation comment | // --- Per-kind config --------------------------------- |
| 194–194 | KEEP — explanatory/navigation comment | // --- Restriction config ------------------------------------------------------- |
| 232–232 | REMOVE — old builder alternative | // senior: (form, existing, now) =&gt; getRestParams(form, existing, now), |
| 239–239 | REMOVE — old builder alternative | // ? '${get(form, 'causeOfRestriction') ?? ''} CLOSE'.trim() |
| 261–261 | REMOVE — old builder alternative | // ? '${get(form, 'causeOfRestriction') ?? ''} GONE'.trim() |
| 279–279 | KEEP — explanatory/navigation comment | // --- Unified builder --------------------------------------------------------- |
| 290–290 | REMOVE — disabled implementation/debugging | // const rest = BUILD_RESTRICTED[kind](form, existing, now); |
| 310–311 | REMOVE — disabled implementation/debugging | /*   const draft: DraftByKind[K] = { ...base, ...extras };   return draft */ |

### src/app/shared/table-filter/table-filter.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | // src/app/shared/table-filter/table-filter.component.ts |
| 152–152 | KEEP — explanatory/navigation comment | // Inputs / Outputs |
| 169–169 | KEEP — explanatory/navigation comment | // UI state |
| 182–182 | KEEP — explanatory/navigation comment | // Data |
| 195–195 | KEEP — explanatory/navigation comment | // Reactive toggles |
| 238–238 | KEEP — explanatory/navigation comment | // Form |
| 314–314 | KEEP — explanatory/navigation comment | // Static data |
| 406–408 | REMOVE — disabled alternative | /* this.accessibleHomesList = res.filter(               (h) =&gt; h.isRestricted !== false,             ); */ |
| 479–490 | KEEP — explanatory/navigation comment | /*     this.form.valueChanges       .pipe(         startWith(this.form.getRawValue()), // чтобы отработало и на старте         debounceTime(150),         map(() =&gt; this.f… |
| 497–497 | KEEP — explanatory/navigation comment | // ← даст [prev, curr] |
| 510–510 | REMOVE — disabled implementation/debugging | // if (changes['viewOption']) this.upgradeActiveHomesList(); |
| 531–531 | REMOVE — disabled implementation/debugging | //const hasCoordination = this.form.controls.hasCoordination.value; |
| 680–680 | KEEP — explanatory/navigation comment | // Address filter child → parent |
| 695–695 | DEFER / retain product or contract question — see main report | //TODO: блокировать возможность взаимоискл. выбора: например выбрали координатора и 'без координации' |
| 697–697 | KEEP — explanatory/navigation comment | // Build/emit current filter state |
| 699–699 | REMOVE — disabled implementation/debugging | //keyof FilterForm['controls'], |
| 700–700 | REMOVE — disabled implementation/debugging | //keyof FilterForm['controls'], |
| 704–704 | REMOVE — disabled implementation/debugging | //const start = this.form.controls[startKey].value; |
| 705–705 | REMOVE — disabled implementation/debugging | //const end = this.form.controls[endKey].value; |
| 751–766 | REMOVE — disabled alternative | /*     if (this.lessThanTwoContactTypes()) {       this.form.controls.strongContactFilter.setValue(false, {         emitEvent: false,       });     }     if (this.lessTha… |
| 825–825 | KEEP — explanatory/navigation comment | // Count active filters |
| 840–842 | REMOVE — disabled alternative | /* filter.details.length &#124;&#124;       filter.hasCoordination === true &#124;&#124;       filter.hasCoordination === false */ |
| 864–864 | UPDATE | // Emit everything atomically |
| 928–928 | KEEP — explanatory/navigation comment | // Emit cleared state |

### src/app/shared/table-settings/table-settings.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | //src\app\shared\table-settings\table-settings.component.ts |
| 32–32 | KEEP — explanatory/navigation comment | // Select all at start |
| 35–35 | KEEP — explanatory/navigation comment | // Emit initial state |
| 39–39 | KEEP — explanatory/navigation comment | /** Selected count equals total count */ |
| 44–44 | KEEP — explanatory/navigation comment | /** Toggle all; always keep unchangeable rows selected */ |
| 55–55 | KEEP — explanatory/navigation comment | /** Toggle single row if it’s allowed */ |
| 68–68 | KEEP — explanatory/navigation comment | /** Emit selected column names in original order + badge count (kept as-is) */ |
| 76–76 | KEEP — explanatory/navigation comment | // Preserve existing business rule: selectedCount - totalCount |

### src/app/shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 8–11 | REMOVE — disabled implementation/debugging | /* export type RestoreDeletePayload&lt;T extends string = string&gt; = {   type: T;   id: number; }; */ |
| 20–22 | REMOVE — disabled implementation/debugging | /*   typeOfData = input.required&lt;T&gt;();   itemId = input.required&lt;number&gt;();  */ |

### src/app/shared/table/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts

| Lines | Classification | Summary |
| --- | --- | --- |
| 1–1 | REMOVE — filename label | // src/app/pages/users-list/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts |
| 52–52 | KEEP — explanatory/navigation comment | // Keep as non-nullable string; validator guards empties/length. |

## D. Unused import evidence

The bindings below have zero executable TypeScript identifier uses outside import declarations in their own module. Comments are excluded and component decorator imports count as code. Subclasses cannot consume an import local from another module; templates require an exposed component member. Optional noUnusedLocals diagnostics corroborate this inventory. Three further imports become orphaned only after removing the specific dead injections: ChangeDetectorRef, UploadFile AddressService and BaseList MatDialog; those are called out in the main report.

### src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| startWith | 36 | 0 | Low / high |

### src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| NonTelegram | 24 | 0 | Low / high |
| OptionalContacts | 74 | 0 | Low / high |
| UserContacts | 75 | 0 | Low / high |
| normalize | 114 | 0 | Low / high |
| BehaviorSubject | 131 | 0 | Low / high |
| shareReplay | 136 | 0 | Low / high |

### src/app/shared/base-list/base-list.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| typedKeys | 41 | 0 | Low / high |
| ContactType | 59 | 0 | Low / high |
| RelationPick | 59 | 0 | Low / high |
| debounceTime | 60 | 0 | Low / high |
| distinctUntilChanged | 60 | 0 | Low / high |

### src/app/shared/upload-file/upload-file.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| finalize | 15 | 0 | Low / high |
| takeUntilDestroyed | 16 | 0 | Low / high |

### src/app/shared/address-filter/address-filter.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| AddressKey | 33 | 0 | Low / high |

### src/app/pages/home-details/home-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| DateUtilsService | 39 | 0 | Low / high |
| combineLatest | 40 | 0 | Low / high |

### src/app/pages/senior-details/senior-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| DateUtilsService | 30 | 0 | Low / high |

### src/app/pages/volunteer-details/volunteer-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| Institute | 27 | 0 | Low / high |
| RelationPick | 32 | 0 | Low / high |
| DateUtilsService | 38 | 0 | Low / high |
| reconcileRestoredAddress | 47 | 0 | Low / high |
| reconcileRestoredInstitutes | 48 | 0 | Low / high |

### src/app/pages/partner-details/partner-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| DateUtilsService | 30 | 0 | Low / high |

### src/app/pages/user-details/user-details.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| DestroyRef | 2 | 0 | Low / high |
| signal | 2 | 0 | Low / high |
| DateUtilsService | 38 | 0 | Low / high |

### src/app/utils/owner-draft.builder.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| Home | 6 | 0 | Low / high |
| OwnerDraftByKind | 11 | 0 | Low / high |
| Partner | 12 | 0 | Low / high |
| Senior | 13 | 0 | Low / high |
| User | 14 | 0 | Low / high |
| Volunteer | 15 | 0 | Low / high |

### src/app/shared/table-filter/table-filter.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| distinctUntilChanged | 61 | 0 | Low / high |

### src/app/shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| EventEmitter | 1 | 0 | Low / high |

### src/app/shared/table/cause-of-blocking-dialog/cause-of-blocking-dialog.component.ts

| Binding | Declaration line | Executable references | Severity / confidence |
| --- | --- | --- | --- |
| OwnerMainService | 21 | 0 | Low / high |

## E. Dead-helper cross-check and deliberate keeps

Counts cover executable TS identifiers/literal bracket access and uncommented HTML throughout src/app, including tests. These counts are conservative textual-name references, not proof of semantic identity for common names. The main report separately resolves the two protected service fields and private injected dependencies. Lifecycle names are not candidates merely because Angular invokes them implicitly.

| Name | Declarations | Executable references | Active HTML hits | Disposition |
| --- | --- | --- | --- | --- |
| isPartnerContext | src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:444 | 0 | 0 | Candidate — no consumer; see main report |
| hasCoordinations | src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1546 | 0 | 0 | Candidate — no consumer; see main report |
| hasSubscriptions | src/app/pages/volunteer-details/volunteer-details.component.ts:344; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1551 | 0 | 0 | Candidate — no consumer; see main report |
| hasCooperations | src/app/pages/volunteer-details/volunteer-details.component.ts:347; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1554 | 0 | 0 | Candidate — no consumer; see main report |
| setHasOutdatedInstitutes | src/app/pages/volunteer-details/volunteer-details.component.ts:354; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1569 | 0 | 0 | Candidate — no consumer; see main report |
| setHasOutdatedSubs | src/app/pages/volunteer-details/volunteer-details.component.ts:359; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1570 | 0 | 0 | Candidate — no consumer; see main report |
| setHasOutdatedCoops | src/app/pages/volunteer-details/volunteer-details.component.ts:362; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1571 | 0 | 0 | Candidate — no consumer; see main report |
| getRowSpanForHomes | src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1584 | 0 | 0 | Candidate — no consumer; see main report |
| getRowSpanForPartners | src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1587 | 0 | 0 | Candidate — no consumer; see main report |
| resetRequested | src/app/shared/upload-file/upload-file.component.ts:53 | 0 | 0 | Candidate — no consumer; see main report |
| hasRole | src/app/pages/user-details/user-details.component.ts:296; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1540 | 0 | 1 | KEEP — framework/eager effect/live hook or product handler |
| hasInstitutes | src/app/pages/volunteer-details/volunteer-details.component.ts:350; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1557 | 0 | 1 | KEEP — framework/eager effect/live hook or product handler |
| getPostalAddress | src/app/pages/home-details/home-details.component.ts:375; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1597 | 1 | 1 | KEEP — framework/eager effect/live hook or product handler |
| updateAddressFilter | src/app/pages/senior-details/senior-details.component.ts:176; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1640 | 0 | 1 | KEEP — framework/eager effect/live hook or product handler |
| setHasOutdatedNames | src/app/pages/partner-details/partner-details.component.ts:185; src/app/pages/senior-details/senior-details.component.ts:172; src/app/pages/user-details/user-details.component.ts:302; src/app/pages/volunteer-details/volunteer-details.component.ts:475; src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1572 | 2 | 0 | KEEP — framework/eager effect/live hook or product handler |
| onShowHomesSeniorsClick | src/app/shared/table/table.component.ts:643 | 0 | 1 | KEEP — framework/eager effect/live hook or product handler |
| ngOnChanges | src/app/shared/table/table.component.ts:397; src/app/shared/table-filter/table-filter.component.ts:509 | 0 | 0 | KEEP — framework/eager effect/live hook or product handler |
| ngAfterViewInit | src/app/pages/toponyms-lists/toponyms-list/toponyms-list.component.ts:276; src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.ts:100 | 0 | 0 | KEEP — framework/eager effect/live hook or product handler |
| strongAddressFilterControl | src/app/shared/table-filter/table-filter.component.ts:196 | 0 | 0 | KEEP — framework/eager effect/live hook or product handler |
| strongContactFilterControl | src/app/shared/table-filter/table-filter.component.ts:210 | 0 | 0 | KEEP — framework/eager effect/live hook or product handler |
| strongDetailFilterControl | src/app/shared/table-filter/table-filter.component.ts:223 | 0 | 0 | KEEP — framework/eager effect/live hook or product handler |

## F. All broad any type nodes

No comment-only any is included. Each active location is typing debt or a framework/form boundary, not a deletion instruction. All remain outside the proposed active-typing cleanup.

| Location | Context | Classification |
| --- | --- | --- |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:539 | any[] | Avoidable validator-array typing |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:813 | any[] | Dynamic history/generic-index limitation |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:854 | this.deletingDataDraft as any | Dynamic history/generic-index limitation |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:856 | this.deletingDataDraft as any | Dynamic history/generic-index limitation |
| src/app/shared/table/table.component.ts:278 | x: any | Recursive/query typing debt |
| src/app/shared/table/table.component.ts:278 | (x: any): any =&gt; {       if (x instanceof Date) return x.toISOString();       if (Array.isArray(x)) return x.map(normalize);       if (x && typeof x === 'object… | Recursive/query typing debt |
| src/app/shared/table/table.component.ts:404 | filter: any | Recursive/query typing debt |
| src/app/shared/upload-file/upload-file.component.ts:54 | any[] | Spreadsheet row boundary |
| src/app/shared/upload-file/upload-file.component.ts:79 | err as any | Avoidable local error typing |
| src/app/shared/address-filter/address-filter.component.ts:289 | Observable&lt;any&gt; | Heterogeneous async lookup typing |
| src/app/shared/address-filter/address-filter.component.ts:303 | Observable&lt;any&gt; | Heterogeneous async lookup typing |
| src/app/shared/address-filter/address-filter.component.ts:317 | Observable&lt;any&gt; | Heterogeneous async lookup typing |
| src/app/shared/address-filter/address-filter.component.ts:331 | Observable&lt;any&gt; | Heterogeneous async lookup typing |
| src/app/shared/address-filter/address-filter.component.ts:402 | Observable&lt;any&gt; | Heterogeneous async lookup typing |
| src/app/shared/address-filter/address-filter.component.ts:434 | Observable&lt;any&gt; | Heterogeneous async lookup typing |
| src/app/pages/toponym-details/toponym-details.component.ts:69 | Record&lt;string, any&gt; | Avoidable dynamic lookup typing |
| src/app/services/owner-changes-planner.service.ts:177 | existing.outdatedData.addresses.find(           (a) =&gt; a.id === restoringId,         ) as any | Weak restoring-address domain shape |
| src/app/services/owner-changes-planner.service.ts:372 | draft as any | Draft enumeration typing |
| src/app/shared/table-filter/table-filter.component.ts:706 | d: any | Dynamic-form typing |
| src/app/shared/table-filter/table-filter.component.ts:916 | {       roles: [],       affiliations: [],       categories: [],       contactTypes: [],       startBeginningDate: null,       endBeginningDate: null,       sta… | Dynamic-form typing |

## G. Assertion inventory

All 86 assertion AST nodes are listed, including both nodes of a double cast. The main report distinguishes dynamic-form and generic-owner limitations from framework boundaries. No active assertion rewrite is proposed in the deletion-only batch.

| Location | Asserted type | Expression excerpt |
| --- | --- | --- |
| src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts:173 | FormArray | this.mainForm.get(name) as FormArray |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:210 | OwnerMainService&lt;     User,     UserDraft,     UserChangingData,     UserRestoringData,     UserOutd… | inject(UserService) as OwnerMainService&lt;     User,     UserDraft,     UserChangingData,     UserRestoringData,     UserOutdatingData,     UserDeleting… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:220 | OwnerMainService&lt;     Partner,     PartnerDraft,     PartnerChangingData,     PartnerRestoringData, … | inject(     PartnerService,   ) as OwnerMainService&lt;     Partner,     PartnerDraft,     PartnerChangingData,     PartnerRestoringData,     PartnerOutd… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:232 | OwnerMainService&lt;     Volunteer,     VolunteerDraft,     VolunteerChangingData,     VolunteerRestori… | inject(     VolunteerService,   ) as OwnerMainService&lt;     Volunteer,     VolunteerDraft,     VolunteerChangingData,     VolunteerRestoringData,     V… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:244 | OwnerMainService&lt;     Home,     HomeDraft,     HomeChangingData,     HomeRestoringData,     HomeOutd… | inject(HomeService) as OwnerMainService&lt;     Home,     HomeDraft,     HomeChangingData,     HomeRestoringData,     HomeOutdatingData,     HomeDeleting… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:254 | OwnerMainService&lt;     Senior,     SeniorDraft,     SeniorChangingData,     SeniorRestoringData,     … | inject(SeniorService) as OwnerMainService&lt;     Senior,     SeniorDraft,     SeniorChangingData,     SeniorRestoringData,     SeniorOutdatingData,     … |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:283 | OwnerMainService&lt;       OwnerByKind&lt;K&gt;,       OwnerDraftByKind&lt;K&gt;,       ChangingByKind&lt;K&gt;,       Re… | svc as OwnerMainService&lt;       OwnerByKind&lt;K&gt;,       OwnerDraftByKind&lt;K&gt;,       ChangingByKind&lt;K&gt;,       RestoringByKind&lt;K&gt;,       OutdatingByKind&lt;K&gt;,… |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:370 | K | this.data().componentType as K |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:372 | OutdatedByKind&lt;K&gt; | structuredClone(         this.existingOwner!.outdatedData,       ) as OutdatedByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:639 | OwnerContacts | this.existingOwner![         'orderedContacts'       ] as OwnerContacts |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:666 | OwnerContacts | this.existingOwner![         'orderedContacts'       ] as OwnerContacts |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:741 | keyof OutdatedByKind&lt;K&gt; | 'names' as unknown as keyof OutdatedByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:741 | unknown | 'names' as unknown |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:786 | FormArray | this.mainForm.get(contactType!) as FormArray |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:813 | any[] | this.outdatedDataDraft.addresses as any[] |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:834 | keyof OutdatedByKind&lt;K&gt; | type as unknown as keyof OutdatedByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:834 | unknown | type as unknown |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:854 | number[] &#124; null | (this.deletingDataDraft as any)[type] as number[] &#124; null |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:854 | any | this.deletingDataDraft as any |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:856 | any | this.deletingDataDraft as any |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:859 | keyof OutdatedByKind&lt;K&gt; | type as keyof OutdatedByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:906 | Record&lt;       Exclude&lt;ContactType, 'telegram'&gt;,       string[]     &gt; | {} as Record&lt;       Exclude&lt;ContactType, 'telegram'&gt;,       string[]     &gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1350 | Record&lt;string, unknown&gt; | this.existingOwner as Record&lt;string, unknown&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1351 | Record&lt;string, unknown&gt; | this.ownerDraft as Record&lt;string, unknown&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1352 | string | key as string |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1352 | string | key as string |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1354 | NonNullable&lt;             ChangingByKind&lt;K&gt;['main']           &gt; &#124; null | this.changingData.main as NonNullable&lt;             ChangingByKind&lt;K&gt;['main']           &gt; &#124; null |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1356 | NonNullable&lt;ChangingByKind&lt;K&gt;['main']&gt; | {} as NonNullable&lt;ChangingByKind&lt;K&gt;['main']&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1358 | NonNullable&lt;ChangingByKind&lt;K&gt;['main']&gt; | {           ...currentMain,           [key]: draft[key as string],         } as NonNullable&lt;ChangingByKind&lt;K&gt;['main']&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1360 | string | key as string |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1424 | OutdatedByKind&lt;K&gt; | structuredClone(       this.existingOwner!.outdatedData,     ) as OutdatedByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1476 | OutdatedByKind&lt;K&gt; | structuredClone(               this.existingOwner!.outdatedData,             ) as OutdatedByKind&lt;K&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1605 | FormArray&lt;       FormControl&lt;RelationPick &#124; null&gt;     &gt; | this.mainForm.get('coordinations') as FormArray&lt;       FormControl&lt;RelationPick &#124; null&gt;     &gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1617 | FormControl&lt;RelationPick &#124; null&gt; | this.mainForm.get('nursingHome') as FormControl&lt;RelationPick &#124; null&gt; |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts:1621 | FormControl&lt;RelationPick &#124; null&gt; | this.mainForm.get('spouse') as FormControl&lt;RelationPick &#124; null&gt; |
| src/app/shared/base-list/base-list.component.ts:521 | HTMLInputElement | event.target as HTMLInputElement |
| src/app/shared/table/table.component.ts:178 | OwnerMainService&lt;     User,     UserDraft,     UserChangingData,     UserRestoringData,     UserOutd… | inject(UserService) as OwnerMainService&lt;     User,     UserDraft,     UserChangingData,     UserRestoringData,     UserOutdatingData,     UserDeleting… |
| src/app/shared/table/table.component.ts:188 | PartnerMainService | inject(     PartnerService,   ) as PartnerMainService |
| src/app/shared/table/table.component.ts:192 | VolunteerMainService | inject(     VolunteerService,   ) as VolunteerMainService |
| src/app/shared/table/table.component.ts:196 | HomeMainService | inject(HomeService) as HomeMainService |
| src/app/shared/table/table.component.ts:198 | SeniorMainService | inject(SeniorService) as SeniorMainService |
| src/app/shared/table/table.component.ts:216 | const | {     disableClose: true,     minWidth: '800px',     height: '80%',     autoFocus: 'dialog',     restoreFocus: true,   } as const |
| src/app/shared/table/table.component.ts:289 | Record&lt;string, unknown&gt; | {} as Record&lt;string, unknown&gt; |
| src/app/shared/table/table.component.ts:329 | OwnerMainService&lt;       OwnerByKind&lt;K&gt;,       OwnerDraftByKind&lt;K&gt;,       ChangingByKind&lt;K&gt;,       Re… | svc as OwnerMainService&lt;       OwnerByKind&lt;K&gt;,       OwnerDraftByKind&lt;K&gt;,       ChangingByKind&lt;K&gt;,       RestoringByKind&lt;K&gt;,       OutdatingByKind&lt;K&gt;,… |
| src/app/shared/table/table.component.ts:368 | K | kind as K |
| src/app/shared/table/table.component.ts:378 | OwnerByKind&lt;K&gt;[] | list as OwnerByKind&lt;K&gt;[] |
| src/app/shared/table/table.component.ts:380 | OwnerByKind&lt;K&gt;[] | list as OwnerByKind&lt;K&gt;[] |
| src/app/shared/table/table.component.ts:393 | PermissionSet&lt;TableComponentType&gt; | PERMISSIONS_COMPONENT_REGISTRY[       this.kind()     ] as PermissionSet&lt;TableComponentType&gt; |
| src/app/shared/table/table.component.ts:572 | 'none' &#124; 'view-mode' &#124; undefined | 'view-mode' as 'none' &#124; 'view-mode' &#124; undefined |
| src/app/shared/table/table.component.ts:777 | (               value: typeof row,               translate: TranslateService,               dateUtil… | COLUMNS[column].fieldValue as (               value: typeof row,               translate: TranslateService,               dateUtils: DateUtilsService,… |
| src/app/shared/table/table.component.ts:790 | keyof typeof COLUMNS | item as keyof typeof COLUMNS |
| src/app/shared/upload-file/upload-file.component.ts:79 | any | err as any |
| src/app/shared/upload-file/upload-file.component.ts:97 | HTMLInputElement | event.target as HTMLInputElement |
| src/app/shared/address-filter/address-filter.component.ts:414 | number[] | ctrl.value as number[] |
| src/app/shared/address-filter/address-filter.component.ts:416 | number | ctrl.value as number |
| src/app/shared/address-filter/address-filter.component.ts:420 | keyof ToponymListMap | '${typeOfList}List' as keyof ToponymListMap |
| src/app/shared/address-filter/address-filter.component.ts:438 | keyof ToponymListMap | '${typeOfList}List' as keyof ToponymListMap |
| src/app/shared/address-filter/address-filter.component.ts:514 | AddressFilter | Object.fromEntries(       fields.map((field) =&gt; {         const value = this.form.controls[controlMap[field]].value;         const values = this.param… |
| src/app/pages/home-details/home-details.component.ts:74 | HomeMainService | inject(HomeService) as HomeMainService |
| src/app/pages/home-details/home-details.component.ts:75 | PartnerMainService | inject(PartnerService) as PartnerMainService |
| src/app/pages/home-details/home-details.component.ts:209 | FormArray&lt;       FormControl&lt;RelationPick &#124; null&gt;     &gt; &#124; null | this.mainForm.get('coordinations') as FormArray&lt;       FormControl&lt;RelationPick &#124; null&gt;     &gt; &#124; null |
| src/app/pages/home-details/home-details.component.ts:348 | FormArray | this.mainForm.get('coordinations') as FormArray |
| src/app/pages/senior-details/senior-details.component.ts:63 | SeniorMainService | inject(SeniorService) as SeniorMainService |
| src/app/pages/senior-details/senior-details.component.ts:64 | HomeMainService | inject(HomeService) as HomeMainService |
| src/app/pages/volunteer-details/volunteer-details.component.ts:79 | VolunteerMainService | inject(VolunteerService) as VolunteerMainService |
| src/app/pages/volunteer-details/volunteer-details.component.ts:190 | FormArray | this.mainForm.get('institutes') as FormArray |
| src/app/pages/volunteer-details/volunteer-details.component.ts:385 | FormArray&lt;InstituteFormGroup&gt; &#124; null | this.mainForm.get(       'institutes',     ) as FormArray&lt;InstituteFormGroup&gt; &#124; null |
| src/app/pages/volunteer-details/volunteer-details.component.ts:416 | FormArray&lt;InstituteFormGroup&gt; &#124; null | this.mainForm.get(       'institutes',     ) as FormArray&lt;InstituteFormGroup&gt; &#124; null |
| src/app/pages/partner-details/partner-details.component.ts:72 | PartnerMainService | inject(PartnerService) as PartnerMainService |
| src/app/pages/partner-details/partner-details.component.ts:73 | HomeMainService | inject(HomeService) as HomeMainService |
| src/app/pages/partner-details/partner-details.component.ts:208 | FormArray&lt;       FormControl&lt;RelationPick &#124; null&gt;     &gt; &#124; null | this.mainForm.get('coordinations') as FormArray&lt;       FormControl&lt;RelationPick &#124; null&gt;     &gt; &#124; null |
| src/app/pages/partner-details/partner-details.component.ts:256 | FormArray | this.mainForm.get('coordinations') as FormArray |
| src/app/pages/user-details/user-details.component.ts:68 | UserMainService | inject(UserService) as UserMainService |
| src/app/pages/toponym-details/toponym-details.component.ts:130 | ToponymFormControlsValues | this.mainForm.value as ToponymFormControlsValues |
| src/app/services/owner-changes-planner.service.ts:175 | any | existing.outdatedData.addresses.find(           (a) =&gt; a.id === restoringId,         ) as any |
| src/app/services/owner-changes-planner.service.ts:372 | any | draft as any |
| src/app/utils/owner-restoration-reconcile.util.ts:303 | [     NonTelegram,     Contact[],   ][] | Object.entries(restoring) as [     NonTelegram,     Contact[],   ][] |
| src/app/utils/owner-draft.builder.ts:71 | Record&lt;NonTelegram, string[]&gt; | {} as Record&lt;NonTelegram, string[]&gt; |
| src/app/utils/owner-draft.builder.ts:75 | { getRawValue?: () =&gt; unknown } | ctrl as { getRawValue?: () =&gt; unknown } |
| src/app/utils/owner-draft.builder.ts:90 | ConfOwnerDraftByKind[K] | { ...base, ...extras } as ConfOwnerDraftByKind[K] |
| src/app/utils/owner-draft.builder.ts:218 | string &#124; null | get(form, 'causeOfRestriction') as string &#124; null |
| src/app/utils/owner-draft.builder.ts:244 | string &#124; null | get(form, 'causeOfRestriction') as string &#124; null |
| src/app/utils/owner-draft.builder.ts:266 | string &#124; null | get(form, 'causeOfRestriction') as string &#124; null |
| src/app/shared/table-filter/table-filter.component.ts:315 | const | [     { type: 'email', label: 'NAV.FILTER.EMAIL_OPT' },     { type: 'phoneNumber', label: 'NAV.FILTER.PHONE_NUMBER_OPT' },     { type: 'telegramId', l… |
| src/app/shared/table-filter/table-filter.component.ts:876 | any | {       roles: [],       affiliations: [],       categories: [],       contactTypes: [],       startBeginningDate: null,       endBeginningDate: null,… |
| src/app/shared/table-settings/table-settings.component.ts:22 | const | ['select', 'columnName'] as const |

## H. Non-null expression inventory

114 expression assertions are grouped below; definite-assignment fields such as ViewChild declarations are separate lifecycle declarations. These sites depend on configured forms/view/edit context. Audit did not demonstrate a new null-dereference defect and does not propose blanket removal.

| File | Count | Source lines | Representative expressions |
| --- | --- | --- | --- |
| src/app/shared/dialogs/details-dialogs/base-details/base-details.component.ts | 6 | 127, 235, 302, 305, 366, 367 | this.data().controlsDisable!; this.data().defaultAddressParams!; this.object! |
| src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts | 42 | 373, 379, 488, 638, 639, 654, 665, 666, 716, 720, 721, 782, 783, 786, 790, 803, 807, 808, 869, 873, 895, 1027, 1192, 1196, 1210, 1214, 1229, 1244, 1259, 1277, 1298, 1301, 1318, 1321, 1335, 1337, 1425, 1438, 1477, 1502, 1515 | this.existingOwner!; this.data().mainContactsValidator!; this.restoringDataDraft.names!; contactType!; this.restoringDataDraft.contacts[contactType!]! |
| src/app/pages/home-details/home-details.component.ts | 13 | 117, 139, 145, 233, 235, 237, 246, 249, 275, 279, 352, 366, 376 | this.existingOwner!; v.partnerName!; this.mainForm       .get('coordinations')!; this.restoringDataDraft['officialNames']!; data.partnerName! |
| src/app/pages/senior-details/senior-details.component.ts | 12 | 118, 120, 122, 123, 124, 125, 126, 129, 131, 132, 193, 194 | this.existingOwner!; this.mainForm.get('spouse')! |
| src/app/pages/volunteer-details/volunteer-details.component.ts | 7 | 99, 128, 134, 135, 439, 440, 465 | this.existingOwner!; this.user()!; this.mainForm.get('institutes')!; this.mainForm.get('subscription')! |
| src/app/pages/partner-details/partner-details.component.ts | 9 | 104, 126, 230, 233, 260, 274 | this.existingOwner!; v.homeName!; v.regionName!; this.mainForm       .get('coordinations')!; data.homeName! |
| src/app/pages/user-details/user-details.component.ts | 3 | 133, 168, 170 | this.existingOwner!; this.restoringDataDraft['userNames']! |
| src/app/pages/toponym-details/toponym-details.component.ts | 12 | 72, 74, 85, 86, 94, 123, 124, 129, 132, 143 | this.data().addressFilterControls!; this.data().defaultAddressParams!; this.mainForm.controls[this.data().checkingName!].value!; this.data().checkingName!; this.data().toponymType! |
| src/app/services/owner-changes-planner.service.ts | 1 | 385 | changes[type]! |
| src/app/services/owner-restoration-guard.service.ts | 4 | 174, 180 | old.partnerId!; old.homeId!; m.partnerName!; m.homeName! |
| src/app/utils/owner-draft.builder.ts | 3 | 24, 27, 32 | form.get('institutes')!; form.get(ctrlName)! |
| src/app/shared/table-filter/table-filter.component.ts | 2 | 580, 585 | h.regionId! |

## I. Template and CSS comment inventory

Only resource comments containing disabled executable markup/style declarations are cleanup candidates. Product TODOs and explanatory labels remain. No active CSS rule is declared dead solely from its name or use of ng-deep.

### src/app/shared/address-filter/address-filter.component.css

| Lines | Classification | Summary |
| --- | --- | --- |
| 14–20 | REMOVE — disabled markup/style |  .mat-grid-tile-content {   width: 100%;  } .mat-grid-tile {   display: block; }  |

### src/app/shared/base-list/base-list.component.css

| Lines | Classification | Summary |
| --- | --- | --- |
| 7–7 | REMOVE — disabled markup/style |    justify-content: center;  |
| 108–108 | KEEP — label/explanation |  spinner overlay  |

### src/app/shared/base-list/base-list.component.html

| Lines | Classification | Summary |
| --- | --- | --- |
| 2–2 | KEEP — label/explanation |  Columns Setting  |
| 12–12 | KEEP — label/explanation |  Filters - open navbar |
| 38–38 | KEEP — label/explanation |  Menu  |
| 42–42 | KEEP — label/explanation |  Add Item  |
| 51–51 | KEEP — label/explanation |  Set Filter  |
| 60–60 | KEEP — label/explanation |  Reset Filter  |
| 69–69 | KEEP — label/explanation |  Download Table  |
| 78–78 | KEEP — label/explanation |  Set Columns - open navbar  |
| 93–93 | KEEP — label/explanation |  Home status setting  |
| 109–109 | KEEP — label/explanation |  Status setting  |
| 118–121 | REMOVE — disabled markup/style |                  &lt;mat-checkbox [formControl]="includeInactiveHomesCtrl"&gt;                   {{'BASE_LIST.INCLUDE_INACTIVE_HOMES' &#124; translate}}&lt;/mat-che… |
| 125–125 | KEEP — label/explanation |  Search  |
| 144–144 | KEEP — label/explanation |  Applied Filters  |
| 150–150 | KEEP — label/explanation |  Exact Match For Search Values  |
| 157–157 | KEEP — label/explanation |  Optional possibility to include outdated data  |
| 165–165 | KEEP — label/explanation |  Table  |

### src/app/shared/dialogs/details-dialogs/advanced-details/owner-details.component.css

| Lines | Classification | Summary |
| --- | --- | --- |
| 5–7 | REMOVE — disabled markup/style |   .extra {   width: 80%; }  |
| 11–15 | REMOVE — disabled markup/style |  .fixed-labels {   position: fixed; }   |
| 54–61 | REMOVE — disabled markup/style |   .mat-mdc-fab {   background-color: 	#75bf41aa !important; }  .mat-mdc-fab-base[disabled], .mat-mdc-fab-base.mat-mdc-button-disabled {   background-c… |
| 67–76 | REMOVE — disabled markup/style |  .outdated-data {   color: #7d7d7d;   font-style: italic;   font-size: 0.9em;   display: block;   margin-left: 10px;   text-align: left;   width: 100%… |
| 95–95 | REMOVE — disabled markup/style |    text-align: left;  |
| 97–97 | REMOVE — disabled markup/style |  flex: 1;     |
| 103–108 | REMOVE — disabled markup/style | .tile-inner {   width: 100%;   display: block;   align-items: flex-start;   margin-top: 20px;    text-align: left;  |
| 108–108 | KEEP — label/explanation |  важно: текст внутри будет слева  |
| 110–112 | REMOVE — disabled markup/style |  .outdated-data-container {   height: auto !important; min-height: 76px; }  |
| 114–118 | REMOVE — disabled markup/style |  ::ng-deep mat-grid-list .mat-grid-tile { height: auto !important; min-height: 76px; } ::ng-deep mat-grid-list .mat-grid-tile .mat-grid-tile-content {… |

### src/app/shared/dialogs/details-dialogs/advanced-details/owner-details.component.html

| Lines | Classification | Summary |
| --- | --- | --- |
| 4–4 | KEEP — label/explanation |  Main Data  |
| 8–8 | KEEP — label/explanation |  Subscription  |
| 61–61 | KEEP — label/explanation |  password  |
| 82–82 | KEEP — label/explanation |  role / affiliation  |
| 111–111 | KEEP — label/explanation |  noAddress specialHome acceptableForSchool  |
| 125–126 | REMOVE — disabled markup/style |           &lt;mat-slide-toggle [formControlName]="control.controlName" class="small-toggle"&gt;{{control.label &#124; translate}}           &lt;/mat-slide-toggle&gt;  |
| 148–148 | KEEP — label/explanation | dateOfLastUpdate |
| 149–149 | KEEP / product triage |     TODO: all list+edit+new  |
| 157–157 | KEEP — label/explanation |  Blocking  |
| 176–176 | KEEP — label/explanation |  Close  |
| 204–204 | KEEP — label/explanation |  Address  |
| 208–208 | KEEP — label/explanation |  Home/Address  |
| 220–220 | KEEP — label/explanation |     @else { {{'TABLE.HOME_CATEGORIES.WITH_ADDRESS' &#124; translate}} }  |
| 236–236 | KEEP — label/explanation |  PostalAddress  |
| 264–264 | KEEP — label/explanation |  Contacts  |
| 294–294 | KEEP — label/explanation |  Extra Contacts Button |
| 309–309 | KEEP — label/explanation |  Coordinations -- |
| 347–347 | KEEP — label/explanation |  Institutes -- |
| 394–395 | REMOVE — disabled markup/style |        &lt;mat-grid-list cols="6" gutterSize="16px" rowHeight="76px"&gt;  |
| 408–408 | KEEP — label/explanation |  Senior Details  |
| 445–445 | KEEP — label/explanation |  Outdated Data  |
| 449–449 | KEEP — label/explanation |  Outdated Names  |
| 451–451 | KEEP — label/explanation |    style="background-color: rgb(224, 241, 227);"  |
| 470–470 | KEEP — label/explanation |  Outdated UserNames  |
| 488–488 | KEEP — label/explanation |  Outdated Official Names  |
| 506–506 | KEEP — label/explanation |  Outdated Addresses  |
| 532–532 | KEEP — label/explanation |  Outdated Contacts  |
| 558–558 | KEEP — label/explanation |  Outdated Coordinations  |
| 584–584 | KEEP — label/explanation |  Outdated Subs and Coops  |
| 619–619 | KEEP — label/explanation |  Outdated Institutes  |

### src/app/shared/dialogs/details-dialogs/details-dialog/details-dialog.component.css

| Lines | Classification | Summary |
| --- | --- | --- |
| 12–12 | KEEP — label/explanation |  spinner overlay  |
| 18–18 | REMOVE — disabled markup/style |  place-items: center;  |

### src/app/shared/table-filter/table-filter.component.html

| Lines | Classification | Summary |
| --- | --- | --- |
| 5–5 | KEEP — label/explanation |  Address  |
| 27–27 | KEEP — label/explanation |  Role  |
| 53–53 | KEEP — label/explanation |  Affiliation  |
| 79–79 | KEEP — label/explanation |  Institute category  |
| 106–106 | KEEP — label/explanation |  Homes  |
| 150–150 | KEEP — label/explanation |  Birthday  |
| 174–174 | REMOVE — disabled markup/style |            &lt;mat-option&gt;&lt;/mat-option&gt;  |
| 183–183 | REMOVE — disabled markup/style |     &lt;mat-option&gt;&lt;/mat-option&gt;  |
| 202–202 | KEEP — label/explanation |  Gender  |
| 226–226 | KEEP — label/explanation |  Home regions  |
| 227–251 | REMOVE — disabled markup/style |      @if(source() === 'partnerList' ){     &lt;p-fieldset class="fieldset" [toggleable]="true" [collapsed]="true"&gt;       &lt;ng-template #header&gt;         &lt;d… |
| 253–253 | KEEP — label/explanation |  Peculiarities  |
| 292–307 | REMOVE — disabled markup/style |        &lt;p class="m-0"&gt;         &lt;mat-chip-listbox [multiple]="false" formControlName="isClosed" class="mat-mdc-chip-set-stacked"&gt;           &lt;mat-chip-o… |
| 312–312 | KEEP — label/explanation |  Partners  |
| 340–340 | KEEP — label/explanation |  Subscriptions  |
| 368–368 | KEEP — label/explanation |  Cooperations  |
| 396–396 | KEEP — label/explanation |  Only With  |
| 454–454 | KEEP — label/explanation |  ContactType  |
| 483–483 | KEEP — label/explanation |  UpdateDate  |
| 513–513 | KEEP — label/explanation |  StartDate  |
| 541–541 | KEEP — label/explanation |  BlockDate  |
| 570–570 | KEEP — label/explanation |  ExitDate  |
| 602–602 | KEEP — label/explanation |  LastOrderDate  |

### src/app/shared/table-settings/table-settings.component.html

| Lines | Classification | Summary |
| --- | --- | --- |
| 3–3 | KEEP — label/explanation |  Checkbox Column  |
| 32–32 | KEEP — label/explanation |  Name Column  |

### src/app/shared/table/table.component.html

| Lines | Classification | Summary |
| --- | --- | --- |
| 8–8 | KEEP — label/explanation |  User Name Column  |
| 25–25 | KEEP — label/explanation |  Role Column  |
| 31–31 | KEEP — label/explanation |  Region Column  |
| 37–37 | KEEP — label/explanation |  Full Name Column  |
| 76–76 | KEEP — label/explanation |  Home name Column  |
| 82–82 | KEEP — label/explanation |  Senior Home Column  |
| 88–88 | KEEP — label/explanation |  Affiliation/position Column  |
| 98–98 | KEEP — label/explanation |  Home categories Column  |
| 104–104 | KEEP — label/explanation |     @else { {{'TABLE.HOME_CATEGORIES.WITH_ADDRESS' &#124; translate}} }  |
| 112–112 | KEEP — label/explanation |  Contact Column  |
| 116–116 | KEEP — label/explanation |  Official home name  |
| 168–168 | KEEP — label/explanation |  Date Of Last Update Column  |
| 175–175 | KEEP — label/explanation |  Gender Column  |
| 182–182 | KEEP — label/explanation |  Birth Date Column  |
| 189–189 | KEEP — label/explanation |  Details Column  |
| 206–206 | KEEP — label/explanation |  Address Column  |
| 256–256 | KEEP — label/explanation |  Institutes Column  |
| 280–280 | KEEP — label/explanation |  Cooperations Column  |
| 325–325 | KEEP — label/explanation |  Coordinations  |
| 326–326 | KEEP — label/explanation |  Homes Column  |
| 351–351 | KEEP — label/explanation |  Partners Column  |
| 407–407 | KEEP — label/explanation |  Date Of Start Column  |
| 414–414 | KEEP — label/explanation |  Date Of Consent Column  |
| 421–421 | KEEP — label/explanation |  Comment Column  |
| 429–429 | KEEP — label/explanation |  Status Column  |
| 444–444 | KEEP — label/explanation |    For seniors  |
| 479–479 | KEEP — label/explanation |  Date Of Exit Column  |
| 486–486 | KEEP — label/explanation |  Date Of Last Order  |
| 493–493 | KEEP — label/explanation |  Actions Column  |
| 596–596 | KEEP — label/explanation |  Row shown when there is no matching data.  |

## J. Disconnected owner resources

Each of the following files is tracked, has no component-resource or other literal path consumer, and is outside the public asset-copy root. All five corresponding components explicitly select shared owner-details HTML/CSS instead. No TS/HTML/subclass/test consumer of these paths was found. Do not confuse these with still-referenced BaseDetails/AdvancedDetails metadata resources.

| Path | Lines | Executable/resource consumers |
| --- | --- | --- |
| src/app/pages/home-details/home-details.component.html | 1 | 0 |
| src/app/pages/home-details/home-details.component.css | 0 | 0 |
| src/app/pages/senior-details/senior-details.component.html | 1 | 0 |
| src/app/pages/senior-details/senior-details.component.css | 0 | 0 |
| src/app/pages/volunteer-details/volunteer-details.component.html | 1 | 0 |
| src/app/pages/volunteer-details/volunteer-details.component.css | 0 | 0 |
| src/app/pages/partner-details/partner-details.component.html | 1 | 0 |
| src/app/pages/partner-details/partner-details.component.css | 0 | 0 |
| src/app/pages/user-details/user-details.component.html | 0 | 0 |
| src/app/pages/user-details/user-details.component.css | 121 | 0 |

## K. Additional scoped symbol proof

BaseListComponent.dialog was resolved by the TypeScript checker across the spec program. Its sole matching symbol occurrence is the declaration at base-list.component.ts:93. A repository search finds production BaseList imports only in Table; no BaseList subclass exists, and its template has no dialog read. Its MatDialog import is therefore an orphan after deleting that field. This does not apply to Table or AdvancedDetails dialog dependencies.

BaseList showSpinner and ProgressSpinner are deliberately retained: base-list.component.html:167–173 renders the spinner from that input. This is an example of a template consumer preventing an incorrect deletion.

## L. Validation

- Full frontend: 670/670 passed; no tests added or changed.
- Auth: 29/29; Routing: 33/33; Cypress permissions: 8/8.
- Normal production TypeScript and git diff --check pass.
- The separate optional noUnusedLocals scan reports existing warning candidates and was used only as evidence; tsconfig was not changed.
- Production files changed: 0.

Temporary inventories/logs: C:\Users\Owner\AppData\Local\Temp\phase6l1-hygiene-c7537101
