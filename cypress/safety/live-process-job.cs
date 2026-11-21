using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

// Used only by the opt-in Windows test launcher. A child is suspended until it
// belongs to our non-breakaway Job Object. Closing the job kills its descendants.
public sealed class LiveProcessJob : IDisposable {
    [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a,b,c,d,e,f; }
    [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT {
        public long ProcessTime, JobTime; public uint Flags; public UIntPtr Min, Max; public uint Count;
        public UIntPtr Affinity; public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMIT {
        public BASIC_LIMIT Basic; public IO_COUNTERS IO; public UIntPtr ProcessMemory, JobMemory, PeakProcess, PeakJob;
    }
    [StructLayout(LayoutKind.Sequential)] struct ACCOUNTING {
        public long a,b,c,d; public uint Faults, Total, Active, Terminated;
    }
    [StructLayout(LayoutKind.Sequential)] struct SECURITY { public int Length; public IntPtr Descriptor; [MarshalAs(UnmanagedType.Bool)] public bool Inherit; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUP {
        public int Size; public string Reserved, Desktop, Title; public uint X,Y,Width,Height,XChars,YChars,Fill,Flags;
        public ushort Show, ReservedSize; public IntPtr ReservedData, Input, Output, Error;
    }
    [StructLayout(LayoutKind.Sequential)] struct PROCESS { public IntPtr Handle, Thread; public uint Id, ThreadId; }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, ref EXTENDED_LIMIT info, uint size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job, uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint duration);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job, int kind, IntPtr data, uint length, out uint needed);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateFile(string path, uint access, uint share, ref SECURITY security, uint creation, uint flags, IntPtr template);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string application, StringBuilder command, IntPtr processSecurity,
        IntPtr threadSecurity, bool inherit, uint flags, IntPtr environment, string directory, ref STARTUP startup, out PROCESS process);
    IntPtr job, process;
    public uint Id { get; private set; }
    static void Require(bool value) { if (!value) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    void RequireOpen() {
        if (job == IntPtr.Zero || process == IntPtr.Zero) throw new ObjectDisposedException("LiveProcessJob");
    }
    static string Quote(string value) {
        if (value.IndexOf('\0') >= 0) throw new ArgumentException("Invalid argument");
        var output = new StringBuilder("\""); int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { output.Append('\\', slashes * 2 + 1); output.Append(c); slashes = 0; continue; }
            output.Append('\\', slashes); slashes = 0; output.Append(c);
        }
        output.Append('\\', slashes * 2); output.Append('"'); return output.ToString();
    }
    public LiveProcessJob(string executable, string[] args, string directory, Dictionary<string,string> environment, string log) {
        IntPtr output = IntPtr.Zero, input = IntPtr.Zero, block = IntPtr.Zero; PROCESS child = new PROCESS();
        try {
            job = CreateJobObject(IntPtr.Zero, null); Require(job != IntPtr.Zero);
            var limit = new EXTENDED_LIMIT(); limit.Basic.Flags = 0x2000; // KILL_ON_JOB_CLOSE; no breakaway.
            Require(SetInformationJobObject(job, 9, ref limit, (uint)Marshal.SizeOf(limit)));
            var security = new SECURITY { Length = Marshal.SizeOf(typeof(SECURITY)), Inherit = true };
            output = CreateFile(log, 0x40000000, 1, ref security, 2, 0x80, IntPtr.Zero); Require(output != new IntPtr(-1));
            input = CreateFile("NUL", 0x80000000, 1, ref security, 3, 0x80, IntPtr.Zero); Require(input != new IntPtr(-1));
            var start = new STARTUP { Size = Marshal.SizeOf(typeof(STARTUP)), Flags = 0x100, Input = input, Output = output, Error = output };
            string text = String.Join("\0", environment.OrderBy(pair => pair.Key, StringComparer.OrdinalIgnoreCase).Select(pair => {
                if (pair.Key.IndexOfAny(new char[] {'=', '\0'}) >= 0 || pair.Value.IndexOf('\0') >= 0) throw new ArgumentException("Invalid environment");
                return pair.Key + "=" + pair.Value;
            }).ToArray()) + "\0\0";
            block = Marshal.StringToHGlobalUni(text);
            var command = new StringBuilder(String.Join(" ", new string[] { executable }.Concat(args).Select(Quote).ToArray()));
            // CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW.
            Require(CreateProcess(executable, command, IntPtr.Zero, IntPtr.Zero, true, 0x08000404, block, directory, ref start, out child));
            process = child.Handle; Id = child.Id;
            Require(AssignProcessToJobObject(job, process));
            Require(ResumeThread(child.Thread) != UInt32.MaxValue);
        } catch {
            // This handle can only refer to the child created above, never a PID lookup.
            if (child.Handle != IntPtr.Zero) { TerminateProcess(child.Handle, 1); WaitForSingleObject(child.Handle, 5000); }
            Dispose(); throw;
        } finally {
            if (child.Thread != IntPtr.Zero) CloseHandle(child.Thread);
            if (output != IntPtr.Zero && output != new IntPtr(-1)) CloseHandle(output);
            if (input != IntPtr.Zero && input != new IntPtr(-1)) CloseHandle(input);
            if (block != IntPtr.Zero) Marshal.FreeHGlobal(block);
        }
    }
    public bool Exited { get { RequireOpen(); return WaitForSingleObject(process, 0) == 0; } }
    public uint ExitCode { get { RequireOpen(); uint code; Require(GetExitCodeProcess(process, out code)); return code; } }
    public long[] Pids() {
        RequireOpen();
        IntPtr buffer = Marshal.AllocHGlobal(262144);
        try {
            uint needed; Require(QueryInformationJobObject(job, 3, buffer, 262144, out needed));
            int count = Marshal.ReadInt32(buffer, 4); if (count < 0 || count > 16000) throw new InvalidOperationException("Ambiguous job membership");
            var pids = new long[count];
            for (int i = 0; i < count; i++) pids[i] = IntPtr.Size == 8 ? Marshal.ReadInt64(buffer, 8 + i * 8) : Marshal.ReadInt32(buffer, 8 + i * 4);
            return pids;
        } finally { Marshal.FreeHGlobal(buffer); }
    }
    public void Stop() {
        RequireOpen();
        Require(TerminateJobObject(job, 1));
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (Pids().Length != 0 || !Exited) {
            if (DateTime.UtcNow >= deadline) throw new InvalidOperationException("Owned job did not stop");
            System.Threading.Thread.Sleep(50);
        }
    }
    public void Dispose() {
        if (job != IntPtr.Zero) { CloseHandle(job); job = IntPtr.Zero; }
        if (process != IntPtr.Zero) { CloseHandle(process); process = IntPtr.Zero; }
    }
}
