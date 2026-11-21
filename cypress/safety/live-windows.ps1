param([ValidateSet('inspect', 'secure', 'check-private', 'lock', 'run')][string]$Action, [string]$Value)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
function Emit($Data) { [Console]::WriteLine(($Data | ConvertTo-Json -Compress -Depth 8)) }
function Check-Private([string]$Path) {
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $acl = Get-Acl -LiteralPath $Path
  foreach ($rule in $acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])) {
    if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @($sid, 'S-1-5-18', 'S-1-5-32-544')) { throw 'Private ACL required' }
  }
  $owner = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
  if ($owner -notin @($sid, 'S-1-5-18', 'S-1-5-32-544')) { throw 'Private owner required' }
}
try {
  # The runner's exception belongs only to this dedicated helper process.
  $policies = @(Microsoft.PowerShell.Security\Get-ExecutionPolicy -List)
  if ($policies.Count -ne 5 -or
    @($policies | Where-Object { $_.Scope -in @('MachinePolicy', 'UserPolicy') -and $_.ExecutionPolicy -ne 'Undefined' }).Count -ne 0 -or
    @($policies | Where-Object { $_.Scope -in @('CurrentUser', 'LocalMachine') -and $_.ExecutionPolicy -notin @('Undefined', 'Restricted', 'RemoteSigned') }).Count -ne 0 -or
    (Microsoft.PowerShell.Security\Get-ExecutionPolicy -Scope Process) -ne 'RemoteSigned' -or
    (Microsoft.PowerShell.Security\Get-ExecutionPolicy) -ne 'RemoteSigned') { throw 'Unexpected helper execution policy' }
  if ($Action -eq 'check-private') { Check-Private $Value; Emit @{ ok = $true }; exit 0 }
  if ($Action -eq 'inspect') {
    $processes = @(Get-CimInstance Win32_Process | ForEach-Object {
      @{ pid = [int]$_.ProcessId; parent = [int]$_.ParentProcessId; name = $_.Name; command = $_.CommandLine;
         executable = $_.ExecutablePath; created = if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { $null } }
    })
    $listeners = @(Get-NetTCPConnection -State Listen | ForEach-Object {
      @{ port = [int]$_.LocalPort; address = $_.LocalAddress; pid = [int]$_.OwningProcess }
    })
    $connections = @(Get-NetTCPConnection | Where-Object { $_.State -in @('Established', 'SynSent') } | ForEach-Object {
      @{ pid = [int]$_.OwningProcess; remote = $_.RemoteAddress }
    })
    Emit @{ processes = $processes; listeners = $listeners; connections = $connections }; exit 0
  }
  if ($Action -eq 'secure') {
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $userProfileRecord = Get-CimInstance Win32_UserProfile | Where-Object { $_.SID -eq $sid.Value }
    if (@($userProfileRecord).Count -ne 1) { throw 'Local profile unavailable' }
    $base = [System.IO.Path]::Combine($userProfileRecord.LocalPath, 'AppData', 'Local', 'CardsSqlLiveE2E')
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true, $false)
    foreach ($identity in @($sid, [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
      $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    }
    [void][System.IO.Directory]::CreateDirectory($base, $acl); Check-Private $base
    $directory = [System.IO.Path]::Combine($base, [Guid]::NewGuid().ToString('N'))
    [void][System.IO.Directory]::CreateDirectory($directory, $acl)
    Emit @{ directory = $directory; base = $base }; exit 0
  }
  if ($Action -eq 'lock') {
    $mutex = [System.Threading.Mutex]::new($false, 'Global\CardsSqlAppLiveE2ESerialV1')
    $held = $false
    try {
      # Abandoned/access-denied mutexes fail closed; no automatic takeover.
      $held = $mutex.WaitOne(0)
      if (-not $held) { throw 'Another serial live runner owns the lock' }
      Emit @{ event = 'started'; pid = $PID }
      if ([Console]::ReadLine() -ne 'release') { throw 'Lock owner disappeared' }
      Emit @{ event = 'released' }
    } finally { if ($held) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
    exit 0
  }
  if ($Action -eq 'run') {
    Check-Private $Value
    $config = Get-Content -LiteralPath $Value -Raw | ConvertFrom-Json
    Add-Type -TypeDefinition ([System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'live-process-job.cs')))
    $environment = [System.Collections.Generic.Dictionary[string,string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($property in $config.environment.PSObject.Properties) { $environment.Add($property.Name, [string]$property.Value) }
    $job = [LiveProcessJob]::new($config.executable, [string[]]$config.arguments, $config.directory, $environment, $config.log)
    try {
      Emit @{ event = 'started'; pid = [long]$job.Id }
      $line = [Console]::In.ReadLineAsync()
      while (-not $job.Exited) {
        if ($line.IsCompleted) {
          $message = $line.Result
          if ($null -eq $message -or $message -eq 'stop') { $job.Stop(); break }
          if ($message -ne 'status') { throw 'Invalid process control command' }
          Emit @{ event = 'state'; pids = @($job.Pids()) }
          $line = [Console]::In.ReadLineAsync()
        }
        [System.Threading.Thread]::Sleep(50)
      }
      $code = [long]$job.ExitCode
      $job.Stop()
      Emit @{ event = 'exited'; code = $code; empty = $true }
    } finally { $job.Dispose() }
    exit 0
  }
  throw 'Unknown action'
} catch {
  # Never serialize native exceptions, child arguments, environments or config.
  Emit @{ event = 'error'; category = 'windows-process-safety' }
  exit 1
}
