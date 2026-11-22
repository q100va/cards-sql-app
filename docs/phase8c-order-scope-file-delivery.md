# PHASE 8C — ORDER SCOPE / WORKBOOK DELIVERY

## Order list

The old backend admitted either list permission and applied the same filters and metadata queries to both. The new two-actor PostgreSQL regression reproduced a limited user's receipt of both order rows before the fix.

The Angular personal link is labeled My Orders and navigates to `/orders/:userId` using the signed-in ID. OrdersList turns that route parameter into an equality filter on `userId`. The stored ownership field for this contract is therefore `Order.userId`. The standalone `/orders` route requires the full-list operation.

The server reads the role's active list grants and uses `req.user.id` from the verified access token. A limited-only request adds the actor's ID as a separate AND condition alongside client filters. An explicit filter for another user returns an empty list and zero total. Other filters and paging retain their behavior. The same condition feeds both the list and the total. Limited options contain the actor as the only user and only occasion periods belonging to the actor's orders. Option scope is independent of the current page or temporary filters. Status and source options are static catalogs. The full grant takes precedence, including when both grants are present, and keeps the existing filtering and full option catalogs.

The integration regression verifies two distinct owners and occasion years, a conflicting user filter, a page beyond the actor's results, and full precedence and filtering. Order create, detail, status, recipient edit and delete remain on their previous paths. The request DTO and response properties are unchanged.

## Workbook delivery

The old route accepted any of three operations and read from the static public root. Its Senior operation was misspelled in the plural. The UI and operation registry use the singular operation. Homes, reports and statistics generate their exports in the browser, so they have no server workbook source or filename-to-operation mapping.

| Frontend action | Filename | Purpose | Policy and required operation |
| --- | --- | --- | --- |
| Countries → Download template | `template-countries.xlsx` | Country import | Protected, `DOWNLOAD_TEMPLATE_FOR_TOPONYM` |
| Regions → Download template | `template-regions.xlsx` | Region import | Protected, `DOWNLOAD_TEMPLATE_FOR_TOPONYM` |
| Districts → Download template | `template-districts.xlsx` | District import | Protected, `DOWNLOAD_TEMPLATE_FOR_TOPONYM` |
| Localities → Download template | `template-localities.xlsx` | Locality import | Protected, `DOWNLOAD_TEMPLATE_FOR_TOPONYM` |
| Senior bulk upload → Download template | `template-seniors.xlsx` | Resident bulk import | Protected, `DOWNLOAD_TEMPLATE_FOR_SENIOR` |

Each template is delivered by `GET /api/files/download/:filename`. The route authenticates first, validates basename syntax, checks the exact filename allowlist, then requires the mapped operation before touching the file. Missing authentication gives 401 `ERRORS.UNAUTHORIZED`, a wrong operation gives 403 `ERRORS.FORBIDDEN`, and an unmapped or missing file gives 404 `ERRORS.FILE.NOT_FOUND`. Separator-containing input retains 422 `ERRORS.VALIDATION`. Successful responses retain the XLSX MIME type, attachment filename and `Cache-Control: no-store`.

The Express static handler skips workbook paths while still serving other public assets. Angular's asset copy also excludes workbooks, covering legacy ignored copies and aliases that may be present locally. The real Express integration tests cover a local workbook present in the public tree, an encoded extension, health and a normal public translation asset. API tests use the actual release source bytes and check all five permission mappings in both directions across the Senior and Toponym permission families. The old test-only arbitrary text download and Homes permission behavior were replaced with assertions for the intended protected contract. Existing 401, 403, 404 and separator-validation assertions are retained.

## Release packaging and sensitive-data review

All five filenames were ignored and absent from Git at the start. The release source is the five static files under `server/protected-templates/`, outside the Express public directory and the Angular asset inputs. The five exact paths are eligible for version control through narrow `.gitignore` exceptions. A release from these sources has no template generation, provisioning or copy step.

Local copies contained author metadata and some also contained example rows. The release templates were authored from the Angular importer schema with only its header row. This includes the required locality `region` column and the available optional Senior columns. No local workbook contents or metadata were copied. The five workbooks were rendered and inspected, and the final XLSX packages were checked for author metadata, external links, comments, embedded files and macro parts. The automated packaging check enumerates frontend template references, requires exactly those release files, and parses each with the import library to verify its schema-aligned header row and empty data area. It uses the release files directly from a checkout with the change applied.

## Files changed

- Order authorization and tests in `server/routes/orders-api.js` and `server/tests/int/orders-api.int.test.js`.
- Workbook allowlist and delivery in `server/routes/files-api.js`; static boundaries in `server/app.js` and `angular.json`; packaging in `.gitignore` and the five files in `server/protected-templates/`.
- HTTP and packaging proof in `server/tests/int/files-api.int.test.js`, and explicit 401/403 Blob assertions in `src/app/services/file.service.spec.ts` alongside the existing 404 test.
- This report. The existing Phase 8A/8B changes and the untracked admin bootstrap script were preserved.

## Validation

| Check | Result |
| --- | --- |
| Focused order integration | **14/14 passed** |
| Focused file integration | **13/13 passed** |
| Full backend integration | **19/19 suites, 213/213 tests passed** on dedicated loopback PostgreSQL |
| Backend unit | **44/44 suites, 398/398 tests passed** |
| Frontend full | **724/724 passed**, including two added Blob permission-error cases |
| Auth | **29/29 passed** |
| Routing | **33/33 passed** |
| FileService and diagnostics | **9/9 passed**, including JSON Blob conversion at 401, 403 and 404 |
| Production TypeScript | **Passed** |
| Production build | **Passed**, 4.99 MB initial bundle and 17 existing warnings. Zero XLS or XLSX assets were emitted to the public browser output, and the translation asset was present. |
| Cypress Toponyms stub | **7/7 passed on retry**, including download filename and bytes. The first attempt timed out waiting for Angular dev-server startup. |
| `git diff --check` | **Passed** for working and staged diffs. The new report also passed a whitespace check. |

## Behavior preserved and remaining P1

Angular routing, order request validation, token handling, and FileService production behavior retain their existing contracts. Bulk Senior integrity remains as implemented in 8B. Contact search terms in backend logging remain the Phase 8 P1 follow-up.

**PHASE 8C — ORDER SCOPE / WORKBOOK DELIVERY COMPLETE**
