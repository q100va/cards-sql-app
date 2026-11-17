# PHASE 7A — WHOLE-FRONTEND FINAL AUDIT AND RISK MAP

## Scope, method, and starting state

Audit + test-gap map, against HEAD `cdf8949`. Phase 6 remains closed. Its architecture and regression evidence were reused rather than generically re-audited. Shared details/dialog/logging files were inspected only to trace a new consumer interaction or reassess an explicitly deferred privacy issue.

Starting verified baseline: frontend 670/670; critical Phase 6 237/237; Auth 29/29; Routing 33/33; Cypress permissions 8/8; production TypeScript and diff checks passed. The known production build budget failure predates Phase 6.

Repository inventory scanned 119 production TypeScript files and the associated templates/resources; the final test set comprises 97 spec files. Read routes, feature controllers/forms, service/request/schema boundaries, permission bindings, destructive-action paths, translations, relevant existing tests, and selected installed PrimeNG component definitions. Static searches are candidate/evidence collection, not claims of complete runtime or accessibility verification. No browser-based accessibility, visual, screen-reader, timezone matrix, or live PostgreSQL workflow was executed.

Production files changed: **0**. Backend/schema/dependency/configuration changes: **0**. Existing tests changed: **0**. Added **13** targeted tests in four new files. No fix, refactor, or cleanup was performed.

## FRONTEND FEATURE INVENTORY / FEATURE RISK CLASSIFICATION

Risk describes intrinsic feature exposure and unresolved behavioral boundaries, not file length. HIGH does not mean a demonstrated security exploit. HTTP namespaces below are relative to the configured API URL. Coverage descriptions distinguish component workflows from service-contract tests and inherited Phase 6 protection.

