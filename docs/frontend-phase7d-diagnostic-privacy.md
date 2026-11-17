# PHASE 7D — DIAGNOSTIC METADATA / PRIVACY BOUNDARY

## Confirmed findings and diagnostic trace

This batch addresses Phase 7A findings R03 and R13 only. Starting verified baseline: **700/700 frontend tests passed**.

The following paths were mapped before production edits:

| File / method | Failed operation | Before: caller context / error | Domain-data risk or identity gap | Downstream path |
| --- | --- | --- | --- | --- |
| `advanced-details.component.ts` / `checkOwnerData` error callback | Owner duplicate-data preflight | `source: 'CreateOwnerDialog'`, `stage: 'checkOwnerData'`, `kind`, **`owner: this.ownerDraft`** | Draft names, nested contacts, notes, and owner-specific fields could reach diagnostics on unmarked errors. | MessageWrapper parses error metadata, logs unmarked errors, and independently shows a toast. ClientLogger masks context and buffers it for `/api/client-logs`. |
| `advanced-details.component.ts` / `saveOwner` error callback | Owner creation | `source: 'CreateOwnerDialog'`, `stage: 'saveOwner'`, `kind`, **`owner: this.ownerDraft`** | Entire creation draft, including Home postal text and names, nested contacts, and notes. | Same MessageWrapper → ClientLogger → log transport path. |
| `file.service.ts` / `downloadFile` → `handleError` | Template download: GET `/api/files/download/:encodedFilename`, `responseType: 'blob'` | The interceptor records safe HTTP metadata and marks the original HttpErrorResponse. FileService decodes Blob JSON/text and creates another HttpErrorResponse. | The new object lost the WeakSet diagnostic marker. MessageWrapper could record a second diagnostic for the same failed request. | `httpErrorInterceptor` → FileService normalization → caller's MessageWrapper → ClientLogger. |

The actual download consumers are `SeniorsBulkUpdateComponent.onFileDownloadClick` and `ToponymsListComponent.onFileDownloadClick`. Their existing error contexts contain source/stage and, for toponyms, resource type. Current template filenames are fixed application configuration (`template-seniors.xlsx`, `template-countries.xlsx`, `template-regions.xlsx`, `template-districts.xlsx`, `template-localities.xlsx`). No filename, payload, or URL context was added.

AdvancedDetails' other error contexts already contain metadata: role-list loading uses source/stage/kind; updating an existing owner uses source/stage/kind/ownerId. They were left unchanged.

## Files changed

Production:

- `src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.component.ts`
- `src/app/services/file.service.ts`

New tests:

- `src/app/shared/dialogs/details-dialogs/advanced-details/advanced-details.diagnostics.spec.ts`
- `src/app/services/file-diagnostics.integration.spec.ts`

Report: `docs/frontend-phase7d-diagnostic-privacy.md`.

Production diff: **3 inserted lines, 2 removed lines**. No existing tests were modified.

## Owner-draft diagnostic before/after

**Before:** The two callbacks passed the whole draft as `owner`. MessageWrapper's log context spread retained it. Existing secret-key redaction and email/phone masking do not generally remove names, postal text, or arbitrary free text.

**After:** Remove only `owner: this.ownerDraft` from these two diagnostic contexts. Keep source, stage, and kind. The draft still flows to the same business services and request bodies.

**Safe metadata retained:** Existing operation identity (`source`, `stage`), owner kind, and error-derived code, HTTP classification, status, sanitized route, and correlation ID where available. No owner ID or request ID was invented.

**Sensitive/domain data removed:** The draft object and its names, addresses/postal text, nested contacts, notes, restrictions, and other domain fields are no longer caller diagnostic context in these two paths.

## Generic-helper and masking review

MessageWrapper receives the error and caller metadata separately. It does not reload the owner, raw form, or request body. For these response-validation failures, the diagnostic error is a code-bearing ValidationError; HTTP errors produce the existing code/status/path/correlation metadata. Backend `data` remains available only to the existing translation/notification path, rather than being copied into diagnostic context.

ClientLogger retains its existing context masking, secret-key redaction, email/phone masking, message/stack handling, transport, recursion protection, and teardown. Its console object serialization already applies that same masking. No new serializer, fallback expansion, allowlist framework, redactor, or logging service was introduced.

The privacy fix belongs at the two callers: the shared helper cannot infer which arbitrary owner fields are business data. Neither ClientLogger nor MessageWrapper needed modification for these scoped paths.

## Blob diagnostic before/after

**Before:** A failed download was recorded by the HTTP interceptor, then could be recorded again by MessageWrapper after Blob decoding changed error-object identity.

**After:** When the original error already has a diagnostic marker, mark the normalized HttpErrorResponse using the existing `hasErrorDiagnostic` / `markErrorDiagnostic` functions. An unmarked original remains unmarked until its notification path records the diagnostic. No shared error API was changed.

