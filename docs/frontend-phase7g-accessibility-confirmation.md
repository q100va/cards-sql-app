# PHASE 7G — ACCESSIBILITY SEMANTICS / DESTRUCTIVE CONFIRMATION

## Baseline and exact scope, mapped before production edits

Starting verified baseline: **714/714 frontend tests passed**. Sources: `frontend-phase7a-whole-frontend-audit.md` R14/R15 and `frontend-phase7e-remaining-findings-reassessment.md`. No broader accessibility/localization audit or product work is included.

| File / control | Existing markup or text | Confirmed problem | Code-level correction |
| --- | --- | --- | --- |
| `pages/occasions-list/occasions-list.component.ts`, `onClearListClick` | Translates missing `PRIME_CONFIRM.CLEAR_LIST_MESSAGE` with occasion `name`; existing Yes/No confirmation then `clearList(id)`. | Both dictionaries lack the destructive-action explanation. | Add only that message in RU/EN. Preserve component, dialog mechanics, request, and reload. |
| `pages/order-card/order-card.component.html`, previous/next occasion | Icon-only `mat-icon-button`, `goBack` / `goForward`, without an explicit name. | Material hides its icon from assistive technology by default, leaving no action name. | Translated explicit aria-labels and `type="button"`; retain icons and handlers. |
| `shared/base-layout/base-layout.component.html`, home/logo | Clickable/router-linked image with no alt; no native anchor. | Missing meaningful alternative and native link semantics. | Native anchor to the same `/` destination, same image/classes/size, translated image alt naming the link. |
| Same layout, profile menu | Existing icon-only MatMenuTrigger with no name. | No accessible action name. | Explicit translated aria-label and non-submit button type; preserve trigger/menu/permission behavior. |
| Same layout, adjacent language menu | Same unnamed MatMenuTrigger pattern, explicitly included by 7E. | No accessible action name. | Reuse translated `LANG.SWITCH` as an explicit aria-label; preserve switching/menu mechanics. |
| `pages/audit-table/audit-table.component.html`, date range apply/clear | Click-only `p-inputicon` with visibility/pointer state and positioned icon classes. | No native interactive/keyboard contract. | Named native non-submit buttons, retaining icon/position/visibility/callbacks and making empty/unavailable controls disabled. |
| Same Audit template, entity/user/correlation ID apply/clear | The same icon pattern for each of three existing filters. | Same code-proven semantics gap in the scoped apply/clear controls. | Same native-button correction for all three pairs; no additional filter/input accessibility sweep. |

Audit therefore has **four existing apply/clear pairs (eight controls)** in scope. This includes the identical user-ID pair between the entity and correlation filters; no new action type is introduced.

## R14 consequence trace

Occasion clear-list action → existing confirmation → existing translated `name` parameter → acceptance calls RecipientService `clearList` → PATCH `/api/recipients/clear-list/` with `{ occasionId }` → existing success reload.

The backend route was inspected read-only: it checks dependencies, deletes Recipient rows belonging to that occasion, and updates its recipient count. It does not delete the senior/occasion entities. The message should explain removal of all recipients from that list. No claim of absolute irreversibility is warranted; no new business rule or recovery promise is introduced.

## R14

**Finding:** The existing occasion clear-list confirmation displayed the missing key rather than an explanation of the removal.

**Files changed:** `public/i18n/en.json`, `public/i18n/ru.json`; new `src/app/pages/occasions-list/occasions-list.clear-confirmation.spec.ts`. The OccasionsList controller, confirmation callbacks, and RecipientService are unchanged.

**Previous confirmation:** `PRIME_CONFIRM.CLEAR_LIST_MESSAGE` was absent in both languages. Header and Yes/No actions existed, but the message fell back to the key.

**New confirmation:**

- EN: `Clear the recipient list for '{{name}}'? All recipients will be removed from this list.`
- RU: `Очистить список получателей для «{{name}}»? Все получатели будут удалены из этого списка.`

**RU/EN key:** `PRIME_CONFIRM.CLEAR_LIST_MESSAGE`, using the existing occasion-name interpolation. It identifies both the selected occasion and all recipients in that list. It makes no claim of absolute irreversibility and does not suggest deleting seniors or the occasion.

**Behavior preserved:** Same permission-gated action, warning header, accept/reject labels, close settings, callback, PATCH body, dependency checks, success notification, and reload. No request is sent on rejection. Acceptance still sends `{ occasionId }` to the same endpoint and reloads after success.

