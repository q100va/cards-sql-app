# PHASE C5 — FINAL SAFETY REVALIDATION

Date: 2026-11-18. Repository: `cards-sql-app`.

## Result

**Fresh stub revalidation passed: 31/31 browser scenarios in one Cypress invocation, with zero failures, pending cases or skips. All 134 isolated safety tests passed before application startup.**

No project backend or nodemon watcher was present before, during the monitored run, or after cleanup. No backend was started/restarted by this task. The controlled processes did not initiate a real application API, PostgreSQL or external API connection, as established by the unchanged execution boundaries, the approved stub-only launch paths, and the process/socket observations below. No database was investigated or queried.

Only this report was added to the repository. Application/test source, environment files, fixtures, configuration files and security guards were not changed. All **668 starting tracked/unignored files** retained their SHA-256 hashes.

**This conclusion applies to this fresh run only.** It does not establish whether production was affected by the previous watcher incident. No investigation of that incident's database target, data or effects was performed. The user's manually reported development/local environment selection was not used as proof about past activity.

## Mandatory preflight

| Check | Finding |
| --- | --- |
| Running Node/npm/backend/watchers | Full OS process inventory reviewed before launch. No active project npm runner, nodemon, project `server/server.js`, PM2, forever, watchman or other identified backend-restart watcher. All relevant process command metadata was available. |
| False-positive server matches | Two VS Code IntelliCode extension services have their own `dist/server/server.js` paths. They are editor services, not this application's backend. Inspection-tool command text was also distinguished from executable backend commands. |
| Other Node processes | Only the two existing Codex tool hosts described below. They had no project backend/watch command. |
| Automation | No matching project/backend scheduled task or Windows service was found. Workspace VS Code tasks declare frontend `start` and frontend `test`, not backend startup or file-triggered backend restart. |
| Ports | Neither 8080 nor 56379 had a listener before startup. Port 8080 remained absent during the observed run and after cleanup. No API health/identity request was used to check it. |
| C1 collection/entry checks | Explicit stub list in `cypress/safety/policy.mjs`; Node before-run/before-spec and required browser support enforce mode and approved files. Stub/live flags must agree. |
| Five files / 31 scenarios | Existing isolated registration/preservation checks passed. The actual browser banner collected exactly the five requested approved files; final browser output counted 31 cases. |
| Reset/direct API exclusion | Stub reset rejects before reset-module/database loading; stub `cy.request` rejects before the original transport. Existing isolated negative tests passed. Neither operation was attempted against a real service. |
| Browser containment | Required origin middleware, unmatched-API rejection, `blockHosts='!localhost:56379'`, enforced support/test isolation, and the compiled-frontend handshake remain active. |
| Frontend | Only `start:e2e`, using `cypress/frontend/main.ts`, the dedicated E2E tsconfig and Angular E2E configuration. No backend proxy/startup orchestration was selected. |
| Credentials/settings | Launch environments were cleared and rebuilt from an explicit nonsecret OS-path allowlist. Fresh temporary user/application-data profile and empty npm user/global configs. No inherited DB/PG credentials, production selectors, dotenv selectors, preloads, proxy variables, record keys or arbitrary Cypress overrides. Root/server environment files were not read or modified. |
| Isolated checks | **134 passed, 0 failed, 0 skipped**, completed before starting the frontend or Cypress browser. Fake dependency/database/browser tests only. |

This establishes the absence of an identified active mechanism that could repeat the prior edit-triggered backend restart. No source files were edited, and all Cypress artifacts were redirected outside the checkout. Process monitoring also watched for a new backend/watcher rather than assuming the initial inventory would remain unchanged.

## Process identities

Existing processes were classified and left untouched:

| PID(s) | Identity / disposition |
| --- | --- |
| 7040 | Existing Codex artifact-session Node host; unrelated to the project backend. |
| 10400 | Existing Codex CUA Node tool host; unrelated to the project backend. |
| 20096, 3336 | VS Code IntelliCode extension server processes (`Code.exe`), not application servers. |
| 20188, 9720, 25804 | Existing idle command shells; no project backend child found. |
| 34452, 38296 | Existing VS Code PowerShell terminals; no project backend child found. |
| Other editor/client processes | Left untouched; no database session/activity was inspected. |