| Feature / risk | Executable route and main components | Services / forms / HTTP | Permissions and destructive actions | Existing coverage and remaining gap |
| --- | --- | --- | --- | --- |
| Authentication/session — HIGH | `/session/sign-in`; SignIn, AuthLayout, BaseLayout | Auth/Idle/Language services; username/password form; `/api/session`, `/api/auth` | Auth guards; logout/session expiry | Strong existing Auth 29, routing and permission protections; no generic re-audit. Login presentation and browser-session UX remain only partially characterized. |
| Users — HIGH | `/users`; UsersList, UserDetails, ChangePasswordDialog | UserService; owner form plus independent password/confirmation form; `/api/users` | `VIEW_FULL_USERS_LIST` / `VIEW_LIMITED_USERS_LIST`; `VIEW_USER`, `EDIT_USER`, block/unblock/delete operations | Strong service/shared-owner protection; list wrapper smoke tests. Independent password-dialog submit/retry/double-submit behavior is effectively untested. |
| Partners — HIGH | `/partners`; PartnersList, PartnerDetails | PartnerService; contacts/address/coordinations owner form; `/api/partners` | Full/limited partner-list and per-action operations; block/delete | Strong inherited Phase 6 pipeline/reset/lifetime/dirty coverage and direct service tests. Do not reopen architecture. Peripheral navigation wrappers remain partial. |
| Volunteers — HIGH | `/volunteers`; VolunteersList, VolunteerDetails; OrderCard consumer | VolunteerService; owner institutes/subscriptions/cooperations and contact selection; `/api/volunteers` | Full/limited volunteer-list plus per-action operations; block/delete | Strong service encoding/owner contracts and Phase 6 protection. OrderCard consumption of contact/volunteer results was unprotected; new failures below. |
| Homes — HIGH | `/homes`; HomesList, HomeDetails | HomeService; geography/postal/coordinations; `/api/homes` | Full/limited home-list; view/edit/block/delete | Strong Home restoration and DTO/service coverage. Postal absence UX is intentionally deferred. |
| Seniors — HIGH | `/seniors`; SeniorsList, SeniorDetails | SeniorService; identity/birth/Home/spouse/restriction forms; `/api/seniors` | Full/limited senior-list and per-action operations; block/delete | Strong direct API and shared reset protection; specialized outer-screen workflows remain partial. Bulk workflow is a separate high-risk entry below. |
| Toponyms — MEDIUM; bulk import HIGH | `/countries`, `/regions`, `/districts`, `/localities`; four wrappers, ToponymsList, ToponymDetails | AddressService; parent hierarchy, name/short/postal/restriction fields, file upload; `/api/toponyms`, `/api/files` | Full/limited toponym-list; per-type add/edit/block/delete/import/download operations | Strong request-contract tests and protected UploadFile/list teardown. Specialized list loading/cancellation and CRUD navigation are only partial. |
| Orders list — HIGH | `/orders`, `/orders/:userId`; OrdersList | OrderService; PrimeNG lazy filters/search/pagination; `/api/orders/get-orders`, status/delete endpoints | Full list at `/orders`; full/limited at scoped route; `EDIT_ORDER`, `DELETE_ORDER` on actions | Previously creation-only component coverage despite direct service tests. New HTTP tests expose stale pages and premature loading release. |
| New orders — HIGH | `/orders/new-order/:typeId`; OrderCard, OrderFilters, OrderRecipients | Order/Volunteer/Occasion services; contact, source, amount, institute, recipient-distribution forms; `/api/orders`, `/api/volunteers`, `/api/occasions` | `ADD_NEW_ORDER`; `FULL_FILTER_NEW_ORDER` changes available filtering; creation allocates recipients and affects counts | Previously creation-only component/child specs. New tests expose identity/search/preflight/dialog issues. Distribution validators, confirmation snapshots, empty occasions, and filter reset remain major gaps. |
| Order details — HIGH | `/orders/order/:orderId` and `/:userId` variant; OrderDetails, OrderRecipients | OrderService; status/detail display and recipient-removal edit state; `/api/orders/order/:id`, `/edit-recipients` | Route accepts `VIEW_ORDER` or `EDIT_ORDER`; backend PATCH requires `EDIT_ORDER`; removes recipients from an order | No dedicated OrderDetails spec. Existing child spec is creation-only. Route error recovery, view-only UI permissions, and failed-save retry need focused tests. |
| Occasions — HIGH | `/occasions`; OccasionsList, CreateOccasionDialog, CheckResultDialog | Occasion/Recipient services; type/year/month/status; `/api/occasions`, recipient create/check/clear | Route `ALL_OPS_OCCASIONS`; action codes including `ADD_NEW_OCCASION`; close/open/delete occasion and clear recipient list | Good service contracts; list component has one creation test, no direct create/check-dialog specs. Destructive confirmation, retries, and busy-state behavior are effectively untested. |
| Recipients — HIGH | `/recipients/:occasionId`; RecipientsList, CreateRecipientDialog | Recipient/Occasion/Senior/Home services; lazy filters, selected rows, home/senior picker; `/api/recipients`, `/api/seniors/get-seniors-for-occasion`, Home groups | Full/limited recipient-list; add/delete/send action permissions; creates/deletes recipient records | Strong service contracts; previously one list creation test, no dialog coverage. New picker tests expose stale eligible seniors/loading. List request ownership, route changes, delete confirmation, and Send remain gaps. |
| Roles/admin — HIGH | `/roles`; RolesList, CreateRoleDialog | RoleService; inline role name/description and operation/access grid; `/api/roles` | `ALL_OPS_ROLES`; role CRUD and permission changes | Substantial component + HTTP-style integration + Cypress role coverage; core validation, rollback, duplicate checks, and permission merge are well covered. Concurrent edits and post-revocation UX remain partial, not newly proven defects. |
| Audit — HIGH | `/audit`; AuditTable | AuditService; filters, UTC date-range, paginator; `/api/audit` | `VIEW_AUDIT_LOG`; read-only but sensitive historical data | Nine existing normalization/pagination/date tests. New real-HTTP recovery test fails; error termination was not covered. |
| Bulk senior reconciliation — HIGH | `/seniors-bulk-upload`; SeniorsBulkUpdate, SeniorChangesTable, CheckDateDialog, CheckGenderDialog | Senior/File services; upload review, identity/date corrections, accepted changes, date/month controls; compare/update senior-list endpoints | `UPLOAD_LIST_OF_SENIORS`, template-download permission; multi-row admission/removal/update | Service contracts are covered, but parent/child components have creation-only specs; correction dialogs have no direct specs. Compare failure/retry, changed upload context, accepted decisions, partial failures, and save repeat protection are effectively untested. |
| Reports/statistics — MEDIUM residual; sensitive export HIGH | `/reports`, `/statistic`; Reports, Statistic | ReportsService/FileService; period/type/permission-driven form; `/api/reports` | Full/limited reports; `VIEW_CURRENT_STATISTIC`; exports personal/recipient data | Strong completed Reporting sample coverage retained; no generic re-audit. File error/diagnostic normalization is separately traced below. |
| Files/downloads — MEDIUM | Buttons within toponym/bulk/report/statistic features; no standalone route | FileService; template Blob download and ExcelJS generation; `/api/files/download/:filename` | Feature-specific download/export authorization; no destructive action itself | Download Blob/JSON/text errors and export behavior have tests. Download-error diagnostic identity across interceptors/service normalization lacks integration coverage. |
| Navigation/layout/system pages — LOW residual | BaseLayout, AuthLayout, `/forbidden`, wildcard redirect | Auth/Language/Router; profile, menu, language controls | Guard/menu tests already protect core routing and denial behavior | Strong core routing/Cypress sample protection. Parameter reuse/deep links and keyboard/accessible names are incomplete outside that scope. There is no dedicated 404 page; unknown URLs deliberately redirect home. |

