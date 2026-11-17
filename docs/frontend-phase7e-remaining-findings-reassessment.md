# PHASE 7E — REMAINING FINDINGS REASSESSMENT

## BASELINE / METHOD

Reassessed against current HEAD `e6eeb88`, using `frontend-phase7a-whole-frontend-audit.md`, `frontend-phase7d-diagnostic-privacy.md`, current controllers/templates, backend route declarations, existing tests, translations, styles, and installed Angular/PrimeNG/RxJS implementations.

Verified again: **frontend 705/705; Auth 29/29; Routing 33/33; Cypress permissions 8/8; production TypeScript passed**. No new tests were necessary to classify these findings. All ten initially failing Phase 7A regression expectations remain green within the full suite.

Production files changed: **0**. Existing/new test changes: **0**. The only addition is this report; pre-existing untracked documents are preserved.

Evidence levels below are explicit: source-provable control flow is not presented as a new browser/HTTP reproduction. No manual keyboard, screen-reader, visual, timezone-matrix, or cross-browser download session was performed. Cypress covers its existing permission scenarios only. No backend mutation or live database exercise was run.

Disposition key:

- **A — FIX BEFORE PHASE 8:** concrete current evidence, meaningful impact, clear expected behavior.
- **B — ADD TEST / VERIFY ONLY:** an unprotected boundary, without enough evidence to prescribe a new production behavior.
- **C — MANUAL / VISUAL VERIFICATION.**
- **D — PRODUCT / UX DECISION.**
- **E — RELEASE / BUILD WORK.**
- **F — SAFE DEFER:** explicitly tracked, with limited current impact; not a claim that the code is ideal.

| Finding | Current severity | Disposition | Why |
| --- | --- | --- | --- |
| R09 OrderDetails failed-route recovery/stale order | P2 correctness | **A** | A failed inner request terminates the route subscription; an old order can remain visible for a different route ID. |
| R10 read-only viewer offered recipient editing | P2 permission affordance | **A** | The UI offers a write that the correctly protected backend rejects. Clear read-only/edit distinction; not an authorization bypass. |
| R11 bulk comparison failure loses Start/retry | P2 recovery | **A** | Start is hidden and months disabled before an awaited request; rejection never restores that step. |
| R12 ToponymsList replacement request loses loading | P2 pending-state correctness | **A** | Old inner finalization runs after the new outer `tap(true)`, clearing the pending replacement's spinner. |
| R14 localization | P2 destructive prompt; P3 display issues | **A** for clear-list confirmation; **F/D** for the lower-impact/policy items below | Missing destructive-action explanation warrants a bounded fix; not every untranslated label is a correctness blocker. |
| R15 inaccessible names/interactive semantics | P2 accessibility | **A** for source-proven defects; **C** for rendered behavior | Templates and installed component implementations establish the missing semantics; actual assistive-technology behavior still needs manual checks. |
| R16 exposed Recipient Send no-op | P2 incomplete feature/UX | **D** | No agreed Send behavior or request contract can be inferred from an empty handler. |

## R09

**Original finding / evidence:** Phase 7A P2: `paramMap → switchMap` handles request errors only at the outer subscription; no dedicated OrderDetails spec; an old order is not cleared before a new fetch.

**Current code path:** `pages/order-details/order-details.component.ts:76–111` still sets the new `orderId`/`userId`, starts `getOrderById`, and finalizes loading inside `switchMap`. The sole error callback is on the outer subscription. `order` is initialized once at line 63 and replaced only on success. The template renders the retained order after loading ends. Installed Angular's default reuse strategy retains the component for the same route configuration when parameters change; no application override was found.

**7B–7D effect:** None. OrderDetails and its recipient child were not changed. Audit's 7C inner recovery is local to Audit and does not repair this separate stream.

**Current reproducibility:** Source-provable sequence: A succeeds → same-route B fails → loading releases and A remains available → later C parameters have no subscribed request pipeline. Not newly exercised in a dedicated HTTP/browser test here. Recreating the component re-establishes the subscription.

