import { StringDecoder } from 'node:string_decoder';

export class BootstrapError extends Error {}

export async function readPassword(input = process.stdin, output = process.stdout) {
  const [password, repeat] = await readHiddenFields([
    'Admin password (hidden, 12-256 characters): ',
    'Repeat password (hidden): ',
  ], input, output);
  if (password.length < 12 || password.length > 256 || password !== repeat) {
    throw new BootstrapError('Passwords differ or do not meet length requirements.');
  }
  return password;
}

export function readHiddenFields(labels, input = process.stdin, output = process.stdout) {
  return new Promise((resolve, reject) => {
    const previousRaw = input.isRaw ?? false;
    const wasPaused = input.isPaused();
    const decoder = new StringDecoder('utf8');
    const values = labels.map(() => []);
    let field = 0;
    let skipLineFeed = false;
    let escape = '';

    function finish(error) {
      input.off('data', onData);
      input.off('error', onError);
      input.off('end', onEnd);
      try {
        input.setRawMode(previousRaw);
      } catch (restoreError) {
        error ??= restoreError;
      } finally {
        if (wasPaused) input.pause();
      }
      if (error) reject(error);
      else resolve(values.map(value => value.join('')));
    }

    function onError(error) {
      finish(error);
    }

    function onEnd() {
      finish(new BootstrapError('Hidden input ended before all fields were entered.'));
    }

    function onData(chunk) {
      const data = typeof chunk === 'string' ? chunk : decoder.write(chunk);
      if (data.includes('\x03')) {
        output.write('\n');
        finish(new BootstrapError('Cancelled.'));
        return;
      }

      for (const character of data) {
        const ignoreLineFeed = skipLineFeed && character === '\n';
        skipLineFeed = false;
        if (ignoreLineFeed) continue;

        // Ignore terminal key sequences, including bracketed paste markers.
        if (character === '\x1b') {
          escape = character;
          continue;
        }
        if (escape === '\x1b' && (character === '[' || character === 'O')) {
          escape = character;
          continue;
        }
        if (escape && escape !== '\x1b' && character >= ' ' && character <= '~') {
          if (character >= '@') escape = '';
          continue;
        }
        escape = '';

        const value = values[field];
        if (character === '\r' || character === '\n') {
          output.write('\n');
          field += 1;
          if (field < labels.length) {
            skipLineFeed = character === '\r';
            output.write(labels[field]);
            continue;
          }
          finish();
          return;
        }

        if (character === '\x7f' || character === '\b') {
          value.pop();
        } else if (!/\p{Cc}/u.test(character)) {
          value.push(character);
        }
      }
    }

    output.write(labels[0]);
    input.setRawMode(true);
    input.on('data', onData);
    input.once('error', onError);
    input.once('end', onEnd);
    input.resume();
  });
}