## API BOUNDARY FINDINGS

Positive evidence: OrderService, RecipientService, OccasionService, AuditService, and the inspected bulk Senior endpoints validate JSON responses with shared Zod schemas or the scalar/no-schema envelope validators. Audit uses `HttpParams`. Order duplicate checks use numeric params. Role free-text and FileService filenames are encoded. Existing Volunteer search encoding remains intact. Blob downloads intentionally use `responseType: 'blob'`; this is not missing JSON-schema validation. No newly demonstrated null-ID/optional-field request defect was found in those reviewed service methods.

**R07 — OrderCard assumes a different dialog return contract (P2; failing test).** `order-card.component.ts:664–665` reads `res.id` after creating a volunteer. The existing host at `details-dialog.component.ts:145–146` returns `{ refresh: !!data }`. Closing with `{ refresh: false }` produces a GET ending in `/get-volunteer-by-id/undefined`. A successful host result also has no `id`; automatically selecting the new volunteer needs an explicit consumer contract decision. Correct the consumer workflow in a later batch, not the completed shared architecture by inference.

**R13 — Blob normalization loses diagnostic identity (P2; source-confirmed path, no new test).** FileService `handleError` creates a new `HttpErrorResponse` when decoding a Blob error. The HTTP interceptor marks the original object in a WeakSet; MessageWrapper checks object identity. A download HTTP failure can therefore receive a second diagnostic after normalization. Domain-code decoding itself is covered and useful; do not remove it. No duplicate user toast is claimed from this path.

## ERROR / RECOVERY FINDINGS

**R06 — Order creation cannot retry after duplicate-check failure (P2; failing test).** `onCreateOrderClick()` sets `blockCreateButton = true`; the `checkOrder` error handler at `order-card.component.ts:419–428` reports the error but never releases the latch. Create remains disabled after a 503. A retry should not require abandoning the workflow.

**R08 — Audit paging/filter stream terminates on its first HTTP error (P2; failing test).** The inner request at `audit-table.component.ts:210–226` has `finalize` but no recovery; the outer subscription receives the error and closes. The spinner is released, but a subsequent page event sends no HTTP request. Existing debounce/date tests use successful service stubs and miss this boundary.

**R09 — OrderDetails route recovery is not protected (P2; source-confirmed termination path).** Its `paramMap → switchMap` request also handles errors only at the outer subscription. A failed order fetch prevents later parameter changes from being processed in that same component instance; `order` is not cleared at the start of a new route fetch. An old order may remain visible under a new failed URL. No dedicated spec exists; this was not added to the 13-test initial set.

**R11 — Bulk compare failure loses the retry step (P2; source-confirmed path).** `onStartClick()` at `seniors-bulk-update.component.ts:217–237` hides Start and disables month selection before awaiting `compareLists()`. The latter reports, stops loading, and rethrows at lines 628–655. The caller does not restore the pre-comparison step. Failed comparison needs explicit recovery; currently re-uploading is the available reset path. No persistence loss or duplicate transaction was demonstrated.

Failures in list refreshes can also retain old rows/options; existing source does not identify those rows as belonging to a previous query. Recovery policy should be specified explicitly rather than generically blanking every screen.

## FORM FINDINGS