**Existing tests:** OrderService tests validate fetch/edit contracts; routing tests prove access and matching. No dedicated OrderDetails recovery/stale-display test exists. They do not establish this workflow's recovery.

**Actual impact / current severity:** **P2 correctness.** An operator can see an old order under a different URL and cannot recover through same-instance parameter navigation. Its header still identifies the old order, and mutations use the loaded order's ID; no wrong database write is claimed. Retaining actionable stale content nevertheless makes this meaningful identity/recovery work.

**Disposition: A.** Preserve the route subscription through individual HTTP failures and prevent old order data from being presented as current during/after a different failed lookup. Characterize that exact boundary before the later fix; retain notifications, endpoint semantics, and valid back navigation.

## R10

**Original finding / evidence:** Phase 7A P2 UI mismatch: a route permits `VIEW_ORDER` or `EDIT_ORDER`, while recipient editing is gated only by order/occasion state. Backend PATCH requires `EDIT_ORDER`.

**Current code path:** `app.routes.ts:111–120` still permits either operation. `order-details.component.html:60` still supplies `isEditAllowed` based only on order status 1/2 and occasion status 1. `order-recipients.component.html` uses that flag to render Edit/Save/remove controls. Its AuthService use selects instruction variants through `FULL_FILTER_NEW_ORDER`; it does not check `EDIT_ORDER`. `server/routes/orders-api.js:484–488` still requires authentication and `EDIT_ORDER` for `/edit-recipients`.

**7B–7D effect:** None. OrderCard's consumer ownership fixes do not change this separate OrderRecipients permission path; routing/backend enforcement were unchanged.

**Current reproducibility:** Source-provable for a VIEW-only user viewing an editable-status order: controls permit entering recipient-edit mode and submitting the PATCH, which the backend rejects. No live unauthorized write was attempted; there is no evidence of a permission bypass.

**Existing tests:** Routing explicitly permits each of VIEW_ORDER/EDIT_ORDER and denies neither. The child component has a creation test. OrderService tests protect the PATCH body. Cypress's eight existing scenarios do not test this order-detail affordance.

**Actual impact / current severity:** **P2 permission affordance/avoidable failed workflow, not a security vulnerability.** The user can stage removals and press Save only to receive a permission error. Existing Cancel resets staged IDs; parent error handling releases its loader and reports the failure. No persistent database inconsistency is established.

**Disposition: A.** Align the editable UI/action boundary with existing EDIT_ORDER authority while retaining VIEW_ORDER access and status restrictions. This is a local affordance correction, not an Auth/guard/backend redesign. Protect both viewer and editor cases in the later batch.

## R11

**Original finding / evidence:** Phase 7A P2: bulk Start hides itself and disables months before `compareLists`; the comparison reports failure and rethrows; no caller recovery restores Start.

**Current code path:** `seniors-bulk-update.component.ts:217–239` still sets `showStart = false`, disables `chosenMonths`, and awaits `compareLists` without a catch. At lines 628–654, the comparison reports its error, sets the spinner false, and throws. `clear()` re-enables months but clears workflow state; a fresh upload/process step can reach Start again.

**7B–7D effect:** None. The bulk controller/template were unchanged. FileService's download marker fix is unrelated to comparing seniors.

**Current reproducibility:** Source-provable for an HTTP/validation failure during comparison: Start remains hidden and months disabled after loading ends. The current home/list is not automatically restored to a retry-ready step. No new runtime reproduction was added.

**Existing tests:** The parent and changes-table components have smoke coverage; SeniorService has request/response coverage. Neither protects comparison failure → preserved review inputs → retry.

**Actual impact / current severity:** **P2 recovery.** A transient comparison failure forces re-upload/reinitialization instead of retrying the prepared home. No persistence loss or duplicate write is demonstrated. Comparison itself is not the destructive apply operation.

**Disposition: A.** Restore the comparison step on failure while preserving its current home/list/month choices and notification. Do not redesign bulk reconciliation, add a generic confirmation, change dates, or alter the apply payload. Add a focused failure/retry regression first in the implementation batch.

## R12