**Tests — 2:** The real PrimeNG confirmation renders the actual English/Russian message. In each language, the existing Reject button sends no destructive request/reload; reopening and accepting sends the original PATCH and reloads once after its successful response. No fake message dictionary or production confirmation replacement is used.

## R15

**Findings fixed:** Two unnamed occasion-navigation buttons; a non-native home/logo link without alternative text; unnamed profile/language triggers; eight click-only Audit filter icons.

**Files changed:**

- `src/app/pages/order-card/order-card.component.html`
- `src/app/shared/base-layout/base-layout.component.html`
- `src/app/shared/base-layout/base-layout.component.css`
- `src/app/pages/audit-table/audit-table.component.html`
- `src/app/pages/audit-table/audit-table.component.css`
- `src/app/pages/audit-table/audit-table.component.ts` — imports/component metadata only
- Both RU/EN dictionaries listed above

**Accessible-name changes:**

| Control | Translation key / English output |
| --- | --- |
| Previous occasion | `ORDER.CARD.PREVIOUS_OCCASION_LABEL` — Previous occasion |
| Next occasion | `ORDER.CARD.NEXT_OCCASION_LABEL` — Next occasion |
| Home image/link alternative | `TOOLBAR.HOME_LINK_LABEL` — Home page |
| Profile/user menu | `TOOLBAR.PROFILE_MENU_LABEL` — User menu |
| Language menu | Existing `LANG.SWITCH` — Language |
| Date apply/clear | `AUDIT.APPLY_DATE_FILTER`, `AUDIT.CLEAR_DATE_FILTER` |
| Entity ID apply/clear | `AUDIT.APPLY_ENTITY_ID_FILTER`, `AUDIT.CLEAR_ENTITY_ID_FILTER` |
| User ID apply/clear | `AUDIT.APPLY_USER_ID_FILTER`, `AUDIT.CLEAR_USER_ID_FILTER` |
| Correlation ID apply/clear | `AUDIT.APPLY_CORRELATION_ID_FILTER`, `AUDIT.CLEAR_CORRELATION_ID_FILTER` |

The Audit labels explicitly say `Apply/Clear <date range/entity ID/user ID/correlation ID> filter`. Matching Russian values exist for every new label. A dictionary comparison confirmed **13 added keys per language, identical added-key sets, and zero changes to existing translation values**. Language naming reuses its existing key; unrelated keys were not renamed.

**Interactive-semantics changes:** The logo is now an actual anchor to the same `/` route, named by its translated image alt. The same image, `nav-logo` class, size, and margin remain. Its new wrapper uses only `display: inline-flex` to avoid introducing an inline-image line-box gap.

Audit's eight actions are native buttons. Existing `pi` glyph classes, implicit former `p-inputicon` class, inline positions, visibility, pointer state, and click expressions remain. Empty filters still hide their actions and now also set the native disabled property. A scoped three-property CSS reset removes default native-button border, padding, and background; it does not remove the focus outline or restyle unrelated controls. The obsolete InputIcon import was removed, and TranslateModule supplies the new label pipes.

**Language-menu trigger:** Verified as the same documented unnamed-trigger issue. It now explicitly uses `LANG.SWITCH`; the existing menu, language options, and LanguageService calls remain. Tests select Russian through the existing menu and observe natural updates to the scoped labels/alt text using the real service and dictionaries.

**Button/form semantics:** All twelve scoped buttons (two occasion actions, two menu triggers, eight Audit actions) explicitly use `type="button"`. The home action uses a native anchor. No custom Enter/Space handlers, simulated `role="button"` wrappers, or new tabindex rules were introduced. Existing submit buttons and permission gates remain unchanged.

**Tests — 6:**

1. Occasion buttons render with translated names and non-submit native types; next/previous preserve the existing initial middle-occasion selection and wraparound behavior.
2. Home logo has a meaningful translated alt, sits in a native anchor, and keeps the existing router destination.
3. Profile/language triggers retain real menu behavior and translated names; the existing Russian selection updates the names naturally.
4. All eight Audit controls are named native non-submit buttons; empty/unavailable controls are hidden and disabled.
5. The entity/user/correlation apply/clear actions pass the same metadata through real PrimeNG filter callbacks and preserve the resulting query/state clearing.
6. Date apply retains the existing UTC range packing, and clear retains its null callback/state reset.

The tests use rendered components and semantic element/label queries, not component-source string assertions or DOM indices. No native keyboard/browser behavior beyond the markup contract is claimed from the click assertions.