**R01 — Stale volunteer identity can replace the current contact selection (P1; failing test).** `getVolunteer()` at `order-card.component.ts:598–634` starts independent subscriptions and assigns every response. A(10) then B(20), completed B then A, leaves volunteer 10 current. The form's selected contact is not necessarily changed with that response; `createOrder()` reads `volunteer.id` and `contact.id` separately. This demonstrates wrong UI identity and a possible mismatched write payload, not an observed corrupted PostgreSQL order.

**R02 — Stale eligible seniors are shown for a different selected home (P1; two failing tests).** `CreateRecipientDialog.onHomeSelected()` at lines 151–174 has no current-selection ownership. Selecting Home A then B, completing B then A, replaces B's seniors with A's seniors while the home control can still be B. The Create action submits selected senior IDs. The same old completion can release loading while B is pending. The tests establish incorrect eligibility presentation, not a demonstrated backend authorization bypass.

Additional gaps: OrderCard validates `orderForm` but relies on disabled UI for filter validity; its invalid-form early return occurs after setting `showSpinner`. The normal button prevents that invalid-form path, so no separate user-visible stuck-spinner defect is claimed. Check-date/check-gender dialogs and bulk accepted-change context need independent behavior tests. Password changes need submit/retry/latch tests. These gaps are not reasons for a typed-form overhaul.

## PERMISSION FINDINGS

**R10 — Read-only order viewers are offered recipient editing (P2; source-confirmed UI mismatch).** The route admits `VIEW_ORDER` or `EDIT_ORDER`, but `order-details.component.html:60` derives edit eligibility only from order/occasion statuses. OrderRecipients renders Edit/Save using that flag and does not check `EDIT_ORDER`. The backend `/edit-recipients` route explicitly requires `EDIT_ORDER`; this is a misleading forbidden action and recovery/UX issue, not a demonstrated server-side permission bypass. No backend modification is proposed in this audit.

Existing role permission refresh is active: `fetchPermissions()` subscribes internally. It was not incorrectly classified as a cold/unsubscribed request. Core Auth/Routing/Cypress permissions remain green.

## DESTRUCTIVE-WORKFLOW FINDINGS

Highest-exposure workflows are recipient allocation/removal, occasion recipient-list clearing, role/access updates, entity blocking/deletion, and bulk senior reconciliation. Role CRUD has meaningful rollback/confirmation tests; occasion/recipient/bulk workflows largely do not.

**R16 — Recipient Send is an exposed no-op (P2; source-confirmed incomplete workflow).** Buttons in `recipients-list.component.html` invoke `onSendRecipientClick`, whose body at TS:328 is empty. The menu also passes `[recipient.id]` while the public signature expects `Recipient[]`; the no-op currently conceals the shape mismatch. Decide the intended feature behavior before implementing or removing an action; no silent feature removal was done.

Late confirmations in the completed shared-details flow remain protected. Independent confirmation callbacks in OrderCard/occasions/roles/recipient screens need lifetime and repeat-intent tests where writes follow delayed acceptance. Do not assume shared Phase 6 tests cover these different controllers.

Bulk loading uses an overlay; duplicate-save prevention and keyboard interaction cannot be established from the overlay's CSS alone. There is no evidence here to claim that a duplicate database write actually occurred. This remains a high-value test/manual gap.

## ASYNC FINDINGS

**R04 — OrdersList has no latest-request owner (P2; two failing tests).** `loadOrders()` at TS:132–174 subscribes per lazy-load event. B then late A leaves A's page displayed; finishing A while B is pending sets `isLoading` false. The successful-response and failure/retry controls pass.

**R05 — OrderCard contact suggestions ignore current input (P2; two failing tests).** `filterContact()` at TS:570–594 has independent subscriptions; older results overwrite a newer query, and shortening the query below three characters does not invalidate a pending lookup. The service's URL encoding is correct; the bug belongs to this consumer's response ownership.

**R12 — ToponymsList loading is vulnerable to switchMap cancellation order (P2; source-confirmed ordering risk).** Its `tap(() => showSpinner.set(true))` precedes `switchMap`, while the inner request finalizes loading false. On a new query, that true can be overwritten by cancellation of the previous request before the new request completes. This is a different list controller from the protected shared Table. Add a focused behavioral test before fixing; no Phase 6 Table change is warranted.

