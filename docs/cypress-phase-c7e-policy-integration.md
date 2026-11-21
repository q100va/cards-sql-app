# PHASE C7E — RESTRICTED WINDOWS POLICY INTEGRATION

Date: 2026-11-18 (America/New_York). References: [C7C orchestration](cypress-phase-c7c-live-orchestration.md), [C7D native validation](cypress-phase-c7d-native-adapter-validation.md).

## Result and authorization boundary

Implemented process-only RemoteSigned on the existing runner's two dedicated Windows helper launch paths. **206/206 isolated tests passed**, including all 191 starting tests and 15 new tests. TypeScript, Node syntax, PowerShell parsing and whitespace checks passed.

This phase authorized implementation and isolated validation only. **No real execution-policy exception was exercised.** Neither native validation harness nor the live runner was executed. No Cypress, Angular, Express, PostgreSQL client/server, database operation, production/bootstrap command, real API request, dependency upgrade, commit or push was performed.

The one inline PowerShell test executes only the extracted policy guard with a fake policy-reading command. It has no `-ExecutionPolicy` or `-File` argument, invokes no helper action, and changes no real policy. Native lifecycle behavior was not rerun; C7D's Job Object code remains byte-for-byte unchanged.

## Exact files changed

| File | Change |
| --- | --- |
| `cypress/safety/live-runtime.mjs` | Add one shared, internal checked invocation builder used by both `execFile` one-shot actions and `spawn` control bridges. Pin reviewed PowerShell/native source; validate canonical local paths, action/value arguments and policy-related environment overrides. Add explicit child-only `-ExecutionPolicy RemoteSigned` before `-File`. |
| `cypress/safety/live-windows.ps1` | Add a read-only execution-policy guard inside the existing error boundary, before any action, ACL operation, inventory, mutex acquisition or child startup. Retain existing actions, sanitized errors and cleanup behavior. |
| `cypress/safety/native-helper-validation.mjs` | Refresh reviewed helper/runtime hashes and remove the now-obsolete test-only `PSExecutionPolicyPreference` environment injection from the runtime-mutex fixture. Preserve its separate explicit approval flag, all native scenarios and assertions. **Not executed.** |
| `cypress/safety/helper-policy.test.mjs` — new | Fifteen isolated launch/integrity/rejection/guard tests; real runtime evaluated with fake OS/filesystem/process dependencies, plus extracted guard tested against fake policy values. |
| `docs/cypress-phase-c7e-policy-integration.md` — new | This report. |

Starting snapshot: **685 tracked/unignored files**. Hash comparison found only the three existing files listed above modified, with this report and the new isolated spec added. No files were removed. No package scripts, dependencies, configuration, environment files, reset/bootstrap files, application code, schemas, E2E tests, fixtures or support files changed.

## Invocation and integrity checks

Both existing launch paths now construct this fixed argument sequence:

```text
<canonical Windows directory>\System32\WindowsPowerShell\v1.0\powershell.exe
-NoLogo -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned
-File <canonical checkout>\cypress\safety\live-windows.ps1
-Action <approved action> -Value <literal value>
```

There is no configurable script path, executable override, policy value, command shell, inline helper body or encoded-command alternative in the runner. The policy argument is added only here, never to the owned application processes or the parent shell. Arguments remain separate array elements; spaces and quote characters in private paths do not become command text.

Before **each** helper launch:

1. Require Windows, a drive-local helper checkout and the trusted canonical Windows directory/executable.
2. Reject symbolic-link/noncanonical/wrong-type adapter paths, including redirected ancestor paths that change `realpathSync` resolution.
3. Verify exact SHA-256 values of the local helper and adjacent native source. No automatic acceptance of changed files is performed.
4. Accept only `inspect`, `secure`, `check-private`, `lock` or `run`. Read-only/no-value actions require an empty value; path actions require a drive-local path. Reject non-string, NUL and newline arguments.
5. Reject inherited policy/module overrides, case-insensitively, including `PSExecutionPolicyPreference`, `PSModulePath`, `__PSLockdownPolicy` and `POWERSHELL_*`. `prepare()` rejects them before private-file inspection too; empty override values also reject.