**Original finding / evidence:** Phase 7A P2 ordering risk: ToponymsList calls `tap(showSpinner = true)` before `switchMap`, and each inner request finalizes loading false.

**Current code path:** `toponyms-list.component.ts:198–233` retains exactly that order. On replacement query B, the outer tap sets true; switchMap unsubscribes pending A; A's finalizer sets false; B then subscribes with no subsequent loader acquisition. Installed `rxjs/src/internal/operators/switchMap.ts:104–108` explicitly unsubscribes the prior inner subscription before invoking the new project/subscription.

**7B–7D effect:** None. This is the specialized ToponymsList, not OrdersList, Audit, or shared Table. None of those local fixes changes this controller.

**Current reproducibility:** Source-provable when A is still pending as B starts. It does not require late A success: cancellation itself clears loading. Not newly exercised against the component with a controlled pending HTTP request here. Immediate `of(...)` responses do not expose the pending interval.

**Existing tests:** The initial-loading test supplies synchronous `of(...)` data and checks false after finalization. Sort/page/search tests and CRUD/import tests exist; upload lifetime is protected separately. No pending-A → pending-B loading assertion was found.

**Actual impact / current severity:** **P2 pending-state correctness.** The loading overlay disappears while replacement work is active. switchMap still cancels A, so this is not evidence that A overwrites B's rows, nor proof of duplicate writes.

**Disposition: A.** Give the replacement request loading authority after old cancellation has settled, or use a small local identity guard. First add one deterministic pending-A/B regression. Preserve query normalization, paging, cancellation, notifications, and the existing upload lifetime; do not reopen shared Table/AddressFilter.

## R14

**Original finding / evidence:** Phase 7A P2 localization bundle: two missing RU/EN keys, one literal tooltip expression, once-computed recipient filter labels, and hard-coded bulk helper text. Outbound Russian postal instructions were separately a product/content decision.

**Current evidence / reproducibility:**

| Item | Current evidence and user impact | Severity / disposition |
| --- | --- | --- |
| Clear-list warning | `occasions-list.component.ts:436` calls `PRIME_CONFIRM.CLEAR_LIST_MESSAGE`; neither dictionary defines it. The confirmation has translated warning/actions, but its operation explanation falls back to the missing key. | **P2, A.** A destructive action needs a readable explanation. Add only the missing RU/EN message with its existing occasion-name parameter. |
| Home official-name history heading | Owner template line 481 uses `TABLE.CARD.OUTDATED_HOME_OFFICIAL_NAMES_TITLE`, absent in both dictionaries. The heading is wrong; history behavior is protected elsewhere. | **P3, F.** Known display defect; no evidence of incorrect restoration/save behavior. Keep tracked for a later bounded localization pass. |
| Copy tooltip | `order-recipients.component.html:19` has a literal `matTooltip="translateService.instant(...)"`. The key itself exists in RU/EN. It shows code-looking help rather than the translated tooltip; copy logic is independent. | **P3, F.** Concrete display defect, not a clipboard/data correctness blocker. |
| Recipient filter labels | `recipients-list.component.ts:88–108` calls `instant()` into fixed arrays. BaseLayout changes language through LanguageService/TranslateService without recreating the route, and this component has no language refresh. Labels therefore retain their construction language. | **P3, F.** Source-confirmed stale UI language; boolean filter values do not change. No general localization rewrite is needed before Phase 8. |
| Bulk helper text | Start/review template contains Russian text outside translation bindings. The translated Start button and workflow remain. | **P3, F** for this helper-copy consistency issue; later targeted localization, not a correctness refactor. |
| Outbound instruction language | `order-ctrls.ts` contains Russian business/postal instruction content. Whether that output follows UI language is not specified. | **D.** Product/content decision, not an inferred translation bug. |

**7B–7D effect:** None on these templates, dictionaries, recipient arrays, or language activation. Occasions' existing option streams still use `translate.stream`; they are not wrongly classified as stale. No new RU/EN semantic-translation mismatch is claimed; wider copy quality is a manual review.