Other uncovered context transitions: OrdersList reads `userId` only from `snapshot` in `ngOnInit`; OrderCard fetches actual occasions outside its `paramMap` subscription; RecipientsList updates occasion metadata without an explicit matching list reload. Same-component parameter reuse needs tests. OrderCard also dereferences the first actual occasion without an empty-list guard. These are concrete source gaps, not additional failures claimed from the 13-test run.

## SECURITY / PRIVACY FINDINGS

**R03 — Owner-draft diagnostic data can include unredacted names/postal text (P1; source-confirmed conditional data path).** This was deliberately deferred from Phase 6 and is now a Phase 7 privacy boundary:

1. AdvancedDetails duplicate/create error handlers at TS:902–908 and 1305–1311 pass `owner: this.ownerDraft` to MessageWrapper.
2. MessageWrapper logs caller context for errors without a prior diagnostic marker. HTTP failures already marked by the interceptor are deduplicated; response-schema validation errors and other unmarked failures can take this branch.
3. `ClientLoggerService.maskCtx()` at TS:255 onward redacts secret-key fields and masks email/phone strings. It does not generally remove names, postal text, free-text owner fields, or identifiers.
4. Buffered context is sent to `/api/client-logs` by the existing transport.

Thus diagnostic context can contain personal data under the specified error condition. This is not a claim that every HTTP failure logs a draft, that logs are publicly accessible, or that an exploit was executed. Minimize diagnostic metadata and characterize masking/deduplication in a narrow later batch. No new logger, transport, or security policy was introduced.

No new `bypassSecurityTrust*` use or demonstrated XSS/authorization bypass was found in the inspected feature paths. Angular interpolation remains the presentation boundary; the existing toast path sanitizes message text. Clipboard/export of authorized recipient addresses is an intentional sensitive workflow, requiring permission-policy checks rather than treating every export as a leak.

## ACCESSIBILITY / TEMPLATE FINDINGS

**R15 — Keyboard/name gaps in concrete controls (P2; source evidence, manual assistive-technology validation pending).** OrderCard's previous/next occasion icon buttons at HTML:17–25 lack a meaningful accessible label. AuditTable's apply/clear controls are clickable `p-inputicon` elements at HTML:32–36, 67–73, 101–107, with no keyboard handler or focusability. The installed PrimeNG InputIcon has no built-in button/keyboard host contract. BaseLayout's linked logo image lacks alt text, and the profile icon button lacks an explicit label. Confirm generated accessibility trees and focus behavior before a focused UI fix; do not relabel every icon mechanically.

Static per-template duplicate literal-ID search found no duplicates; this does not prove uniqueness across repeated rows or simultaneously rendered dialogs. PrimeNG/Material runtime IDs, modal focus, table headers, focus restoration, contrast, and screen-reader announcements remain manual checks. Significant existing loops generally use stable IDs or Angular `track`; no broad trackBy rewrite is justified.

The known PrimeFlex `items-center` mismatch and plain `fxLayout` attributes/overlay styling belong to the visual/manual bucket. No CSS or framework configuration was changed.

## ROUTE / NAVIGATION CONSISTENCY

The executable route inventory and existing core guard tests were reused. Both order-detail URL forms and scoped/unscoped order-list routes exist; the wildcard redirects to the default route rather than rendering a 404 screen. No new broken route-name reference was established. Forbidden has a dedicated terminal screen.

Beyond core matching, the parameter-reuse and failed-fetch transitions described in R09/async findings are insufficiently tested. Validate order IDs/type IDs and specify no-data/404 presentations; do not conflate a server rejection of an invalid numeric path with a newly demonstrated injection issue. OrdersList back navigation preserves optional user scope through the detail URL, but same-instance reuse needs protection.

## LOCALIZATION FINDINGS

**R14 — Concrete label defects (P2; source + dictionary evidence).** Both RU and EN dictionaries lack:

- `PRIME_CONFIRM.CLEAR_LIST_MESSAGE`, used at `occasions-list.component.ts:435–436` for destructive clear-list confirmation;
- `TABLE.CARD.OUTDATED_HOME_OFFICIAL_NAMES_TITLE`, used at owner template HTML:481. This is a newly discovered label issue during whole-frontend key checking; it does not reopen Home restoration or shared architecture.