Reviewed file hashes after C7E:

| File | SHA-256 |
| --- | --- |
| `live-windows.ps1` | `3302fbc5fe0dcd96936f27e378846526e91b0ebe7df84e2bb29533714b41c293` |
| `live-process-job.cs` — unchanged | `1fc5ece781e2710cb9265ab16c3b1c0d8bd1fa0f68f2a1825a906d6232908112` |
| `live-runtime.mjs` | `7889148abe4123cdcc41ea24959b746bca3e3c6dae76f0bf1723da604dfaaa67` |

The runtime pins the first two files; the opt-in native harness additionally pins the runtime. Future reviewed edits or line-ending changes require explicit review of those pins; a mismatch is a blocker, not permission to regenerate them automatically.

## Policy guarantees and rejection cases

The helper uses module-qualified `Microsoft.PowerShell.Security\Get-ExecutionPolicy` reads and requires:

| Scope/read | Required result |
| --- | --- |
| Scope inventory | Exactly five entries |
| MachinePolicy / UserPolicy | Both `Undefined`; even an explicitly configured RemoteSigned Group Policy is outside this narrow adapter policy |
| Process | `RemoteSigned` |
| Effective policy | `RemoteSigned` |
| CurrentUser / LocalMachine | Each `Undefined`, `Restricted` or `RemoteSigned` |

An explicit AllSigned persistent policy is rejected rather than treated as permission to relax a deliberate signing requirement. Bypass/Unrestricted or any unexpected scope values reject. The existing generic helper error/exit path remains authoritative; no action proceeds after refusal. If Windows itself blocks script loading under a stronger policy, the existing failed-process/cleanup paths also reject. There is no retry with weaker flags.

`-ExecutionPolicy` affects the dedicated new PowerShell session, not persistent settings. Group Policy has precedence, which is why it is checked rather than overridden. See Microsoft's [Windows PowerShell execution-policy documentation](https://github.com/MicrosoftDocs/PowerShell-Docs/blob/main/reference/5.1/Microsoft.PowerShell.Core/About/about_Execution_Policies.md). RemoteSigned's normal file-origin/signature enforcement remains active; no `Unblock-File` or policy-writing command was added.

The parent environment is never modified. Application environments are still built from C7C's allowlist and supplied explicitly to the native child constructor; the helper's process-policy environment is not copied into frontend/backend/Cypress configuration. No user, machine or Group Policy write is made. Temporary scope ends when that owned helper exits.

Observed during validation: MachinePolicy, UserPolicy, Process, CurrentUser and LocalMachine were all **Undefined**, with effective **Restricted**. Only policy reads and mocked guard reads were performed; there was no temporary exception to restore.

Final read-only process/listener inventory found zero matching application/nodemon startup processes and zero listeners on 8080/56379. The initial sandboxed CIM read was denied; its empty result was not accepted as evidence. A separately approved read-only inventory succeeded without starting or terminating any process. These are bounded observations, not a claim that every possible watcher can be identified from command lines.

## Isolated and static validation

| Check | Result |
| --- | --- |
| Starting complete isolated suite | **191 passed**, 0 failed/skipped/cancelled |
| New focused spec | **15 passed**, 0 failed/skipped/cancelled |
| Final complete isolated suite, after final path/hash changes | **206 passed**, 0 failed/skipped/cancelled |
| Mocked PowerShell guard matrix | **39 cases** within one new test: accepted defaults, all five scopes across six policy values, effective-policy conflicts, missing/extra scope entries |
| Cypress/config TypeScript | Passed, no emit |
| Dedicated E2E frontend TypeScript | Passed, no emit |
| Changed Node module syntax | Passed |
| PowerShell helper parser | Passed; parsed only, not invoked |
| Whitespace / UTF-8 | `git diff --check` and explicit changed-file checks passed |

