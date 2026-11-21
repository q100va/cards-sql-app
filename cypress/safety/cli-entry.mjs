import { posix, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function isDirectExecution(moduleUrl, entryPath, { windows = process.platform === 'win32', cwd = process.cwd() } = {}) {
  if (!entryPath) return false;
  const url = new URL(moduleUrl);
  if (url.protocol !== 'file:' || url.search || url.hash) return false;
  const filename = (windows ? win32 : posix).resolve(cwd, entryPath);
  const entryFilename = fileURLToPath(pathToFileURL(filename, { windows }), { windows });
  const moduleFilename = fileURLToPath(url, { windows });
  return windows ? entryFilename.toLowerCase() === moduleFilename.toLowerCase() : entryFilename === moduleFilename;
}