Task-owned processes:

| PID | Role |
| --- | --- |
| 6244 | Read-only process/socket safety observer. |
| 33032 | Dedicated frontend command launcher; created 2026-11-18 19:05:34 UTC. |
| 11364 | Frontend npm runner. |
| 1460 | Angular E2E dev server; listened on `::1:56379`. |
| 30844 | Owned esbuild compiler child. |
| 35884 | Single Cypress command launcher; created 19:08:26 UTC. |
| 37096 | Cypress npm runner. |
| 27328 | Main headless Cypress/Electron process. |

The temporary identity inventory records the other owned children. The observer tracked **26 controlled process IDs** across the run. No unrelated process was stopped.

## Exact execution commands

The executable commands below were launched with native `ProcessStartInfo`, cleared child environments, `UseShellExecute=false`, and `CreateNoWindow=true`. Native command launch used `cmd.exe /d /s /c`; `/d` disables command-shell AutoRun. PowerShell execution policy was not changed.

Mandatory isolated suite:

```text
C:\Program Files\nodejs\node.exe --test cypress/safety/*.test.mjs
```

Dedicated frontend:

```text
npm run start:e2e
```

Expanded frontend command: `ng serve --configuration e2e --port 56379 --host localhost`.

**One browser invocation, no reruns:**

```text
npm run cypress:run:stub -- --browser electron --record false --spec cypress/e2e/sign-in.cy.ts,cypress/e2e/roles.cy.ts,cypress/e2e/permissions.cy.ts,cypress/e2e/toponyms/regions.stub.cy.ts,cypress/e2e/toponyms/toponyms-list.stub.cy.ts --config screenshotsFolder=C:/Users/Owner/AppData/Local/Temp/cards-c5-final-9579eccf7e5042cf8bbbf5e5164be7dd/screenshots,downloadsFolder=C:/Users/Owner/AppData/Local/Temp/cards-c5-final-9579eccf7e5042cf8bbbf5e5164be7dd/downloads
```

The script supplies `E2E_MODE=stub` and `--env USE_STUBS=1,API_URL=http://localhost:8080`. Only artifact destinations were overridden on the command line; no timeout, retry, host, mode, support, isolation or other guard setting was relaxed.

Environment isolation additionally set `CI=1`, `NG_CLI_ANALYTICS=false`, `CYPRESS_CRASH_REPORTS=0`, and both internal telemetry flags to `0`. The cached installed Cypress binary was selected explicitly. No install/update/cloud-recording command was run. Necessary Windows OS variables, including `SystemDrive` and `ProgramData`, were preserved without copying credentials or project environment settings.

Read-only operational checks used:

```powershell
Get-CimInstance Win32_Process
Get-NetTCPConnection
Get-ScheduledTask
Get-CimInstance Win32_Service
Get-FileHash -Algorithm SHA256
git diff --check
```

Those inventories were filtered/classified for the project, owned processes and forbidden connections; unrelated command-line secrets were not placed in the report. Frontend readiness used only `GET http://localhost:56379`, with the HTTP proxy disabled, redirects disabled and a five-second bound. No request to port 8080 or a database was used for readiness or cleanup.

## Browser results

Installed runtime: **Cypress 15.20.0, Electron 138 headless, Node 22.11.0**.

| Approved spec | Tests | Passed | Failed | Pending | Skipped | Duration |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `cypress/e2e/sign-in.cy.ts` | 6 | 6 | 0 | 0 | 0 | 00:47 |
| `cypress/e2e/roles.cy.ts` | 8 | 8 | 0 | 0 | 0 | 01:40 |
| `cypress/e2e/permissions.cy.ts` | 8 | 8 | 0 | 0 | 0 | 01:28 |
| `cypress/e2e/toponyms/regions.stub.cy.ts` | 2 | 2 | 0 | 0 | 0 | 00:34 |
| `cypress/e2e/toponyms/toponyms-list.stub.cy.ts` | 7 | 7 | 0 | 0 | 0 | 01:34 |
| **Total** | **31** | **31** | **0** | **0** | **0** | **06:04** |