**Safe operation/resource identity:** The original interceptor record remains the diagnostic owner, with `HTTP <status> GET /api/files/download/<template>`, request method/path, response status, and existing header correlation ID. Its Blob body is not inspected or logged. The preserved record already identifies the failed download; adding a second operation label was unnecessary. An unmarked error still produces the existing source/stage/path/status/code/correlation diagnostic through MessageWrapper.

**Error identity behavior:** Blob JSON decoding and text fallback still return an HttpErrorResponse with the same status, status text, headers, URL, and decoded body. Invalid JSON still uses the existing text fallback. Non-Blob passthrough and other error paths were not changed. No HTTP, parse/read, or consumer download/write failure was flattened into a generic string.

**User notification behavior:** Unchanged. The decoded domain code still selects its existing translated toast; plain text still follows the existing status-based fallback. Severity, summary, sticky behavior, sanitization, and available correlation-ID suffix remain unchanged. One user notification still occurs even when the diagnostic was already recorded.

## Tests added — tests first

Five focused tests were added before production edits:

1. Partner duplicate-check response validation: a diagnostic remains identifiable while the draft, sensitive name/note, and nested contact are absent from raw logger metadata and the serialized batch.
2. Home creation response validation: names, postal address text, notes, and nested contacts remain in the real request but are absent from diagnostics; the error toast and spinner completion remain.
3. Intercepted JSON Blob failure: one diagnostic, preserved HTTP identity and request ID, decoded domain-code notification, and no body data in diagnostics.
4. Intercepted text Blob failure: one diagnostic, preserved HTTP identity and request ID, original fallback notification, and no Blob/text content in diagnostics.
5. Unmarked JSON Blob failure: the required diagnostic is still recorded once, so normalization cannot blindly mark every error as already logged.

Owner fixtures use `SENSITIVE_NAME`, `SENSITIVE_ADDRESS`, `SENSITIVE_CONTACT@example.com`, and `SENSITIVE_NOTE`. Blob fixtures include `SENSITIVE_NAME`, `SENSITIVE_ADDRESS`, `SENSITIVE_CONTACT`, and `SENSITIVE_BLOB_BODY`. Tests inspect raw logger arguments and actual log-transport batches, so masking cannot hide a caller-level leak. Download tests also assert the complete allowed raw metadata; an opaque Blob object cannot escape detection merely because JSON serialization hides its bytes.

The clean pre-fix focused run reproduced **4 failed, 1 passed**: two owner privacy failures and two duplicate Blob diagnostics; the unmarked control passed. Test setup was corrected to supply the dialog's address defaults before this clean reproduction; no production initialization change was made. After the production fix, focused tests pass **5/5**. Existing tests and expectations were neither weakened nor changed.

## Validation

| Check | Result |
| --- | --- |
| New privacy/diagnostic specs | **5/5 passed** |
| Directly affected existing specs | **100/100 passed** |
| Full frontend | **705/705 passed, 0 failed** |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| Cypress permissions | **8/8 passed** |
| Production TypeScript | **Passed** |
| `git diff --check` | **Passed** |

The 100 existing tests cover the five concrete owner details components, AdvancedDetails lifecycle/mode, FileService, MessageWrapper, ClientLogger, global errors, console privacy, HTTP interception, logging integration, and response validation.

Exact full-suite total: **700 existing tests + 5 new controls = 705 passed, 0 failed**.

Karma commands use `npm test -- --watch=false --browsers=ChromeHeadless`, with explicit `--include` paths for focused runs. The full run omits includes. Production TypeScript uses `tsc -p tsconfig.app.json --noEmit`; Cypress uses the existing `permissions.cy.ts` stub-mode workflow. No build-budget work was run or included.

## Behavior preserved / final review

- No owner draft or domain object is included in the two scoped diagnostic contexts; sensitive sentinels do not reach their metadata or serialized transport.
- Operation/owner/resource identity and available correlation IDs remain useful without adding domain values.
- Download Blob/body content is not logged; normalization preserves the HTTP error contract and diagnostic ownership.
- Existing masking, redaction, user-facing notification semantics, HTTP endpoints/methods/query/body/responseType, loading, retry, and successful download behavior are unchanged.
- No success logging, logging architecture, error-envelope architecture, backend, schema, DTO, dependency, or configuration changes were added.
- Phase 7B/7C async ownership code and its regression specs remain unchanged. AdvancedDetails changes only the two error-context object literals; no save/lifecycle architecture or behavior was refactored.
- No tests were removed, skipped, focused, or weakened; no new broad `any` or type suppressions were introduced.
- Pre-existing untracked documentation was preserved.

## Remaining Phase 7 findings

R03 and R13 are addressed here. Prior deferred findings remain outside this batch: R09 OrderDetails route-error recovery, R10 recipient-edit permission affordance, R11 bulk comparison retry, R12 ToponymsList loading/cancellation ordering, R14 localization, R15 accessibility, and R16 Recipient Send semantics. The previously recorded build-budget issue, postal-address UX, dialog model correlation, date policy, and cross-browser download verification were not reopened. These are carried forward from the existing audit, not newly investigated or fixed in 7D.

PHASE 7D — DIAGNOSTIC METADATA / PRIVACY BOUNDARY COMPLETE
