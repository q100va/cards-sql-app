import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit native validation, deliberately excluded from *.test.mjs. Never
// imports the live runner, HTTP clients, application code or database drivers.
if (process.platform !== 'win32' || process.argv.slice(2).join(' ') !== '--synthetic-only') {
  throw new Error('Windows synthetic-only validation requires --synthetic-only.');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const source = String.raw`
$ErrorActionPreference = 'Stop'
$jobs = [System.Collections.Generic.List[object]]::new()
$directProcesses = [System.Collections.Generic.List[object]]::new()
$sentinel = $null
$results = [System.Collections.Generic.List[object]]::new()
function Assert($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Record($Name, $Data) {
  $record = @{ case = $Name; result = 'passed'; evidence = $Data }
  $results.Add($record)
  if ($directory) { $results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'native-core-results.json') -Encoding UTF8 }
  [Console]::WriteLine(($record | ConvertTo-Json -Compress -Depth 7))
}
function Wait-Marker($Path) {
  $deadline = [DateTime]::UtcNow.AddSeconds(12)
  while (-not [System.IO.File]::Exists($Path)) {
    if ([DateTime]::UtcNow -gt $deadline) { throw 'Synthetic marker timed out' }
    [Threading.Thread]::Sleep(20)
  }
  return ([System.IO.File]::ReadAllText($Path) | ConvertFrom-Json)
}
function Start-Direct($Arguments) {
  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = $node
  $start.Arguments = (($Arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }) -join ' ')
  $start.UseShellExecute = $false; $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true; $start.RedirectStandardOutput = $true; $start.RedirectStandardError = $true
  $start.WorkingDirectory = $directory
  $start.EnvironmentVariables.Clear()
  foreach ($pair in $environment.GetEnumerator()) { $start.EnvironmentVariables.Add($pair.Key, $pair.Value) }
  return [Diagnostics.Process]::Start($start)
}
function Start-InlineProbe($Code) {
  $start=[Diagnostics.ProcessStartInfo]::new()
  $start.FileName=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
  $start.Arguments='-NoLogo -NoProfile -NonInteractive -Command "' + $Code.Replace('"','\"') + '"'
  $start.UseShellExecute=$false; $start.CreateNoWindow=$true
  $start.RedirectStandardInput=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
  $start.WorkingDirectory=$directory; $start.EnvironmentVariables.Clear()
  foreach($pair in $environment.GetEnumerator()) { $start.EnvironmentVariables.Add($pair.Key,$pair.Value) }
  $process=[Diagnostics.Process]::Start($start); $directProcesses.Add($process); return $process
}
try {
  $unexpected = @(Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -notin @($PID, $harnessPid) -and $_.CommandLine -and
    $_.Name -match '^(node|nodemon|npm|cmd|powershell|pwsh|python|python3|wscript|cscript|watchman|pm2)\.exe$' -and
    ($_.CommandLine -match '\bnodemon\b|--watch\b|\bwatchman\b|\bpm2\b|server[\\/]server\.(js|mjs)\b' -or $_.CommandLine.Contains($root))
  })
  Assert ($unexpected.Count -eq 0) 'Unexpected project process/watcher'
  $ports = @(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in @(8080,56379) })
  Assert ($ports.Count -eq 0) 'Application listener conflict'
  $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetOwner($owner); $acl.SetAccessRuleProtection($true, $false)
  foreach ($identity in @($owner, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
  }
  $directory = [IO.Path]::Combine([IO.Path]::GetTempPath(), 'cards-c7d-core-' + [Guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($directory, $acl)
  $env:TEMP = $directory; $env:TMP = $directory
  $environment = [Collections.Generic.Dictionary[string,string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($pair in @{ SystemRoot=$env:SystemRoot; WINDIR=$env:SystemRoot; TEMP=$directory; TMP=$directory; PATH=([IO.Path]::GetDirectoryName($node) + ';' + (Join-Path $env:SystemRoot 'System32')) }.GetEnumerator()) {
    $environment.Add($pair.Key, $pair.Value)
  }
  $fixture = Join-Path $directory 'synthetic-child.mjs'
  [IO.File]::WriteAllText($fixture, @'
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [mode, marker, extra] = process.argv.slice(2);
if (!['hold', 'tree', 'leaf', 'exit', 'sentinel'].includes(mode)) process.exit(90);
let child;
if (mode === 'tree') child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'leaf', extra], { stdio: 'ignore', windowsHide: true });
writeFileSync(marker, JSON.stringify({ pid: process.pid, parent: process.ppid, child: child?.pid, mode }));
if (mode === 'exit') setTimeout(() => process.exit(Number(extra)), 150);
else if (mode === 'sentinel') { process.stdin.resume(); process.stdin.on('data', () => process.exit(0)); process.stdin.on('end', () => process.exit(0)); setTimeout(() => process.exit(0), 180000); }
else setTimeout(() => process.exit(0), 60000);
'@, [Text.UTF8Encoding]::new($false))
  $nativeSource = [IO.File]::ReadAllText((Join-Path $root 'cypress/safety/live-process-job.cs'))
  Add-Type -TypeDefinition $nativeSource
  Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class C7dKernel {
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool contained);
 [DllImport("kernel32.dll")] public static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool DuplicateHandle(IntPtr sourceProcess, IntPtr source, IntPtr targetProcess, out IntPtr target, uint access, bool inherit, uint options);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
}
'@
  $flags = [Reflection.BindingFlags]'Instance,NonPublic'
  $hostInJob = $false
  Assert ([C7dKernel]::IsProcessInJob([C7dKernel]::GetCurrentProcess(), [IntPtr]::Zero, [ref]$hostInJob)) 'Host job query failed'
  $sentinelMarker = Join-Path $directory 'sentinel.json'
  $sentinel = Start-Direct @($fixture, 'sentinel', $sentinelMarker)
  [void](Wait-Marker $sentinelMarker)
  $membersSeen = [Collections.Generic.List[long]]::new()

  # Actual, unmodified adapter constructor and query/stop APIs.
  $marker = Join-Path $directory 'tree.json'; $leafMarker = Join-Path $directory 'leaf.json'
  $job = [LiveProcessJob]::new($node, [string[]]@($fixture, 'tree', $marker, $leafMarker), $directory, $environment, (Join-Path $directory 'tree.log'))
  $jobs.Add($job)
  $parent = Wait-Marker $marker; $leaf = Wait-Marker $leafMarker
  Assert ($parent.pid -eq $job.Id -and $leaf.pid -eq $parent.child -and $leaf.parent -eq $job.Id) 'Synthetic parent/descendant identity mismatch'
  $pids = @($job.Pids()); foreach ($member in $pids) { $membersSeen.Add($member) }
  Assert ($pids -contains [long]$parent.pid -and $pids -contains [long]$leaf.pid) 'Descendant escaped kernel membership'
  Assert ($pids -notcontains [long]$sentinel.Id) 'Unrelated sentinel entered the job'
  $contained = $false
  Assert ([C7dKernel]::IsProcessInJob([LiveProcessJob].GetField('process',$flags).GetValue($job), [LiveProcessJob].GetField('job',$flags).GetValue($job), [ref]$contained) -and $contained) 'Exact job handle containment failed'
  $job.Stop()
  Assert ($job.Exited -and @($job.Pids()).Count -eq 0) 'Stop returned without root exit/empty job'
  Assert (-not $sentinel.HasExited) 'Unrelated sentinel was terminated'
  Record 'actual-adapter-tree-stop' @{ root=[long]$parent.pid; descendant=[long]$leaf.pid; members=$pids; hostAlreadyInJob=$hostInJob; exactJobHandle=$contained; rootExited=$job.Exited; empty=@($job.Pids()).Count; unrelatedAlive=(-not $sentinel.HasExited) }
  $job.Dispose(); [void]$jobs.Remove($job)

  # Explicit nested jobs, independent of whether the host uses silent breakaway.
  $nestedConfig=Join-Path $directory 'nested-config.json'
  $nestedMarker=Join-Path $directory 'nested-controller.json'
  @{ node=$node; fixture=$fixture; marker=(Join-Path $directory 'nested-node.json'); ready=$nestedMarker;
     source=(Join-Path $root 'cypress/safety/live-process-job.cs'); directory=$directory; environment=$environment } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $nestedConfig -Encoding UTF8
  $nestedCode='$config = Get-Content -Raw -LiteralPath ''' + $nestedConfig.Replace("'","''") + ''' | ConvertFrom-Json; ' + @'
$ErrorActionPreference='Stop'; Add-Type -TypeDefinition ([IO.File]::ReadAllText($config.source));
$map=[Collections.Generic.Dictionary[string,string]]::new([StringComparer]::OrdinalIgnoreCase);
foreach($property in $config.environment.PSObject.Properties){$map.Add($property.Name,[string]$property.Value)};
$inner=[LiveProcessJob]::new($config.node,[string[]]@($config.fixture,'hold',$config.marker),$config.directory,$map,(Join-Path $config.directory 'nested-node.log'));
try {
 [IO.File]::WriteAllText($config.ready,(@{controller=$PID; child=[long]$inner.Id; members=@($inner.Pids())}|ConvertTo-Json -Compress));
 [Threading.Thread]::Sleep(60000);
 $inner.Stop();
} finally {$inner.Dispose()}
'@
  $powershell=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
  $outer=[LiveProcessJob]::new($powershell,[string[]]@('-NoLogo','-NoProfile','-NonInteractive','-Command',$nestedCode),$directory,$environment,(Join-Path $directory 'nested-controller.log'))
  $jobs.Add($outer); $nested=Wait-Marker $nestedMarker
  [void](Wait-Marker (Join-Path $directory 'nested-node.json'))
  $outerMembers=@($outer.Pids())
  Assert ($outerMembers -contains [long]$nested.controller -and $outerMembers -contains [long]$nested.child) 'Nested descendant missing from outer job'
  Assert (@($nested.members) -contains [long]$nested.child) 'Nested child missing from inner job'
  $nestedHandle=[Diagnostics.Process]::GetProcessById($nested.child)
  $contained=$false
  Assert ([C7dKernel]::IsProcessInJob($nestedHandle.Handle,[LiveProcessJob].GetField('job',$flags).GetValue($outer),[ref]$contained) -and $contained) 'Nested child not in exact outer job'
  $outer.Stop(); Assert ($outer.Exited -and @($outer.Pids()).Count -eq 0 -and $nestedHandle.WaitForExit(10000)) 'Nested tree shutdown not verified'
  Record 'actual-explicit-nested-jobs' @{ outer=[long]$outer.Id; innerChild=$nested.child; innerMembers=$nested.members; outerMembers=$outerMembers; nestedChildInOuter=$contained; allExited=$true }
  $nestedHandle.Dispose(); $outer.Dispose(); [void]$jobs.Remove($outer)

  # Normal and premature root exits retain their actual exit codes.
  foreach ($exitCode in @(0,17)) {
    $marker = Join-Path $directory ('exit-' + $exitCode + '.json')
    $job = [LiveProcessJob]::new($node, [string[]]@($fixture,'exit',$marker,[string]$exitCode), $directory, $environment, (Join-Path $directory ('exit-' + $exitCode + '.log')))
    $jobs.Add($job); [void](Wait-Marker $marker)
    $deadline=[DateTime]::UtcNow.AddSeconds(10)
    while(-not $job.Exited) { Assert ([DateTime]::UtcNow -lt $deadline) 'Natural synthetic exit timed out'; [Threading.Thread]::Sleep(20) }
    Assert ($job.ExitCode -eq $exitCode) 'Natural exit code changed'
    $job.Stop(); Assert (@($job.Pids()).Count -eq 0) 'Natural-exit descendants remain'
    Record ('actual-exit-' + $exitCode) @{ pid=[long]$job.Id; code=[long]$job.ExitCode; empty=@($job.Pids()).Count }
    $job.Dispose(); [void]$jobs.Remove($job)
  }

  # Closing the original job handle, without Stop(), must kill its live tree.
  $marker=Join-Path $directory 'close.json'; $leafMarker=Join-Path $directory 'close-leaf.json'
  $job=[LiveProcessJob]::new($node,[string[]]@($fixture,'tree',$marker,$leafMarker),$directory,$environment,(Join-Path $directory 'close.log'))
  $jobs.Add($job); $parent=Wait-Marker $marker; $leaf=Wait-Marker $leafMarker
  $rootHandle=[Diagnostics.Process]::GetProcessById($parent.pid); $leafHandle=[Diagnostics.Process]::GetProcessById($leaf.pid)
  $job.Dispose(); [void]$jobs.Remove($job)
  Assert ($rootHandle.WaitForExit(10000) -and $leafHandle.WaitForExit(10000)) 'Kill-on-close did not terminate owned handles'
  Record 'actual-kill-on-close' @{ root=$parent.pid; leaf=$leaf.pid; rootExited=$rootHandle.HasExited; leafExited=$leafHandle.HasExited }
  $rootHandle.Dispose(); $leafHandle.Dispose()

  # Failure on an invalid, nonexistent executable must not resume any child.
  $failed=$false
  try { $bad=[LiveProcessJob]::new((Join-Path $directory 'missing-synthetic.exe'),[string[]]@(),$directory,$environment,(Join-Path $directory 'missing.log')); $jobs.Add($bad) }
  catch { $failed=$true }
  Assert $failed 'Missing executable did not fail'
  Record 'actual-startup-failure' @{ rejected=$failed }

  # A query-only duplicate of this exact owned job deliberately denies Stop.
  # Retain and restore its original full-access handle for verified cleanup.
  $marker=Join-Path $directory 'denied-stop.json'
  $job=[LiveProcessJob]::new($node,[string[]]@($fixture,'hold',$marker),$directory,$environment,(Join-Path $directory 'denied-stop.log'))
  $jobs.Add($job); [void](Wait-Marker $marker)
  $jobField=[LiveProcessJob].GetField('job',$flags); $original=$jobField.GetValue($job)
  $queryOnly=[IntPtr]::Zero
  Assert ([C7dKernel]::DuplicateHandle([C7dKernel]::GetCurrentProcess(),$original,[C7dKernel]::GetCurrentProcess(),[ref]$queryOnly,4,$false,0)) 'Owned handle duplication failed'
  $denied=$false; $nativeCode=0
  try {
    $jobField.SetValue($job,$queryOnly)
    try{$job.Stop()}catch{$exception=$_.Exception;while($exception.InnerException){$exception=$exception.InnerException};$nativeCode=$exception.NativeErrorCode;$denied=$nativeCode -eq 5}
    Assert ($denied -and -not $job.Exited -and @($job.Pids()) -contains [long]$job.Id) 'Denied cleanup was not reported while ownership remained intact'
  } finally { $jobField.SetValue($job,$original); [void][C7dKernel]::CloseHandle($queryOnly) }
  $job.Stop(); Assert ($job.Exited -and @($job.Pids()).Count -eq 0) 'Original owned handle did not complete cleanup'
  Record 'actual-access-denied-cleanup' @{ terminationDenied=$denied; win32Code=$nativeCode; exactOwnedHandleRestored=$true; finalRootExited=$job.Exited; finalEmpty=@($job.Pids()).Count }
  $job.Dispose(); [void]$jobs.Remove($job)

  # Instrument only an in-memory copy to observe the exact native API boundaries.
  # Original helper paths/source remain unchanged and were tested above.
  $observed=$nativeSource.Replace('LiveProcessJob','C7dObservedJob')
  $observed=$observed.Replace('public sealed class C7dObservedJob : IDisposable {','public sealed class C7dObservedJob : IDisposable { public static Action<string,IntPtr,IntPtr> Probe;')
  $observed=$observed.Replace('process = child.Handle; Id = child.Id;','process = child.Handle; Id = child.Id; if (Probe != null) Probe("created", job, process);')
  $observed=$observed.Replace('Require(AssignProcessToJobObject(job, process));','Require(AssignProcessToJobObject(job, process)); if (Probe != null) Probe("assigned", job, process);')
  $observed=$observed.Replace('Require(ResumeThread(child.Thread) != UInt32.MaxValue);','Require(ResumeThread(child.Thread) != UInt32.MaxValue); if (Probe != null) Probe("resumed", job, process);')
  Add-Type -TypeDefinition $observed
  $script:probeMarker=Join-Path $directory 'probe.json'; $script:stages=[Collections.Generic.List[object]]::new()
  [C7dObservedJob]::Probe=[Action[string,IntPtr,IntPtr]]{
    param($Stage,$JobHandle,$ProcessHandle)
    $inside=$false
    Assert ([C7dKernel]::IsProcessInJob($ProcessHandle,$JobHandle,[ref]$inside)) 'Probe query failed'
    if($Stage -eq 'created') { Assert (-not $inside) 'Child assigned before the observed assignment'; [Threading.Thread]::Sleep(100); Assert (-not [IO.File]::Exists($script:probeMarker)) 'Suspended child executed user code' }
    if($Stage -eq 'assigned') { Assert $inside 'Assignment did not take effect'; Assert (-not [IO.File]::Exists($script:probeMarker)) 'Child ran before resume' }
    if($Stage -eq 'resumed') { [void](Wait-Marker $script:probeMarker); Assert $inside 'Resumed child outside job' }
    $script:stages.Add(@{stage=$Stage; insideExactJob=$inside; markerExists=[IO.File]::Exists($script:probeMarker)})
  }
  $job=[C7dObservedJob]::new($node,[string[]]@($fixture,'hold',$script:probeMarker),$directory,$environment,(Join-Path $directory 'probe.log'))
  $jobs.Add($job); $job.Stop()
  Assert ($job.Exited -and @($job.Pids()).Count -eq 0) 'Observed job did not stop'
  Record 'instrumented-native-suspend-assign-resume' @{ stages=$script:stages; instrumentation='in-memory copy only' }
  $job.Dispose(); [void]$jobs.Remove($job)

  # Actual invalid-handle failure after verified cleanup; never falsify success.
  $invalid=$false
  try { [void]$job.Pids() } catch { $invalid=$true }
  Assert $invalid 'Closed handle query did not fail'
  Record 'actual-cleanup-error-detection' @{ closedHandleRejected=$invalid; noLiveChild=$true }

  # Cross-process native mutex behavior; no policy-blocked script is executed.
  $mutexName='Global\CardsSqlAppLiveE2ESerialV1'
  $mutexMarker=Join-Path $directory 'mutex-owner.json'
  $holderCode='$name=''' + $mutexName + '''; $marker=''' + $mutexMarker.Replace("'","''") + '''; ' + @'
$ErrorActionPreference='Stop'; $created=$false;
$mutex=[Threading.Mutex]::new($false,$name,[ref]$created);
if(-not $created){[IO.File]::WriteAllText($marker,'{"conflict":true}');$mutex.Dispose();exit 2};
$held=$false;
try{$held=$mutex.WaitOne(0);[IO.File]::WriteAllText($marker,(@{pid=$PID;created=$created;held=$held}|ConvertTo-Json -Compress));[void][Console]::ReadLine()}
finally{if($held){$mutex.ReleaseMutex()};$mutex.Dispose()}
'@
  $holder=Start-InlineProbe $holderCode; $mutexOwner=Wait-Marker $mutexMarker
  Assert ($mutexOwner.created -and $mutexOwner.held -and $mutexOwner.pid -eq $holder.Id) 'Mutex ownership is ambiguous or pre-existing'
  $tryCode='$mutex=[Threading.Mutex]::new($false,''' + $mutexName + ''');$held=$false;try{$held=$mutex.WaitOne(0);[Console]::WriteLine($held)}finally{if($held){$mutex.ReleaseMutex()};$mutex.Dispose()}'
  $contender=Start-InlineProbe $tryCode
  Assert ($contender.WaitForExit(10000) -and $contender.ExitCode -eq 0) 'Mutex contender did not exit'
  Assert ($contender.StandardOutput.ReadToEnd().Trim() -eq 'False') 'Parallel native mutex acquisition succeeded'
  $holder.StandardInput.WriteLine('release'); Assert ($holder.WaitForExit(10000) -and $holder.ExitCode -eq 0) 'Mutex owner release failed'
  $reacquire=Start-InlineProbe $tryCode
  Assert ($reacquire.WaitForExit(10000) -and $reacquire.ExitCode -eq 0) 'Released mutex probe did not exit'
  Assert ($reacquire.StandardOutput.ReadToEnd().Trim() -eq 'True') 'Released mutex was unavailable'
  Record 'actual-cross-process-mutex' @{ holder=$holder.Id; contender=$contender.Id; parallelRejected=$true; releaseAndReacquire=$true }

  # Abandon only a unique synthetic mutex, never the live runner's real mutex.
  $abandonedName='Global\CardsSqlC7D_' + [Guid]::NewGuid().ToString('N')
  $reference=[Threading.Mutex]::new($false,$abandonedName)
  $abandonedMarker=Join-Path $directory 'abandoned.json'
  $abandonCode='$mutex=[Threading.Mutex]::new($false,''' + $abandonedName + ''');[void]$mutex.WaitOne(0);[IO.File]::WriteAllText(''' + $abandonedMarker.Replace("'","''") + ''',''ready'');[Environment]::Exit(17)'
  $abandon=Start-InlineProbe $abandonCode
  Assert ($abandon.WaitForExit(10000) -and [IO.File]::Exists($abandonedMarker)) 'Synthetic abandoned owner did not exit'
  $abandoned=$false
  try{[void]$reference.WaitOne(0)}catch [Threading.AbandonedMutexException]{$abandoned=$true}
  finally{if($abandoned){$reference.ReleaseMutex()};$reference.Dispose()}
  Assert $abandoned 'Abandoned ownership was not reported'
  Record 'actual-abandoned-mutex' @{ uniqueSyntheticName=$true; abandonedException=$abandoned; liveMutexUnaffected=$true }

  # Native ACLs are observed independently; the Restricted .ps1 remains blocked.
  $rules=(Get-Acl -LiteralPath $directory).GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])
  Assert (@($rules | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Value -notin @($owner.Value,'S-1-5-18') }).Count -eq 0) 'Private directory grants another identity'
  $fileRules=(Get-Acl -LiteralPath $fixture).GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])
  Assert (@($fileRules | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Value -notin @($owner.Value,'S-1-5-18') }).Count -eq 0) 'Private file grants another identity'
  Record 'actual-private-acl' @{ directory=$directory; ownerOnlyWithSystem=$true; inheritedFilePrivate=$true }
  $publicFixture=Join-Path $directory 'synthetic-public-acl.txt'
  [IO.File]::WriteAllText($publicFixture,'synthetic only')
  $publicAcl=Get-Acl -LiteralPath $publicFixture
  $publicAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'Read','Allow'))
  Set-Acl -LiteralPath $publicFixture -AclObject $publicAcl
  $unsafe=@((Get-Acl -LiteralPath $publicFixture).GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]) | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Value -notin @($owner.Value,'S-1-5-18') })
  Assert ($unsafe.Count -gt 0) 'Unsafe synthetic ACL was not detectable'
  $publicAcl.RemoveAccessRuleAll([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'Read','Allow'))
  Set-Acl -LiteralPath $publicFixture -AclObject $publicAcl
  Record 'actual-acl-negative-fixture' @{ broadReadDetected=$true; fixtureContainedInPrivateDirectory=$true; broadReadRemoved=$true }

  Assert (-not $sentinel.HasExited) 'Sentinel did not survive independent job termination'
  $sentinel.StandardInput.WriteLine('exit'); Assert ($sentinel.WaitForExit(10000)) 'Owned sentinel failed to exit'
  Record 'unrelated-synthetic-sentinel' @{ pid=$sentinel.Id; survivedAllJobOperations=$true; stoppedOnlyByItsOwnInput=$true; code=$sentinel.ExitCode }
  $sentinel.Dispose(); $sentinel=$null
  @{ cases=$results.Count; directory=$directory; results=$results; policy=(Get-ExecutionPolicy).ToString(); applicationPorts=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -in @(8080,56379)}).Count } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'native-core-results.json') -Encoding UTF8
  [Console]::WriteLine((@{ summary='native-core'; passed=$results.Count; directory=$directory; policy=(Get-ExecutionPolicy).ToString(); blockedAdapterScriptWasNotExecuted=$true } | ConvertTo-Json -Compress))
} catch {
  [Console]::WriteLine((@{ result='failed'; message=$_.Exception.Message; completed=$results.Count; directory=$directory } | ConvertTo-Json -Compress))
  exit 1
} finally {
  foreach($owned in $jobs) { try { $owned.Stop() } finally { $owned.Dispose() } }
  if($null -ne $sentinel) { if(-not $sentinel.HasExited) { $sentinel.StandardInput.WriteLine('exit'); if(-not $sentinel.WaitForExit(10000)) { throw 'Owned sentinel cleanup remains unverified' } }; $sentinel.Dispose() }
  foreach($owned in $directProcesses) { if(-not $owned.HasExited){$owned.StandardInput.WriteLine('release'); if(-not $owned.WaitForExit(10000)){throw 'Owned mutex probe cleanup remains unverified'}}; $owned.Dispose() }
}
`;
const environment = {};
for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) {
  if (process.env[key]) environment[key] = process.env[key];
}
environment.PATH = `${dirname(process.execPath)};${join(environment.SystemRoot, 'System32')}`;
const prefix = `$root=${quote(root)}; $node=${quote(process.execPath)}; $harnessPid=${process.pid};\n`;
const child = spawn(join(environment.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
  ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', prefix + source], { env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.on('error', () => { console.error('Synthetic native validation could not start.'); process.exitCode = 1; });
child.on('close', (code) => { process.exitCode = code === 0 ? 0 : 1; });
