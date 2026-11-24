// Test-only terminal stream shim for Windows automation with redirected pipes.
Object.defineProperty(process.stdin, 'isTTY', { value: true });
Object.defineProperty(process.stdout, 'isTTY', { value: true });
process.stdin.setRawMode = function (raw) {
  this.isRaw = raw;
  return this;
};
