# Initial administrator contact and search integrity

## Root cause and contract

The original bootstrap used `User.create` without inserting contact or search rows. The Users serializer only emits groups supported by current contact rows. A contactless user therefore missed `email`, `phoneNumber`, `telegram`, `telegramId`, and `telegramPhoneNumber` under `orderedContacts`. The strict response schema correctly rejected the result. Text search also requires a matching `UserSearch` row.

Every user needs a genuine email, phone number, Telegram ID, and Telegram phone number. The address is optional. The diagnostic Angular test previously expected a contactless response to pass. That expectation has been corrected to reflect the product owner's rule. The replacement tests require rejection for a contactless administrator and acceptance for a contact-complete administrator with an empty address. Existing tests and shared schema requirements are unchanged.

## Persistence

- Normal creation validates `userDraftSchema`, saves the four mandatory contact types using `UserContact` and the shared contact/address helper, and generates search content from the persisted user and relations. The helper inserts an address only when an address ID is supplied.
- The bootstrap CLI collects all four values without terminal echo. It applies the required slice of `draftContactsSchema` for normalization and format, then runs the same model validation before opening its write transaction. The existing contact helper saves four rows and no address row. The Users serializer derives its Telegram aggregate from the two stored Telegram contact types.
- `server/controllers/ctrl-user-search-content.js` shares the existing creation query and search builder between the normal API and bootstrap. Bootstrap commits the user, role, permissions, contacts, and current search row within the original advisory-locked transaction.
- `server/scripts/bootstrap-password.mjs` uses the same hidden input reader for contacts and passwords. Password confirmation, Argon2id, and the password pepper rules still apply to new administrators.
- The standard update route can persist contacts, but its current search code uses `UserSearch.update`. Updating a missing current search row affects zero rows. Saving through that route alone would leave this administrator out of text search.

## Recover the existing administrator

Use this one-time procedure for the original bootstrap account with zero contact rows and zero search rows. The mode refuses nonmatching or restricted users, accounts outside the Administrator role, and any target that already has contacts or search rows. A repeat therefore refuses without modifying records. If either type of row is already present, stop and inspect the account before choosing a manual recovery path.

1. Back up the verified database using the deployment's normal procedure. Schedule an offline window and stop the backend replicas and other possible database writers. The advisory lock coordinates invocations of this utility. Other application writes use their own transaction paths.
2. Confirm the original account's exact numeric ID, username, and Administrator role in a trusted read-only session. Check that its contact and search row counts are both zero. Select counts and identity fields only. Keep contact values, passwords, hashes, and secrets out of session logs.

   In `psql` connected to the verified target:

   ```sql
   \prompt 'Existing user ID: ' admin_id
   SELECT u.id, u."userName", u."isRestricted", r.name AS role,
          (SELECT count(*) FROM "user-contacts" c WHERE c."userId" = u.id) AS contacts,
          (SELECT count(*) FROM "user-searches" s WHERE s."userId" = u.id) AS searches
   FROM users u JOIN roles r ON r.id = u."roleId"
   WHERE u.id = :'admin_id'::integer;
   ```

3. From the repository root of the reviewed release, use a real interactive terminal with recording disabled. Provide `NODE_ENV=production` and the intended `DATABASE_URL` through the existing deployment secret mechanism. Make the compiled shared schemas available. Run:

   ```sh
   node server/scripts/bootstrap-admin.mjs --repair-existing
   ```

4. Compare the printed host, port, and database against the intended target. Enter the exact existing numeric user ID and username. Type `REPAIR ADMIN` to confirm. Enter genuine values at the hidden email, phone number, Telegram ID, and Telegram phone number prompts. Use international format for both phone numbers and prefix the 7–10 digit Telegram ID with `#`.
5. Expect `Administrator contacts and search repaired.` and exit status 0. The utility locks and rechecks the target, then inserts contacts and the current search row in one transaction. The existing user row, password hash, role, grants, and other users are preserved. On failure or an interrupted connection, check the target's related row counts before deciding whether to retry.
6. Restart the backend, sign in with the administrator's existing credentials, and open Users. Confirm the list and detail load and text search finds the exact username. Verify the existing permissions. Keep the backup under the normal retention policy.

The rehearsal uses a synthetic account on an identity-verified disposable loopback PostgreSQL cluster. No remote connection or repair was performed.

## Verification

| Check | Result |
| --- | --- |
| Hidden terminal input | 12/12 passed, including four hidden fields in one paste with a blank field preserved for validation. |
| Disposable PostgreSQL | Passed on `127.0.0.1:63329/test_phase8h1_9e2ab6bb12`. The server's reported data directory matched the temporary cluster owned by the harness. Actual startup created 41 tables. |
| Fresh bootstrap | One administrator, 95 grants, four normalized contact rows, one search row, and no address row. Login, list and detail validation, and exact-username search passed. Missing and malformed contacts produced zero writes. A forced search insert failure rolled back all bootstrap rows. Concurrent attempts committed only once. |
| In-place repair | Wrong identity and cancellation refused. A forced search insert failure rolled back repair contacts. The valid repair preserved the user, hash, role, and grants, restored list/detail and text search, and refused repeat execution. Output checks found no entered or normalized contact values, password, hash, or injected secrets. |
| Frontend | 726/726 passed. Focused UserService passed 7/7, including rejection of the contactless response and acceptance of a contact-complete user with no address. |
| Backend unit | 400/400 passed. |
| Backend integration | 217/217 passed on the dedicated loopback integration database. The focused Users API rerun passed 16/16. |
| Production and shared TypeScript | Both passed. |
| Production build | Passed at 4.99 MB initial bundle size under the existing 5 MB error budget. Angular still reports its 2 MB warning threshold. |
| Whitespace | `git diff --check` passed, along with individual checks for the untracked deliverables. |

The relevant regression files are `server/tests/bootstrap/password.test.mjs`, `server/tests/bootstrap/deployment.mjs`, and `src/app/services/user.service.spec.ts`. The [first-deployment procedure](phase8h1-initial-deployment-admin-bootstrap.md) lists all four required contacts and the interactive prompt order.