Recipient filter labels at TS:89–104 are computed once with `instant()` and have no language-change refresh. OrderRecipients' copy tooltip is a literal `matTooltip="translateService.instant(...)"`, so it displays the expression rather than a translated value. Bulk review includes hard-coded Russian user-visible instructions. Occasion filter streams, by contrast, use `translate.stream` and should not be incorrectly flagged as once-only labels.

Order instruction content in `order-ctrls.ts` is intentionally Russian-looking business text. Whether outbound Russian postal instructions should change with application language is a product/content decision, not a demonstrated locale defect. The static scan covered literal translate calls/pipes; dynamic keys and fallback behavior need runtime review. No translation values were changed.

## DATE / TIME FINDINGS

Audit ranges explicitly construct UTC day boundaries and existing tests assert that behavior. Calling that a new timezone bug would contradict the characterized contract. Verify whether operators expect UTC days or local civil days before changing it.

Bulk birthday normalization builds explicit `YYYY-MM-DD` strings, and correction dialogs extract local calendar parts. Update-date fields are sent as Date/ISO instants and stored as date-time fields; no new proven day-shift defect was demonstrated. Date-only versus instant semantics, DST boundaries, unknown birth year, leap day, and RU/EN date entry are important untested bulk boundaries. The occasion year list extends through 2040, so no current-year cutoff defect was found.

UTC-derived export filename dates may differ from the operator's local calendar near midnight; this is cosmetic/manual/product scope. The known static Russian DatePipe limitation was not generically re-audited or escalated without a new correctness reproduction.

## FILE / DOWNLOAD FINDINGS

Template downloads use encoded filenames, Blob response mode, and `saveAs`; file service tests cover Blob JSON/text errors. Existing ExcelJS export tests protect source data, row types, worksheet naming, and download creation; Reporting export was not re-audited generically.

R13 is the concrete remaining diagnostic integration gap. Also test real failed template downloads, MIME/filename headers, repeated clicks, browser download support, and revoked ObjectURL timing across supported browsers before release. No malformed download, formula execution, or cross-origin leak was demonstrated; plain ExcelJS string values were not assumed to be formulas. No production file handling changed.

## TEST COVERAGE GAPS

| HIGH/MEDIUM area | Current behavioral assessment | Highest-value remaining boundary |
| --- | --- | --- |
| Auth/core routing | Strong | Reuse existing protections; no new generic suite |
| Shared owner/details/list behavior | Strong for completed Phase 6 contracts | Only new caller interactions; preserve closure decision |
| User password dialog | Effectively untested at component level | Invalid/mismatch, failed submit retry, repeat submit, close lifetime |
| Roles/access admin | Strong core; partial concurrency | Conflicting inline edits and revocation UX |
| OrdersList | Partial; new controls pass, ownership regressions fail | Fix latest page/loading; then mutations followed by refresh |
| OrderCard/filters/recipients | Partial/effectively untested complex branches; five new failures | Contact/volunteer/form identity; confirmation snapshot; invalid/empty occasion; distribution/reset; dialog return contract |
| OrderDetails | Effectively untested controller | Route errors/reuse, view-only permissions, recipient edit retry |
| Occasions | Service contracts strong; component workflow effectively untested | Duplicate creation, clear/delete confirmations, retries/lifecycle |
| RecipientsList + dialog | Service contracts strong; controller partial, selector red | Eligible-home ownership, page/route changes, selected-ID deletes, Send semantics |
| Bulk senior workflow | Effectively untested beyond creation/service calls | Compare error recovery, multi-home progression, changed upload, correction/accepted-field state, failed save and duplicate intent |
| Audit | Good successful normalization; error recovery newly red | Recover a live request stream; stale rows/loading policy |
| Specialized ToponymsList | Partial | Cancellation loading and CRUD refresh; retain protected upload ownership |
| Reports/statistics | Strong completed sample | Reuse protection; no new structural work |
| Files/downloads | Partial; export/Blob handling covered | Interceptor + Blob normalization diagnostic identity; real download failures |
| Accessibility/localization | Partial structural checks; weak behavioral coverage | Keyboard/name tree, language changes while screens remain mounted, destructive confirmation translations |

No raw percentage coverage was used to rank these risks.

## TESTS ADDED / CONFIRMED DEFECTS

