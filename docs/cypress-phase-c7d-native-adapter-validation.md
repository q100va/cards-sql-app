# PHASE C7D — WINDOWS PROCESS ADAPTER VALIDATION

Date: 2026-11-18. Reference: [C7C orchestration](cypress-phase-c7c-live-orchestration.md).

## Outcome

**Native validation passed on this Windows host: 14 native-core checks and 10 actual-helper checks. All 191 isolated tests passed.** Two native defects were reproduced and corrected without weakening ownership/cleanup requirements.

The actual PowerShell helper was tested only after the user explicitly authorized **process-only RemoteSigned** for the reviewed local adapter and harmless synthetic tests. Every such child exited. CurrentUser, LocalMachine and Group Policy settings were not changed; all policy scopes remain Undefined and the parent/default effective policy remains **Restricted**.

**This is not permission to run live E2E.** The unchanged live runner still needs an explicitly approved execution-policy integration decision on this Restricted host, plus all database/environment/runtime prerequisites. C7D's temporary exception applies to these synthetic tests only.

No Cypress, Angular, Express, PostgreSQL client/server, database provisioning/reset/schema/seed/migration, production service or bootstrap was executed. No existing VS Code, Codex or unrelated application process was targeted for termination. No commit/push was performed.

## Safety preflight

Before native child creation:

- Reviewed running Node and project-related shell/watch commands, parent identities, executable paths and creation metadata. Only the existing Codex Node tool hosts were found; no unexpected project backend/nodemon/watch process was identified. The inspection command itself was distinguished from an executable watcher.
- Read project-matching scheduled-task/service startup definitions; zero matching active startup mechanisms were found. Nothing was disabled or stopped.
- Ports **8080 and 56379 had no listener**. No health/identity/API probe or database-port check was used.
- Resolved the adapter files to their exact local checkout paths, checked that they were not reparse points and recorded SHA-256 hashes. Native harnesses refuse mismatching reviewed files.
- Kept synthetic child environments limited to explicit OS/tool/temp paths. No private application environment or database approval file was used.

Reviewed files:

```text
C:\Users\Owner\DEV\projects\cards-sql-app\cypress\safety\live-windows.ps1
C:\Users\Owner\DEV\projects\cards-sql-app\cypress\safety\live-process-job.cs
C:\Users\Owner\DEV\projects\cards-sql-app\cypress\safety\live-runtime.mjs
```

| File | Reviewed SHA-256 |
| --- | --- |
| `live-windows.ps1` — unchanged | `C207E1738A37238B5CDC6B23B761BC785E08533981C2494ABC8F9F8E693F8D7D` |
| `live-runtime.mjs` — unchanged | `B41272EA068DD9EE232BB2BAD4C1BABE503571A10857A4F899931460C4A83FB2` |
| `live-process-job.cs` — initial | `A429A13A8F8F7701C7A41B1103AFD8709CE01F56CDC6160DCAFAAE962CB7786F` |
| `live-process-job.cs` — after the two reviewed corrections | `1FC5ECE781E2710CB9265AB16C3B1C0D8BD1FA0F68F2A1825A906D6232908112` |

The existing Codex hosts, PIDs **7040** and **10400**, retained their original executable/creation identities after validation. They were observed read-only and left untouched.

## Execution-policy restriction and authorization

The initial harmless `-Action secure` attempt was refused before the adapter ran: **running scripts is disabled**. Read-only inspection showed Windows PowerShell **5.1.26100.9818**, 64-bit, all five configured scopes Undefined, effective Restricted, and an unsigned local adapter.

No workaround was applied automatically. The user then authorized process-only RemoteSigned, limited to the reviewed adapter and harmless C7D tests, explicitly forbidding CurrentUser/LocalMachine/Group Policy changes and Bypass/Unrestricted.

Actual helper tests used either `-ExecutionPolicy RemoteSigned` on their isolated PowerShell child or `PSExecutionPolicyPreference=RemoteSigned` in the **test-only child environment** when exercising the existing C7C mutex bridge. The latter did not modify the parent environment or the production runner's whitelist. The exact adapter/hash was checked before dispatch. The children were terminated normally or as part of deliberate owned-helper failure testing, so their process policies ended with them.

Core C# tests used independent allowed inline native probes; they did not execute the initially blocked `.ps1` by reading/evaluating its text. Their reported effective policy remained Restricted. No `Set-ExecutionPolicy`, Bypass, Unrestricted or persistent policy change was used.