**Existing tests:** LanguageService lifecycle/activation tests and component smoke tests exist, but they do not require these two dictionary keys, inspect the literal tooltip, or switch language with RecipientsList mounted. No new localization tests were added here because the exact sources/dictionaries settle classification.

**Disposition:** **A only for the destructive confirmation; F/D for the explicitly separated remainder.** Include that one message in Phase 7G. This prioritizes actual consent clarity without manufacturing a general translation-cleanup batch.

## R15

**Original finding / evidence:** Phase 7A P2: unnamed OrderCard occasion-navigation buttons; clickable Audit InputIcon apply/clear controls lacking keyboard semantics; BaseLayout logo alternative text and profile-menu name missing. Rendered assistive-technology verification was pending.

**Current evidence / severity / disposition:**

| Control | Source-provable issue | Disposition |
| --- | --- | --- |
| OrderCard previous/next occasion | Template lines 17/23 contain icon-only buttons, with no label/title/text. Installed MatIcon marks icons `aria-hidden` by default; these buttons supply no alternative name. | **P2, A:** meaningful translated action names. |
| Audit apply/clear icons | Template lines 32–36, 67–73, 101–107 attach click handlers to `p-inputicon` without button semantics, focusability, or keyboard handlers. Installed InputIcon projects content and adds classes; it provides no button/keyboard contract. | **P2, A:** native keyboard-operable controls with names, retaining existing filter callbacks/visibility behavior. |
| BaseLayout logo | Template line 59 uses an image with routerLink but no `alt`; the image is not a native link element. | **P2, A:** meaningful home-navigation alternative/name and appropriate native link semantics. Exact rendered focus behavior still needs verification. |
| BaseLayout profile menu | Template line 78 uses an icon-only trigger with no accessible name; MatMenuTrigger's menu attributes do not supply its action name. | **P2, A:** label the existing trigger, preserve menu behavior. |
| Adjacent BaseLayout language menu | Line 111 has the same unnamed icon-only-trigger pattern. This is a directly equivalent source instance within the already inspected layout, not a repository-wide accessibility expansion. | **P2, A:** include the trigger name in the same bounded layout fix. |

**7B–7D effect:** OrderCard TS ownership, Audit TS recovery, and error diagnostics changed; these templates and their accessibility semantics did not.

**Current reproducibility:** Structural absence/invalid interactive semantics are established from templates plus installed implementations. No claim about a particular screen reader's spoken output, exact Tab sequence, contrast, focus trap, or focus restoration is made without running it.

**Existing tests:** OrderCard/Audit behavioral specs and BaseLayout routing/permissions tests do not assert accessible names or keyboard activation. Cypress's permission checks are not an accessibility audit.

**Actual impact / current severity:** **P2 accessibility**, especially keyboard users needing Audit apply/clear and assistive-technology users identifying icon actions. No production behavior change was made here.

**Disposition:** **A** for the concrete controls above in Phase 7G; **C** for the rendered keyboard/focus/screen-reader/contrast checks. Do not replace this with indiscriminate relabeling or a UI/CSS redesign.

## R16

**Original finding / evidence:** Phase 7A P2 incomplete feature: Send buttons call an empty `onSendRecipientClick`; the row menu passes IDs while its signature says Recipient objects.

**Current code path:** `recipients-list.component.ts:328` remains empty. The caption button at HTML line 49 passes selected Recipient objects; the row menu at line 236 passes `[recipient.id]`. `cannotSendRecipients` enables the caption action for selected non-absent rows; the row action checks absence. No handler request, status update, success/failure handling, or refresh exists.

**7B–7D effect:** None. The 7C child creation-dialog lookup fix did not implement or change Send.

**Current reproducibility:** The no-op and argument-shape mismatch are source-proven. Activation has no application effect; no new browser reproduction was needed. The mismatch is currently inert because the handler does nothing.

**Existing tests:** RecipientsList has smoke/occasion initialization coverage; RecipientService and the creation dialog have separate protections. No Send behavior contract/test exists.

**Actual impact / current severity:** **P2 incomplete-feature/UX concern.** An enabled action suggests work can happen but does nothing. It is not evidence of a destructive write or authorization bypass.