## Test files / fixture support

New specs:

- `src/app/pages/order-card/order-card.accessibility.spec.ts`
- `src/app/shared/base-layout/base-layout.accessibility.spec.ts`
- `src/app/pages/audit-table/audit-table.accessibility.spec.ts`
- `src/app/pages/occasions-list/occasions-list.clear-confirmation.spec.ts`

New test-only helper: `src/app/testing/public-translations.spec-fixtures.ts` loads the actual public RU/EN JSON into the existing TranslateService, without changing dependencies, compiler options, loader architecture, or Karma configuration. Fake clocks own Audit initialization/debounce and PrimeNG animation completion; no arbitrary wall-clock sleeps were added. Layout tests restore persisted/document language state.

The existing `audit-table.component.spec.ts` required **two setup lines**: import and provide the existing translation service now used by its template. Its nine test bodies, names, and expectations are unchanged. No other existing spec was modified.

## Manual accessibility items still requiring verification

This phase verifies code-level names, native elements, disabled/type attributes, translated output, and existing callbacks. It does **not** verify:

- Screen-reader announcement quality/pronunciation and navigation context.
- Actual focus order, trapping, or restoration in menus/dialogs.
- Visual focus visibility, contrast, or target geometry.
- Cross-browser keyboard activation and interaction behavior.
- Zoom/reflow or the rendered layout across supported viewports.

These remain in the manual-verification ledger. Existing Cypress permission checks are not a full accessibility audit. Styling was preserved at the class/position/reset level; no pixel/visual equivalence claim is made.

## Deferred R14 items unchanged

- Missing Home official-name history heading key.
- Literal OrderRecipients copy-tooltip expression.
- Recipient filter labels' runtime-language refresh.
- Russian bulk helper text and outbound instruction-language policy.

PrimeFlex/items-center, general CSS/visual issues, R16 Send, postalAddressPart UX, date policy, static DialogData model correlation, bundle budgets, and cross-browser download verification also remain untouched.

## Validation

Clean pre-production regressions: **8 failed, 0 passed** for the missing message/names/native controls. Final focused run: **8/8 passed**. New test fixtures were aligned with the existing widget overlay/clock and middle-occasion behavior; no production behavior was changed to satisfy fixture assumptions.

Required sequence: new focused specs → affected existing specs → Auth/Routing/Cypress permissions → full frontend → production TypeScript → final diff check.

| Check | Result |
| --- | --- |
| New focused specs | **8/8 passed** |
| Affected existing specs | **62/62 passed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| Cypress permissions | **8/8 passed** |
| Full frontend | **722/722 passed, 0 failed** |
| Production TypeScript | **Passed** |
| `git diff --check` | **Passed** |

Final total: **714 existing tests + 8 new tests = 722 passed, 0 failed**. No tests were removed, skipped, focused, or weakened. No new broad `any` or type suppressions were introduced.

The 62 affected existing tests cover OrderCard's component/ownership/retry specs, Audit's normalization/recovery specs, BaseLayout's permission/navigation specs, OccasionsList, OccasionService, RecipientService, and LanguageService.

Karma commands use `npm test -- --watch=false --browsers=ChromeHeadless`, with explicit focused includes where applicable. Auth/Routing use their established spec sets; Cypress runs the existing permission spec in stub mode; production TypeScript uses `tsc -p tsconfig.app.json --noEmit`. Logs and semantic diff review: `C:\Users\Owner\AppData\Local\Temp\phase7g-accessibility-d9181141`.

## Behavior preserved / diff review

- Destructive accept/reject, payload, dependency handling, and post-success refresh remain unchanged.
- Existing scoped click expressions are identical; the home router destination is unchanged.
- Audit's executable class is byte-for-byte unchanged after newline normalization; its TS edits only replace the unused icon module with translation imports/metadata.
- OrderCard/BaseLayout/Occasions controllers, HTTP services, schemas, backend, routes, permission constants, validation, and dialog results are unchanged.
- Phase 7B/7C/7D/7F logic remains protected and untouched. No generic accessibility, permission, request, logging, or localization infrastructure was added.
- CSS changes are confined to the new native-element wrapper/reset required by the scoped conversions; unrelated styling is unchanged.
- All existing translation values are unchanged. Only the necessary new labels/message were added in both languages.
- Pre-existing documentation was preserved.

PHASE 7G — ACCESSIBILITY SEMANTICS / DESTRUCTIVE CONFIRMATION COMPLETE