## Exact harmless commands exercised

The new opt-in native harnesses are **not** collected by `*.test.mjs`:

```powershell
node cypress/safety/native-adapter-validation.mjs --synthetic-only
node cypress/safety/native-helper-validation.mjs --synthetic-only --approved-process-remotesigned
```

The second command requires the separately granted C7D exception; it is not a generally authorized live-run command.

Adapter actions exercised, using the canonical path above:

```text
powershell.exe -NoLogo -NoProfile -NonInteractive -File <adapter> -Action secure
  Initial attempt: refused by Restricted policy; no adapter action executed.

powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned
  -File <adapter> -Action secure
  -File <adapter> -Action check-private -Value <synthetic path>
  -File <adapter> -Action run -Value <private synthetic process JSON>

Actual live-runtime acquire/release bridge:
powershell.exe -NoLogo -NoProfile -NonInteractive -File <adapter> -Action lock
  Test-only child environment: PSExecutionPolicyPreference=RemoteSigned.
```

Synthetic process configurations selected only the installed Node executable with newly generated `synthetic-child.mjs` / `synthetic-helper-child.mjs` fixtures. Modes performed local marker writes, spawned another identical synthetic leaf, held briefly, exited with 0/17, or accepted their own shutdown input. Hold/leaf fixtures had self-expiry timers; no sockets or application modules were used. Nested-job verification used an owned PowerShell controller that compiled the same C# class and created an inner synthetic Node job. No existing process was attached to a job.

The core harness also used short-lived inline PowerShell/.NET mutex probes. A separate synthetic sentinel was intentionally kept **outside** tested Job Objects and stopped only through its own input after verifying it survived all job operations. Only one deliberately crashed helper was terminated via its own Node `ChildProcess` object; no discovered PID was used to kill an unrelated process.

## Native APIs and ownership evidence

Real Windows calls included:

- `CreateJobObjectW`, `SetInformationJobObject` with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, and no breakaway permission.
- `CreateProcessW` with `CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW` (`0x08000404`), `AssignProcessToJobObject`, then `ResumeThread`.
- `QueryInformationJobObject` for actual member PIDs; `IsProcessInJob` against the **specific owned job handle**, not merely any job.
- `TerminateJobObject`, `WaitForSingleObject`, `GetExitCodeProcess`, `CloseHandle`, and private standard-handle file creation.
- Test-only `DuplicateHandle` to produce a query-only duplicate of an already owned job, exercising an actual `ERROR_ACCESS_DENIED` termination failure. The original full-access handle was retained and restored for verified cleanup.
- Cross-process named mutex operations through .NET's Windows mutex implementation, including rejection while held, release/reacquisition and an abandoned-owner exception on a unique synthetic mutex.
- Actual NTFS owner/access-control creation, inherited file ACL inspection, broad-read negative fixtures and removal/restoration of those synthetic grants.

The suspend/assign/resume boundary was additionally observed with an **instrumented in-memory copy** of the reviewed C# source. Probes were inserted immediately after those existing native API calls; repository adapter ordering was not modified for tracing. The child marker stayed absent while suspended (including an observation interval), exact-job membership changed from false to true after assignment, and the marker appeared only after resume. This is an actual native observation from the instrumented copy, **not an ETW trace of the unmodified helper**. Unmodified adapter constructors and exact-handle membership were exercised separately throughout the other checks.

## Real native results

### Core checks — 14 passed