**Disposition: D.** Decide what Send means, the allowed transition/permissions, and whether to implement it or explicitly present it as unavailable. Resolve object-versus-ID input as part of that decision. Do not invent an endpoint, wire speculative status changes, or silently remove the feature. Release acceptance should explicitly account for this unresolved product item.

## ACCESSIBILITY SUMMARY

Fix the listed code-proven names and interactive semantics in one bounded batch. Verify keyboard activation, focus placement/restoration, screen-reader names/announcements, and contrast manually afterward (**C**). No manual result is inferred from the green unit/Cypress permission suite.

## PERMISSION / AFFORDANCE SUMMARY

R10 is a local edit-affordance defect with an avoidable forbidden request. Route admission for VIEW_ORDER is intentional; backend PATCH authority remains EDIT_ORDER. No security-boundary change is recommended. Preserve Phase 7B creation-dialog behavior: no invented IDs, captured known-ID edit refresh, and safe cancel/no-result handling.

## LOCALIZATION SUMMARY

The missing destructive clear-list explanation is the only localization item prioritized before Phase 8. The history heading, tooltip binding, retained-language arrays, and Russian bulk helper remain real but lower-impact tracked defects (**F**). Outbound postal-instruction language requires a product decision (**D**); general semantic/copy quality is manual verification (**C**).

## DESTRUCTIVE WORKFLOW SUMMARY

| Workflow | Confirmation / cancel | Repeat submission | Failure / dependencies | Successful completion | Assessment |
| --- | --- | --- | --- | --- | --- |
| Order recipient removal | Explicit Edit → staged removals → Save; Cancel clears staged IDs without a request. No generic confirmation is inferred as required. | Save exits edit UI immediately; direct/reentrant submission is not characterized. | Parent finalizes loading and reports errors; backend minimum-recipient rule can return 409. Current service tests cover PATCH shape, not this component's conflict/retry UX. | Parent replaces order from response. | R10 **A**; other retry/repeat boundaries **B**, not a proven duplicate-write defect. |
| Occasion delete / recipient-list clear | Existing accept-only confirmation callbacks; cancellation does not invoke the mutation. Clear message is missing (R14). | No explicit per-action controller latch shown; smoke coverage does not prove duplicate-request handling. | Existing MessageWrapper path; backend blocks occasion dependencies and list/order dependencies with 409. No component-specific conflict/retry characterization. | Reloads occasions. | R14 message **A**; independent repeat/lifetime/conflict checks **B**. Do not add a second generic confirmation. |
| Selected recipient delete | Existing confirmation; UI disallows empty/allocated selections. Cancel does not start the request. | Loading is set, but repeat acceptance and pending-action ownership are not directly tested. | Finalizer releases loading; error is reported. Backend rejects recipients used in orders with 409. Transport conflict tests are not proof of this controller's recovery. | Clears selection and resets/reloads table. | **B** for narrowly targeted characterization; no newly demonstrated destructive failure. |
| Bulk apply | Explicit preparation/comparison/review before Apply; do not invent a new confirmation policy. | Overlay alone does not establish keyboard/reentrant protection. | Finalizer reports/releases failed writes; comparison recovery is separately broken (R11). | Clears current review, advances home index, processes next home. | R11 **A**; repeat apply/accepted-change/partial-failure checks **B**, overlay interaction **C**. |
| Toponym delete | Confirmation → dependency count → delete only if zero; reject performs no mutation. | No pending-double-accept test found. | Errors handled inside the request path; nonzero dependencies skip delete. | Resets table and address selection. | Existing happy/dependency tests reduce core risk; further repeat/failure checks **B**, loader R12 **A**. |
| Role delete/edit | Existing confirmation, dependency check, rejection, busy/rollback behavior are covered in roles-list integration-style specs. | Some concurrent-edit/revocation boundaries remain partial. | Dependency path prevents delete; error/rollback behavior protected. | Reloads roles on delete success. | Core current behavior **F**; additional concurrency checks **B**, no new role implementation batch. |