| New spec | Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| `src/app/pages/orders-list/orders-list.request-ownership.spec.ts` | 4 | 2 | 2 |
| `src/app/pages/recipients-list/create-recipient-dialog/create-recipient-dialog.request-ownership.spec.ts` | 3 | 1 | 2 |
| `src/app/pages/order-card/order-card.request-state.spec.ts` | 5 | 0 | 5 |
| `src/app/pages/audit-table/audit-table.recovery.spec.ts` | 1 | 0 | 1 |
| Total | 13 | 3 | 10 |

Tests use real component public methods, HttpClient/HttpTestingController, and current runtime response validators. Controllers are tested independently of rendering PrimeNG tables/lists, so these are not accessibility or browser integration tests. The dialog close test stubs the documented close boundary; it does not alter the production registry/host. Existing fixtures were reused where practical. No broad `any`, skipped tests, or permissive replacement expectations were added.

| New spec | New tests | Passed | Failed | Failure mapping |
| --- | ---: | ---: | ---: | --- |
| `pages/orders-list/orders-list.request-ownership.spec.ts` | 4 | 2 | 2 | R04 stale page / loading owner |
| `pages/recipients-list/create-recipient-dialog/create-recipient-dialog.request-ownership.spec.ts` | 3 | 1 | 2 | R02 wrong-home seniors / loading owner |
| `pages/order-card/order-card.request-state.spec.ts` | 5 | 0 | 5 | R01 stale volunteer; R05 search latest/clear (2); R06 failed preflight latch; R07 undefined dialog-result ID |
| `pages/audit-table/audit-table.recovery.spec.ts` | 1 | 0 | 1 | R08 terminated stream after HTTP failure |
| **Total** | **13** | **3** | **10** | All failures left enabled against unchanged production |

Runtime-confirmed defect families: R01, R02, R04, R05, R06, R07, R08. Other source-confirmed findings and untested risks are explicitly distinguished above. No production fixes were attempted after the failures appeared.

## KNOWN DEFERRED ITEMS RECLASSIFIED

| Deferred item | Phase 7 classification | Disposition |
| --- | --- | --- |
| DialogData component kind/model static correlation | Safe defer | Existing narrow host runtime behavior is protected; no new misuse proven from static generic correlation itself. R07 is a separate consumer result-contract defect. |
| PrimeFlex/items-center, overlay/flex styling | Manual visual review | Preserve active CSS; browser/keyboard/visual verification required. |
| Owner-draft context for unmarked errors | Phase 7 security/privacy, P1 (R03) | Conditional personal-data transport path is established; narrow metadata/masking review is warranted. |
| Postal no-street/no-building confirmation | Product UX | Still documented; no stricter validator inferred. |
| Bundle budget and build warnings | Phase 8/release, existing P0 build gate | No budget/config/dependency changes in 7A. See reproduced 6M evidence below. |

## FINAL PRIORITIES

### P0 — release blocker

**Existing, not newly introduced:** normal `npm run build` fails the 5 MB initial-bundle budget. Phase 6M reproduced 5.05 MB / +49.44 kB at current production HEAD and 5.04 MB / +44.78 kB before Phase 6. Production source/configuration is unchanged in 7A; those results remain applicable. No new P0 security/correctness defect was demonstrated. Build work is release scope, not permission to raise budgets here.

### P1 — correctness/security

1. R01 wrong volunteer identity in order creation — runtime A/B reproduction and independent contact/volunteer payload reads.
2. R02 wrong-home senior eligibility — runtime A/B reproduction with write-eligible selection UI.
3. R03 conditional personal-data diagnostic context — concrete source-to-transport risk, no public-access/exploit claim.

### P2 — meaningful robustness/accessibility

R04–R08 runtime failures; R09 route recovery, R10 edit-permission affordance, R11 bulk retry recovery, R12 specialized toponym loading order, R13 duplicate file-error diagnostics, R14 localization labels/state, R15 keyboard/accessibility names, R16 exposed Send no-op. Bulk/password/distribution/confirmation gaps remain high-value coverage work, not fabricated passing/failing tests.

### P3 — improvement / manual verification

PrimeFlex/flex/overlay layout, modal focus/screen-reader/contrast checks, UTC-versus-local date policy, RU outbound instruction intent, cross-browser downloads, and 404 UX. Generic typing correlation remains safe to defer. No hygiene/naming/file-size refactor is recommended.