Cypress exited **0**. These are actual browser results from the same invocation, not a combination of reruns or simulated isolated-harness DOM checks. No live-only spec/branch ran. No source/test fix was made to obtain the result.

The existing synthetic download also materialized as a **6,404-byte XLSX**, with SHA-256 exactly matching the existing fixture's decoded bytes. Its contents were not sourced from a backend.

## Network and backend observations

The observer performed **219 process/socket polls**, sleeping two seconds between polls (OS query overhead adds to the interval). It recorded **5,746 controlled-process TCP socket observations**, including repeat observations of the same connection.

- All recorded remote addresses were IPv4/IPv6 loopback.
- No controlled-process non-loopback connection or connection to API port 8080/common PostgreSQL ports was observed.
- No backend/watcher process or port-8080 listener appeared in the monitored snapshots.
- The observer reported **zero violations**. Its safety response, if needed, could terminate only this task's command-verified frontend/Cypress trees, not an unrelated service.
- The approved frontend and Cypress's local control/proxy traffic account for the observed loopback activity. Application API requests were served by explicit stubs under the unchanged middleware/backstop policy. No unmatched-API error appeared in the passing run.
- External asset blocking remains enabled. No exception for fonts, CDNs, Render, Neon, Vercel or other hosts was added.
- Stub `e2e:assertBackend` returns locally; it does not perform the live backend identity fetch. Reset/database infrastructure remains unavailable in stub mode.

Together with the inspected launch paths, empty database/production credential environment, absence of a real backend/watcher and the existing negative safety regressions, these observations support the no-real-API/no-database result for the controlled processes. **No database configuration, data, logs or connection was investigated.**

## Cleanup and repository verification

1. Cypress and its runner processes exited after the single successful invocation.
2. The frontend launcher's PID, command line and creation time were checked against the saved task identity.
3. Only that verified process tree was terminated:

```text
C:\Windows\System32\taskkill.exe /PID 33032 /T /F
```

4. The observer was asked to exit using its private temporary stop flag, and exited normally.
5. No task-owned frontend, Cypress, compiler or observer process remained. The only remaining `node.exe` processes were the original Codex hosts, PIDs 7040 and 10400, with no backend/watch command.
6. Neither port **56379** nor **8080** had a listener after cleanup.
7. SHA-256 comparison found all **668 baseline tracked/unignored files unchanged**. Only `docs/cypress-phase-c5-final-revalidation.md` was added. Existing uncommitted C1–C5 work, previous reports and `server/scripts/bootstrap-admin.mjs` were preserved.
8. `git diff --check` and report whitespace validation passed. No commit or push was made.

Run logs, process identities, observer summary, the fresh profile and generated artifacts remain privately in:

```text
C:\Users\Owner\AppData\Local\Temp\cards-c5-final-9579eccf7e5042cf8bbbf5e5164be7dd
```

Relevant files: `safety.log`, `frontend.log`, `browser.log`, `owned-processes.json`, `monitor.log`, `monitor-summary.json`, and `downloads/template-regions.xlsx`. Video remained disabled and the passing run generated no failure screenshots. The frontend's nonzero termination status reflects intentional cleanup of the long-running dev server, not a build or browser failure.

## Remaining limitations

- These process/TCP observations are contemporaneous snapshots, not a host-wide packet capture or formal OS network sandbox. They do not certify unrelated processes, future user actions or arbitrarily short unobserved events. The application-level fail-closed network guards provide the independent execution boundary.
- No live API, database, migration/reset or bootstrap behavior was tested. Live E2E remains separately gated and requires separate authorization.
- Cold unoptimized frontend startup was slow. Existing nonfatal Angular compiler/template warnings and the installed Cypress `allowCypressEnv` deprecation warning remain; no settings/source were changed to silence them.
- This fresh successful run provides **no conclusion about whether production was affected by the previous incident**. The previous safety report remains unchanged, and no retrospective database investigation was performed.

**Final result: 31/31 browser tests and 134/134 isolated safety tests passed; fresh-run process/network isolation and cleanup verified; repository change limited to this report.**