| Check | Observed result |
| --- | --- |
| Actual owned tree creation/stop | Root **32696**, leaf **29984**, both in the queried owned job; stop returned with root signalled and zero members. The outside sentinel remained alive. |
| Explicit nested jobs | Owned outer controller **35772**, inner child **6980**. Kernel membership showed the child in both inner and outer jobs; exact outer-handle query returned true. Both trees exited. Host was already job-contained as well. |
| Normal exit | Synthetic root **35132** exited with code 0; job emptied. |
| Premature nonzero exit | Synthetic root **36496** retained code 17; no false success was inferred. |
| Kill-on-close | Disposing the job without calling Stop terminated root **24220** and leaf **34196**; previously opened handles confirmed their exits. |
| Failed startup | A deliberately nonexistent executable failed; no synthetic user code resumed. |
| Actual cleanup denial | Query-only duplicate caused Win32 error **5** on termination. Failure was reported while the child stayed contained/alive; restoring the original owned handle allowed root-exit/empty-job verification. |
| Suspend → assign → resume | Instrumented native stages: not in exact job/marker absent → in exact job/marker absent → in exact job/marker present. |
| Disposed-object failure | Querying the disposed adapter failed closed after the correction; it no longer queries the host's job. |
| Named-mutex contention | Holder **24308**, contender **29608**: second acquisition rejected; release and later acquisition succeeded. |
| Abandoned-owner handling | Abrupt exit on a **unique synthetic mutex name** produced `AbandonedMutexException`; test-owned handle was released/disposed. The live mutex was not deliberately abandoned. |
| Private ACLs | Actual directory and inherited fixture file allowed only current user/SYSTEM. |
| ACL negative fixture | An Everyone-read grant on synthetic-only content was observable, then removed; private containing directory remained restricted. |
| Unrelated sentinel | PID **10212** survived all job operations, then exited normally with code 0 only after its own shutdown input. |

### Actual PowerShell helper and runtime bridge — 10 passed

| Check | Observed result |
| --- | --- |
| `secure` + positive `check-private` | Actual helper created a private directory and accepted it and its inherited synthetic file. |
| Negative `check-private` | Broad-read fixture rejected with helper error/exit 1; restored private ACL accepted. |
| Cancellation/Stop protocol | Helper **40504**, root **29388**, leaf **27688**: actual status showed both members; Stop produced verified empty exit. |
| Normal root exit | Helper **31876**, root **30268**: child code 0 preserved; empty job and helper closure verified. |
| Premature root exit | Helper **12644**, root **37652**: child code 17 preserved; empty exit verified. |
| Parent control-channel EOF | Helper **35532**, root **23480**, leaf **4540**: closing only the owned channel triggered cleanup and empty exit. |
| Abrupt owned helper termination | Only created helper **33316** was terminated; kill-on-close removed root **39584** and leaf **31500**. |
| Failed executable startup | Helper **36184** returned error/exit 1 before any started event. |
| Invalid control message | Helper **15036** returned failure, never a clean-exit claim; its owned descendants still exited through job disposal. |
| Real C7C mutex bridge | Actual `acquire`/`release`, first helper **39072**, next helper **33336**: concurrent acquisition rejected, release/reacquisition succeeded, both owner helpers closed. |

These were real synthetic Windows processes and native/filesystem operations. They were not mocked browser results and do not establish Cypress/Electron or application compatibility.

## Two minimal adapter corrections

1. **Shutdown completion race — `LiveProcessJob.Stop()`**: a real run observed zero job members while `Exited` was still false. `Stop()` now waits for **both** zero membership and a signalled root process handle within the existing deadline. It cannot report shutdown merely from accounting reaching zero.
2. **Disposed-handle ambiguity — public native operations**: `QueryInformationJobObject(NULL, ...)` can refer to the calling process's job, so a disposed instance previously returned host-job information. `RequireOpen()` now rejects zero/disposed handles before `Pids`, `Stop`, `Exited` and `ExitCode` call native APIs. `Dispose()` stays idempotent. No null-handle host fallback is accepted as ownership proof.

Native shutdown/disposal checks were repeated after each correction. The first diagnostic wrapper also had an error-formatting issue that obscured its initial assertion; that wrapper was corrected, cleanup was confirmed, and the precise race was reproduced before changing the adapter. Interim failures are not counted as passes. No policy or ownership check was removed to fix a native result.

## Exact C7D repository changes

| File | Change |
| --- | --- |
| `cypress/safety/live-process-job.cs` | The two fail-closed corrections above. |
| `cypress/safety/live-runner.test.mjs` | Add assertions protecting root-exit completion and disposed-handle guards; retain existing checks. |
| `cypress/safety/native-adapter-validation.mjs` — new | Explicit synthetic-only native core/nested/mutex/ACL harness, excluded from isolated test glob. |
| `cypress/safety/native-helper-validation.mjs` — new | Hash-pinned actual-helper tests requiring the separate explicit process-policy approval flag; invokes no application/DB entry point. |
| `cypress/safety/native-adapter-validation.test.mjs` — new | Three isolated fake/AST checks for opt-in, test-glob exclusion, environment sanitization, reviewed hashes and the restricted exception scope. |
| `docs/cypress-phase-c7d-native-adapter-validation.md` — new | This report. |