## RECOMMENDED PHASE 7B — OrderCard identity, preflight, and dialog-result contracts

- **Scope:** latest contact/volunteer intent, clearing pending search results, preflight retry latch, correct treatment of cancelled/successful volunteer creation results. Keep request values and backend contracts explicit.
- **Confirmed defects:** R01, R05, R06, R07; five enabled failing tests. Clarify successful new-volunteer selection behavior before changing shared close semantics.
- **Expected files:** `order-card.component.ts`, its new request-state spec; only a small caller-specific dialog-result contract adjustment if needed. Preserve the completed generic host architecture.
- **Protection:** five new regressions, existing OrderCard smoke/OrderService/VolunteerService encoding/API tests, and full frontend/Auth/Routing/Cypress checks. Add only a focused cross-context confirmation case if required by the implementation.
- **Value:** directly prevents wrong identity and unusable order creation. Do not combine with bulk/filter redesign.

## RECOMMENDED PHASE 7C — Independent request ownership and live-stream recovery

- **Scope:** CreateRecipientDialog home lookup, OrdersList page/loading ownership, and AuditTable recovery. Keep this batch to these three independent controllers.
- **Confirmed defects/gaps:** R02/R04/R08 have five failing tests. R09/R12 remain separately recorded source mechanisms needing direct tests, outside this implementation batch.
- **Expected files:** the three affected controllers and their new specs. Use local/current abstractions; no generic request manager and no shared Table/AddressFilter rewrite.
- **Protection:** five new regressions, existing Audit date/pagination tests, list/service contracts, and the closed Phase 6 protections. Work incrementally by controller.
- **Value:** prevents wrong eligibility/page data and restores retry without reopening completed architecture.

## RECOMMENDED PHASE 7D — Minimal diagnostic metadata and normalized file-error identity

- **Scope:** explicitly characterize owner-draft privacy on unmarked/validation failures; minimize diagnostic metadata; preserve one diagnostic across FileService Blob normalization.
- **Confirmed path/gap:** R03 sensitive context path and R13 error-identity loss. Establish precise privacy expectations in tests before changing behavior.
- **Expected files:** the two AdvancedDetails error-context call sites only as needed, `client-logger.service.ts` / `message.service.ts` only if tests justify a shared policy change, `file.service.ts` and the existing diagnostic helper if preserving identity needs it; focused privacy/Blob integration specs. No save-pipeline extraction or new logging subsystem.
- **Protection:** existing logger/message/interceptor/HTTP-error and FileService tests; new narrow assertions for unmarked errors and Blob normalization; full frontend/Auth/Routing/Cypress checks.
- **Value:** addresses the explicitly deferred Phase 7 privacy boundary without suppressing errors or weakening notifications. Keep product UX, visual CSS, and release build optimization separate.

## VALIDATION / REPOSITORY INTEGRITY

| Check | Result |
| --- | --- |
| Existing frontend tests | 670/670 passed |
| New focused audit tests | 3 passed, 10 failed; 13 total |
| Full frontend with new tests | 673 passed, 10 failed; 683 total |
| Auth | 29/29 passed |
| Routing | 33/33 passed |
| Cypress permissions, existing stub setup | 8/8 passed |
| Production TypeScript | Passed |
| Production build | Not rerun in 7A; unchanged production retains the reproduced pre-existing 6M bundle-budget failure |
| `git diff --check` and new-file whitespace checks | Passed |
| Existing tests changed/skipped/weakened | 0 |
| Production/backend/schema/dependency/configuration files changed | 0 |

Commands: `npm test -- --watch=false --browsers=ChromeHeadless`, with focused `--include` paths for the new specs, Auth, and Routing; `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`; established `permissions.cy.ts` runner with `USE_STUBS=1`; `git diff --check`. Logs and static inventory are in `C:\Users\Owner\AppData\Local\Temp\phase7a-audit-5d10e489`.

Only the four new specs and this audit were added. Pre-existing Phase 6 documents were preserved. No tests were added to make a known defect pass, no failure was skipped, and no production/backend fix was made. The new red tests are deliberate regression evidence for subsequent approved implementation work.

PHASE 7A — WHOLE-FRONTEND FINAL AUDIT COMPLETE

Production files changed: 0