Backend route checks were inspected read-only, not exercised against PostgreSQL here. Test gaps alone are not proof of duplicate writes, bypasses, or corrupted data. These B items are a verification backlog, not a third required frontend implementation batch.

## DATE / DOWNLOAD / VISUAL SUMMARY

| Item | Current evidence | Disposition |
| --- | --- | --- |
| Audit UTC date ranges | Existing UTC boundary construction and tests remain; app LOCALE_ID is still statically ru-RU and Audit uses DatePipe. DateUtils independently chooses display locale from active language. | **D/C:** define UTC-day/local-day and display policy; verify DST/calendar cases. No newly demonstrated date-shift defect; static Russian DatePipe is not automatically a bug. |
| Bulk dates / export filenames | Bulk retains explicit calendar-part normalization; report/statistic filenames use `toISOString().slice(0, 10)`. Local midnight can differ from UTC filename date. | **D/C:** business date semantics and timezone/manual matrix; no speculative date fix. |
| Application download behavior | FileService Blob decoding/passthrough, operation identity, one diagnostic, notifications, and responseType are protected after 7D; template saveAs/import behavior and Reporting exports retain existing tests. | **F** for completed application boundaries; **B** only for a specifically required uncovered application interaction. Do not reopen R13. |
| Browser downloads | MIME/filename presentation, actual save dialog, repeated clicks, supported browser behavior, and ObjectURL timing are not established by unit tests. | **C:** browser verification, no speculative compatibility code. |
| `items-center` | Current templates use it; imported PrimeFlex defines `.align-items-center`, not `.items-center`; no source CSS/SCSS alias was found. This is a definite unresolved utility-class reference under current styles. | **C:** screenshot/visual alignment check. No functional harm demonstrated; not a correctness batch or permission to change CSS here. |
| `fxLayout` / `fxLayoutGap` | OrderDetails still has the attributes; no matching project directive/provider or CSS rule was found. Native block layout/other styles may already supply acceptable presentation. | **C:** unsupported layout hint/reference; actual visual impact requires inspection. |
| Overlays / modal and flex layout | Presence of CSS/overlay markup alone cannot establish all viewport, keyboard, focus, or hit-target behavior. | **C:** targeted visual/keyboard checks; no automatic styling rewrite. |

## PRODUCT UX ITEMS

Home `postalAddressPart` remains nullable. The shared schema TODO and `frontend-phase6-todos.md` explicitly distinguish legitimate no-street/no-building addresses from accidental omissions. Phase 7A classified this as product UX, not a correctness blocker. **D**: agree an explicit absence choice/confirmation before making validation stricter. R16 Send and outbound instruction language are separate product decisions; none was implemented here.

## STATIC TYPING DEBT / DIALOG CONTRACTS

`DialogData<T>.componentType` is a registry-key union independent of `T`. A future manually mismatched configuration can therefore compile; the host contract does not validate owner/model correlation at runtime. Current owner/toponym configurations use matching fixed component kinds and model objects; no current mismatch path was found.

Phase 6J's typed child methods/signals and real-child host tests remain intact. This is **F — safe engineering debt**, not a proven current runtime defect and not a reason to redesign the generic API now. The current host still closes with `{ refresh: !!data }`. No new ID contract is inferred; Phase 7B's captured-known-ID edit refresh and stopped creation continuation remain authoritative. Existing ToponymsList dialog-refresh tests concern that separate consumer and do not reopen 7B.

## BUILD / RELEASE ITEMS

**E — Phase 8/release build work.** The 5 MB initial budget is still configured. Phase 6M/7A recorded approximately 5.05 MB and a pre-existing failure, including failure before Phase 6. `angular.json` and package/dependency declarations are unchanged across the inspected Phase 7 changes. The failure therefore predates 7B–7D; no evidence attributes its origin to these local fixes.

No production build was rerun in 7E, so no newly measured current byte count or zero-size-impact claim is made. Phase 8 should reproduce/measure the current release bundle and address the gate; do not simply raise budgets, change dependencies, or redesign lazy loading in this verification phase.