All **681 starting tracked/unignored files** were hash-compared: only the two listed existing test-infrastructure files changed; four new files were added. PowerShell helper, live runtime/runner/policy, package scripts, C1 guards, C7A fixture tests, C7B diagnostics, E2E specs/fixtures and all production/reset/bootstrap files retain their starting hashes. No original E2E scenario/assertion was changed, weakened or skipped.

## Isolated/static validation — separate evidence

| Check | Result |
| --- | --- |
| Starting isolated baseline | **188 passed, 0 failed, 0 skipped.** |
| Final complete isolated suite | **191 passed, 0 failed, 0 skipped, 0 cancelled**: original 188 plus three opt-in/integrity checks. This command does not launch the native harnesses. |
| E2E preservation | All **39 original distinct scenarios** / **31 stub + 11 live registrations** remain represented. Original E2E source hashes unchanged. |
| Cypress/config TypeScript | `node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit` — passed. |
| Dedicated frontend TypeScript | `node node_modules/typescript/bin/tsc -p cypress/frontend/tsconfig.json --noEmit` — passed. |
| Syntax/compilation | New Node harness/test modules pass `node --check`; corrected C# compiles and was exercised natively. |
| Whitespace | `git diff --check` and explicit new-file whitespace/encoding checks passed. |

Actual isolated command: `node --test cypress/safety/*.test.mjs`. Other checks were read-only process/port/task/service/policy/path/hash inspection, no-emit compilation and declaration compilation. No live serial-run command was invoked.

## Cleanup and retained evidence

Final inspection found **zero remaining validation helpers/synthetic children and zero listeners on 8080/56379**. Actual jobs required empty membership and root exit; owned helper closure/EOF/kill cases were verified independently. The two original Codex Node hosts retained their creation identities. No existing application/editor process was killed, and no process discovered by an arbitrary name/PID sweep was terminated.

All policy scopes remained **Undefined**, with parent/default **Restricted**. The process-only RemoteSigned children and actual mutex helpers exited, ending their temporary policy scopes. No CurrentUser, LocalMachine or Group Policy setting was written.

Latest private evidence:

```text
C:\Users\Owner\AppData\Local\Temp\cards-c7d-core-1b9d08b67f2641709bc39fe5e13122c9\native-core-results.json
C:\Users\Owner\AppData\Local\CardsSqlLiveE2E\e164b41cffd841739e798919904e3472\native-helper-results.json
```

Earlier synthetic probe directories/logs were also retained privately, including interim failure evidence. No real secrets/configuration/data are present. Broad-read test grants were removed. Artifacts were not committed or uploaded; apply C7B's restricted access and maximum seven-day recommended retention, deleting sooner after diagnosis. No recursive cleanup of user directories or unrelated files was performed.

## Remaining blockers before real live Cypress

- **Execution-policy integration:** the unchanged C7C launcher does not forward this C7D-only exception; its helper `-File` invocation remains blocked under this host's default Restricted policy. A separately approved integration/configuration decision is required. Do not silently add Bypass/Unrestricted, change persistent policy or treat the C7D grant as authorization for live execution.
- No disposable PostgreSQL target, account, schema ownership, contents, native service identity or database isolation has been provisioned/verified/approved. Development/integration data is not disposable by assumption.
- C7C's exact C1 allowlist/reset authorization, private fresh secrets, recent operator evidence, exclusive target/process ownership and independently enforced loopback-only egress remain mandatory.
- Native Node/PowerShell nesting works on this host/user. Cypress/Electron sandbox behavior, actual browser requests, application initialization, real database preflight/reset/seeding and route persistence remain untested. Do not relax containment if a later browser child requests incompatible behavior.
- Host/process observations are bounded, not proof against a privileged actor changing state after inspection. Other user accounts/hosts and every possible Windows denial were not tested. The real access-denied case was controlled with a duplicate of a test-owned handle; existing mock tests still cover orchestration refusal when cleanup cannot be verified.
- Process cleanup cannot undo committed test writes or guarantee fixture cleanup after a hard crash. No database cleanup guarantee is claimed.

No automatic continuation to policy changes, provisioning, application startup or live E2E is authorized.

**PHASE C7D — WINDOWS PROCESS ADAPTER VALIDATION**

Native checks: **14 core + 10 actual helper passed**. Isolated tests: **191/191 passed**. Production application/database execution: **0**. Persistent policy changes: **0**.