The mocked runtime checks cover both actual launch functions, exact executable/helper/argv, all approved actions, quoted literal paths, hash mismatches, symlinks, path redirection, wrong file types, UNC/relative paths, unsupported platforms/actions, inherited override case variants, child failures and lock refusal. Fake child-process/OS dependencies cannot start a real service. The guard matrix executes only extracted guard text with all real policy-reading calls replaced **in memory** by `C7eFakePolicy`; it is not a native-policy compatibility claim.

Commands executed, with repeats while refining the tests:

```text
node --test cypress/safety/*.test.mjs
node --test cypress/safety/helper-policy.test.mjs
node node_modules/typescript/bin/tsc -p cypress/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p cypress/frontend/tsconfig.json --noEmit
node --check cypress/safety/live-runtime.mjs
node --check cypress/safety/helper-policy.test.mjs
node --check cypress/safety/native-helper-validation.mjs
git diff --check
```

Node commands used the installed `C:\Program Files\nodejs\node.exe`. Other operations were source/Git/hash/encoding reads, in-memory PowerShell `Parser.ParseFile`, `Get-ExecutionPolicy -List` / `Get-ExecutionPolicy`, read-only `Get-CimInstance Win32_Process` / `Get-NetTCPConnection -State Listen` inventories, and the isolated inline fake-policy guard command described above. No `-ExecutionPolicy RemoteSigned` invocation was actually executed during C7E.

## Preserved protections and scenarios

- C1 host/environment/backend identity and fail-closed stub request guards remain unchanged.
- C2 dependency preflight, reset authorization, CLI-entry behavior and region entity/cleanup contracts remain unchanged.
- C3/C4 stub contracts and strengthened assertions, C5 isolation, C7A exact fixture ownership, and C7B diagnostic suppression remain unchanged.
- C7C explicit live opt-in, private approval/configuration and ACL checks, exact database authorization, serial mutex, fresh backend/run identity, inventory/port checks, explicit process environments and refusal after uncertain cleanup remain intact.
- C7D's root-exit shutdown race and disposed-handle corrections are unchanged; the native C# hash matches the starting snapshot.
- All E2E/support/fixture source hashes match the starting snapshot: **all 39 original distinct scenarios, including 31 stub and 11 live registrations, remain represented**, with no assertion changes, skips or weakened checks. No browser pass is claimed in this phase.

## Remaining prerequisites and limitations

1. **No live-run authorization has been granted.** Obtain separate approval before exercising the actual process-policy exception again, including any native helper validation. Do not use the live runner as a harmless probe.
2. The new invocation/guard integration is isolated-tested, not rerun against actual helpers in C7E. C7D established native containment for harmless processes; application/Cypress/Electron compatibility is still not established.
3. Independently provision and verify a separate disposable local PostgreSQL target and dedicated low-privilege owner/account. Development/integration databases remain outside the disposable scope. No database was inspected here.
4. Retain C1's exact one-target allowlist/reset authorization and C7C's recent private operator approval, fresh private secrets, installed binary identities, native listener/catalog checks and explicit whole-run destructive authorization.
5. Independently enforce loopback-only egress; review watchers/tasks/services and port ownership immediately before any separately approved run. Nothing here grants permission to disable or kill unrelated processes or relax network/process guards.
6. Keep reviewed source/binaries stable and restrict modification during execution. Hash/canonical checks are fail-closed observations, not an atomic defense against a privileged concurrent file replacement. RemoteSigned is not a general security sandbox.
7. Keep logs/artifacts private under C7B retention expectations. A hard crash can leave committed records; owned-process cleanup is not guaranteed database cleanup.

No automatic continuation to provisioning, helper/native execution, application startup or live E2E is authorized.

**PHASE C7E — RESTRICTED WINDOWS POLICY INTEGRATION**

Isolated tests: **206/206 passed**. Production application files changed: **0**. Actual process-policy exceptions exercised: **0**. Persistent policy changes: **0**.