## NEW TESTS ADDED

**0.** Current controllers, installed operator/component implementations, translations, existing tests, and prior build evidence are sufficient for classification. No test was skipped, weakened, removed, or changed. New targeted failing regressions belong before the subsequent approved fixes; no artificial red test was needed merely to repeat source evidence here.

## NEW DEFECTS EXPOSED

**No new runtime/test failures.** R09–R12/R14–R16 remain existing findings, not newly invented defects. The adjacent BaseLayout language trigger is one additional source instance of the same R15 naming issue within the already scoped layout. No new database corruption, authorization bypass, browser incompatibility, or date-policy defect was demonstrated.

## FRONTEND IMPLEMENTATION STILL REQUIRED: YES

Exactly two implementation batches are recommended. Each should start with focused regression/DOM tests for its boundary, then validate affected specs and the full suite. Existing 705 green tests do not characterize all the source-confirmed mechanisms above.

### Phase 7F — local recovery, loading, and order edit affordance

- **Scope:** OrderDetails R09 and R10; SeniorsBulkUpdate comparison retry R11; ToponymsList loader R12. Work incrementally per controller.
- **Expected behavior:** Individual route-fetch failure leaves later route fetches alive and old data is not current; VIEW-only users retain viewing without recipient-write affordances; failed comparison restores Start/month-selection retry without discarding prepared input; replacing a pending toponym query retains current loading.
- **Expected files:** OrderDetails controller/template and focused specs; OrderRecipients only if the minimal boundary actually requires it; bulk controller and failure/retry spec; ToponymsList controller and loading spec. No backend, shared Table, generic request manager, business payload, permission infrastructure, or Phase 7B/7C redesign.
- **Protection:** Deterministic HTTP/subject controls for route failure→next request, stale order visibility, viewer/editor status/permission combinations, compare failure→retry, and pending A→B spinner ownership. Preserve all current service contracts, notifications, cancellation, and completed regressions.
- **Why required:** These are concrete current recovery/authority/UI-state problems with clear expected behavior, not speculative coverage work. Risk is local/medium; establish tests before each fix.

### Phase 7G — concrete accessibility controls and destructive-message clarity

- **Scope:** R15's listed occasion navigation, Audit apply/clear controls, and BaseLayout logo/profile/language navigation; R14's missing clear-list confirmation message only.
- **Expected files:** Those component templates, focused accessibility/interaction specs, RU/EN entries required for meaningful action names and the existing clear-list message. Component code only if necessary to preserve the same existing callbacks.
- **Expected behavior:** Named, keyboard-operable actions with unchanged business callbacks/filter values; readable destructive explanation in both supported languages. Preserve 7B/7C async ownership and existing layouts/actions.
- **Protection:** DOM semantic/name/activation checks, both-language confirmation/message checks, existing permission/routing suites, then manual keyboard/focus/screen-reader verification. Do not turn this into global translation cleanup, CSS work, or a general component redesign.
- **Why required:** The structural accessibility defects and destructive warning have concrete user impact and a clear correction. Other R14 display polish remains tracked/deferred; R16 awaits a product decision.

No third frontend implementation batch is prescribed. Keep B/C/D/E/F items in their own verification/product/release/debt tracks rather than silently expanding either batch.

## VALIDATION

| Check | Result |
| --- | --- |
| Full frontend | **705/705 passed, 0 failed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| Cypress permissions, existing stub setup | **8/8 passed** |
| Production TypeScript | **Passed** |
| `git diff --check` | **Passed** |
| New/changed tests | **0** |
| Production/backend/schema/dependency/configuration changes | **0** |

Commands: `npm test -- --watch=false --browsers=ChromeHeadless`, with existing Auth/Routing includes for focused runs; `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`; established Cypress `permissions.cy.ts` stub runner; `git diff --check`. Logs: `C:\Users\Owner\AppData\Local\Temp\phase7e-reassessment-a546cd1f`.

Production files changed: **0**.

PHASE 7E — REMAINING FINDINGS REASSESSMENT COMPLETE
Production files changed: 0
